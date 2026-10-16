-- ============================================================================
-- MOTIQ — MIGRATION 0013 : avis, note par etoiles, moderation et statistiques
--
-- Trois besoins, un seul socle :
--   1. recueillir l'avis des utilisateurs (note 1 a 5 + commentaire) ;
--   2. les afficher, avec moderation des contenus abusifs ;
--   3. compter des choses REELLES (utilisateurs, projets, avis, note moyenne).
--
-- PRINCIPE NON NEGOCIABLE : aucun chiffre invente.
-- La fonction de statistiques lit la base. Quand elle ne trouve rien, elle
-- rend 0 ou null — jamais une valeur « qui fait bien » sur une page d'accueil.
-- Une page qui annonce 12 000 utilisateurs quand il y en a 2 detruit la
-- confiance le jour ou quelqu'un verifie.
-- ============================================================================

-- ============================================================================
-- 1. QUI PEUT MODERER
--
-- Un booleen sur le profil, pas une liste d'adresses en dur dans le code : le
-- moderateur se designe en base, et changer d'avis ne demande pas de redeployer.
-- Par defaut FAUX : personne n'est moderateur sans decision explicite.
-- ============================================================================
alter table public.profiles
  add column if not exists est_moderateur boolean not null default false;

comment on column public.profiles.est_moderateur is
  'Peut masquer un avis abusif. Faux par defaut : on ne devient pas moderateur par accident.';

-- ============================================================================
-- 2. LES AVIS
-- ============================================================================
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  note         smallint not null check (note between 1 and 5),
  commentaire  text not null check (char_length(commentaire) between 10 and 2000),
  statut       text not null default 'publie'
               check (statut in ('en_attente', 'publie', 'masque')),
  motif_masquage text,
  cree_le      timestamptz not null default now(),
  maj_le       timestamptz not null default now(),

  -- UN SEUL AVIS PAR PERSONNE. C'est a la fois la premiere protection
  -- anti-spam et une regle de bon sens : sans elle, un utilisateur mecontent
  -- pourrait publier cinquante avis a une etoile et faire tomber la moyenne.
  -- La contrainte est en base : elle tient meme si le code l'oublie.
  unique (user_id)
);

comment on table public.reviews is
  'Avis des utilisateurs : note de 1 a 5 et commentaire. Un avis par personne, modifiable.';

comment on column public.reviews.commentaire is
  'Entre 10 et 2000 caracteres. Le minimum ecarte les « ok » et les tests de robot.';

create index if not exists reviews_publies on public.reviews (cree_le desc)
  where statut = 'publie';

-- ============================================================================
-- 3. PROTECTION DES AVIS (RLS)
--
-- Aucune table de Motiq n'est lisible sans politique. Celle-ci a deux visages :
--   - un VISITEUR non connecte lit les avis PUBLIES : c'est ce qui permet de
--     les afficher sur la page d'accueil publique ;
--   - un utilisateur connecte lit en plus les SIENS, meme masques : sinon il
--     ne comprendrait pas pourquoi son avis a disparu.
-- ============================================================================
alter table public.reviews enable row level security;

drop policy if exists "avis: lecture des publies" on public.reviews;
create policy "avis: lecture des publies"
  on public.reviews for select
  to anon, authenticated
  using (statut = 'publie');

drop policy if exists "avis: lire les siens" on public.reviews;
create policy "avis: lire les siens"
  on public.reviews for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "avis: ecrire le sien" on public.reviews;
create policy "avis: ecrire le sien"
  on public.reviews for insert
  to authenticated
  with check (auth.uid() = user_id and statut = 'publie');

drop policy if exists "avis: modifier le sien" on public.reviews;
create policy "avis: modifier le sien"
  on public.reviews for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and statut = 'publie');

drop policy if exists "avis: supprimer le sien" on public.reviews;
create policy "avis: supprimer le sien"
  on public.reviews for delete
  to authenticated
  using (auth.uid() = user_id);

-- Un moderateur peut masquer n'importe quel avis.
drop policy if exists "avis: moderer" on public.reviews;
create policy "avis: moderer"
  on public.reviews for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.est_moderateur
    )
  );

-- NOTE IMPORTANTE SUR CES POLITIQUES : elles imposent que l'auteur d'un avis
-- soit bien celui qui est connecte, et qu'un avis cree parte en « publie » et
-- non « masque » (on ne s'auto-masque pas). En revanche, l'ecriture directe
-- pourrait contourner le contrôle de longueur : la contrainte CHECK s'en
-- charge, et c'est elle qui fait foi.

-- ============================================================================
-- 4. LES STATISTIQUES PUBLIQUES
--
-- SECURITY DEFINER : la fonction lit des tables que le visiteur n'a pas le
-- droit de parcourir (profiles, projects), et ne rend QUE des agrégats.
-- Aucune donnee personnelle ne sort : un nombre, une moyenne, rien d'autre.
--
-- Chaque valeur est calculee. Aucune n'est inventee, aucune n'est gonflee.
-- ============================================================================
create or replace function public.statistiques_publiques()
returns json
language sql
security definer
stable
set search_path = public
as $$
  select json_build_object(
    'utilisateurs',        (select count(*) from public.profiles),
    'projets',             (select count(*) from public.projects),
    'avis',                (select count(*) from public.reviews where statut = 'publie'),
    'note_moyenne',        (select round(avg(note)::numeric, 1)
                              from public.reviews where statut = 'publie'),
    -- « Client satisfait » = quelqu'un qui a laisse un avis de 4 etoiles ou
    -- plus. La definition est ecrite ici, pas devinee : elle est verifiable.
    'clients_satisfaits',  (select count(*) from public.reviews
                              where statut = 'publie' and note >= 4)
  );
$$;

comment on function public.statistiques_publiques() is
  'Compteurs REELLEMENT lus dans la base, pour la page publique. Rend 0 ou null quand il n y a rien — jamais une valeur inventee.';

revoke all on function public.statistiques_publiques() from public;
grant execute on function public.statistiques_publiques() to anon, authenticated;
