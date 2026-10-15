-- ============================================================================
-- MOTIQ — SCHEMA INITIAL
-- Cahier des charges, chapitre 10.3 : les 8 tables du modele de donnees.
--
-- REGLE ABSOLUE : la securite au niveau ligne (RLS) est activee sur CHAQUE
-- table, et chaque table n'est lisible/inscriptible que par son proprietaire.
-- Sans politique, RLS bloque tout : c'est voulu (deni par defaut).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. profiles — id, email, nom, plan, quota restant
-- ============================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  nom           text not null default '',
  plan          text not null default 'gratuit'
                check (plan in ('gratuit', 'pro', 'business')),
  quota_restant integer not null default 3 check (quota_restant >= 0),
  cree_le       timestamptz not null default now(),
  maj_le        timestamptz not null default now()
);

comment on table public.profiles is 'Profil applicatif d''un utilisateur Motiq.';

-- ============================================================================
-- 2. brand_kits — logo, 2 a 3 couleurs, police
-- ============================================================================
create table if not exists public.brand_kits (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references public.profiles(id) on delete cascade,
  logo     text,
  couleurs text[] not null default '{}',
  police   text not null default 'Inter',
  cree_le  timestamptz not null default now(),
  maj_le   timestamptz not null default now(),
  constraint brand_kits_couleurs_nombre check (array_length(couleurs, 1) is null
                                               or array_length(couleurs, 1) between 2 and 3)
);

comment on table public.brand_kits is 'Kit de marque : logo, couleurs, police.';

-- ============================================================================
-- 3. templates — catalogue de styles (lecture par tous, ecriture par personne)
-- ============================================================================
create table if not exists public.templates (
  id         text primary key,
  nom        text not null,
  categorie  text not null,
  format     text not null default '9:16' check (format in ('9:16', '1:1', '16:9')),
  apercu     text not null default '',
  parametres jsonb not null default '{}'::jsonb,
  actif      boolean not null default true,
  cree_le    timestamptz not null default now()
);

comment on table public.templates is 'Catalogue des templates motion design (au moins 8).';

-- ============================================================================
-- 4. projects — le coeur : idee, script, template, statut
-- ============================================================================
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  titre         text not null default 'Nouveau projet',
  statut        text not null default 'brouillon'
                check (statut in ('brouillon', 'script_valide', 'en_generation', 'pret', 'echec')),
  entree_source text not null default 'texte'
                check (entree_source in ('texte', 'images', 'voix', 'video')),
  idee          text,
  script        jsonb,
  template_id   text references public.templates(id) on delete set null,
  cree_le       timestamptz not null default now(),
  maj_le        timestamptz not null default now()
);

comment on table public.projects is 'Projet de video : entree, script, template, statut.';

-- ============================================================================
-- 5. assets — medias rattaches a un projet
-- ============================================================================
create table if not exists public.assets (
  id            uuid primary key default gen_random_uuid(),
  projet_id     uuid not null references public.projects(id) on delete cascade,
  type          text not null check (type in ('image', 'audio', 'video', 'logo')),
  chemin        text not null,
  taille_octets bigint,
  cree_le       timestamptz not null default now()
);

comment on table public.assets is 'Images, audio, video et logos rattaches a un projet.';

-- ============================================================================
-- 6. render_jobs — suivi des rendus
-- ============================================================================
create table if not exists public.render_jobs (
  id          uuid primary key default gen_random_uuid(),
  projet_id   uuid not null references public.projects(id) on delete cascade,
  statut      text not null default 'en_attente'
              check (statut in ('en_attente', 'en_cours', 'termine', 'echec')),
  progression integer not null default 0 check (progression between 0 and 100),
  url_mp4     text,
  erreur      text,
  cree_le     timestamptz not null default now(),
  maj_le      timestamptz not null default now()
);

comment on table public.render_jobs is 'Jobs de rendu video et leur progression.';

-- ============================================================================
-- 7. subscriptions — abonnements Stripe
-- ============================================================================
create table if not exists public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  plan          text not null default 'gratuit'
                check (plan in ('gratuit', 'pro', 'business')),
  statut_stripe text,
  periode_debut timestamptz not null default now(),
  periode_fin   timestamptz,
  cree_le       timestamptz not null default now()
);

comment on table public.subscriptions is 'Abonnements, relies a Stripe a la phase 5.';

-- ============================================================================
-- 8. usage — consommation mensuelle
-- ============================================================================
create table if not exists public.usage (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  mois             text not null check (mois ~ '^[0-9]{4}-[0-9]{2}$'),
  nombre_rendus    integer not null default 0 check (nombre_rendus >= 0),
  minutes_generees numeric(10, 2) not null default 0 check (minutes_generees >= 0),
  cree_le          timestamptz not null default now(),
  unique (user_id, mois)
);

comment on table public.usage is 'Compteur mensuel : rendus et minutes generees.';

-- ============================================================================
-- INDEX sur les cles etrangeres et les colonnes filtrees
-- ============================================================================
create index if not exists idx_brand_kits_user        on public.brand_kits(user_id);
create index if not exists idx_projects_user          on public.projects(user_id);
create index if not exists idx_projects_statut        on public.projects(statut);
create index if not exists idx_projects_maj           on public.projects(maj_le desc);
create index if not exists idx_assets_projet          on public.assets(projet_id);
create index if not exists idx_render_jobs_projet     on public.render_jobs(projet_id);
create index if not exists idx_render_jobs_statut     on public.render_jobs(statut);
create index if not exists idx_subscriptions_user     on public.subscriptions(user_id);
create index if not exists idx_usage_user_mois        on public.usage(user_id, mois);

-- ============================================================================
-- DECLENCHEURS
-- ============================================================================

-- 1) maj_le mis a jour automatiquement a chaque modification
create or replace function public.toucher_maj_le()
returns trigger
language plpgsql
as $$
begin
  new.maj_le = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_maj on public.profiles;
create trigger trg_profiles_maj before update on public.profiles
  for each row execute function public.toucher_maj_le();

drop trigger if exists trg_brand_kits_maj on public.brand_kits;
create trigger trg_brand_kits_maj before update on public.brand_kits
  for each row execute function public.toucher_maj_le();

drop trigger if exists trg_projects_maj on public.projects;
create trigger trg_projects_maj before update on public.projects
  for each row execute function public.toucher_maj_le();

drop trigger if exists trg_render_jobs_maj on public.render_jobs;
create trigger trg_render_jobs_maj before update on public.render_jobs
  for each row execute function public.toucher_maj_le();

-- 2) Un profil est cree automatiquement a l'inscription
create or replace function public.creer_profil_nouvel_utilisateur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nom)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'nom', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_nouvel_utilisateur on auth.users;
create trigger trg_nouvel_utilisateur after insert on auth.users
  for each row execute function public.creer_profil_nouvel_utilisateur();

-- ============================================================================
-- SECURITE AU NIVEAU LIGNE — activee sur les 8 tables, sans exception
-- ============================================================================
alter table public.profiles      enable row level security;
alter table public.brand_kits    enable row level security;
alter table public.templates     enable row level security;
alter table public.projects      enable row level security;
alter table public.assets        enable row level security;
alter table public.render_jobs   enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage         enable row level security;

-- ---------------------------------------------------------------- profiles
drop policy if exists profiles_select_sien on public.profiles;
create policy profiles_select_sien on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists profiles_update_sien on public.profiles;
create policy profiles_update_sien on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------- brand_kits
drop policy if exists brand_kits_select_sien on public.brand_kits;
create policy brand_kits_select_sien on public.brand_kits
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists brand_kits_insert_sien on public.brand_kits;
create policy brand_kits_insert_sien on public.brand_kits
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists brand_kits_update_sien on public.brand_kits;
create policy brand_kits_update_sien on public.brand_kits
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists brand_kits_delete_sien on public.brand_kits;
create policy brand_kits_delete_sien on public.brand_kits
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- templates
-- Catalogue public : tout utilisateur connecte peut lire, personne ne modifie.
drop policy if exists templates_lecture_tous on public.templates;
create policy templates_lecture_tous on public.templates
  for select to authenticated using (actif = true);

-- ---------------------------------------------------------------- projects
drop policy if exists projects_select_sien on public.projects;
create policy projects_select_sien on public.projects
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists projects_insert_sien on public.projects;
create policy projects_insert_sien on public.projects
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists projects_update_sien on public.projects;
create policy projects_update_sien on public.projects
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists projects_delete_sien on public.projects;
create policy projects_delete_sien on public.projects
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- assets
-- L'acces passe par le projet : seul le proprietaire du projet voit ses medias.
drop policy if exists assets_select_sien on public.assets;
create policy assets_select_sien on public.assets
  for select to authenticated using (
    exists (select 1 from public.projects p
            where p.id = assets.projet_id and p.user_id = (select auth.uid()))
  );

drop policy if exists assets_insert_sien on public.assets;
create policy assets_insert_sien on public.assets
  for insert to authenticated with check (
    exists (select 1 from public.projects p
            where p.id = assets.projet_id and p.user_id = (select auth.uid()))
  );

drop policy if exists assets_delete_sien on public.assets;
create policy assets_delete_sien on public.assets
  for delete to authenticated using (
    exists (select 1 from public.projects p
            where p.id = assets.projet_id and p.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------- render_jobs
drop policy if exists render_jobs_select_sien on public.render_jobs;
create policy render_jobs_select_sien on public.render_jobs
  for select to authenticated using (
    exists (select 1 from public.projects p
            where p.id = render_jobs.projet_id and p.user_id = (select auth.uid()))
  );

drop policy if exists render_jobs_insert_sien on public.render_jobs;
create policy render_jobs_insert_sien on public.render_jobs
  for insert to authenticated with check (
    exists (select 1 from public.projects p
            where p.id = render_jobs.projet_id and p.user_id = (select auth.uid()))
  );

-- Note : la mise a jour de la progression est faite par le worker de rendu,
-- qui utilise la cle secrete (elle contourne RLS). Aucune politique de mise a
-- jour n'est donc ouverte aux utilisateurs.

-- ---------------------------------------------------------------- subscriptions
drop policy if exists subscriptions_select_sien on public.subscriptions;
create policy subscriptions_select_sien on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

-- Note : l'ecriture est reservee au webhook Stripe (cle secrete, RLS contournee).

-- ---------------------------------------------------------------- usage
drop policy if exists usage_select_sien on public.usage;
create policy usage_select_sien on public.usage
  for select to authenticated using ((select auth.uid()) = user_id);

-- ============================================================================
-- STOCKAGE — bucket prive pour les medias
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('medias', 'medias', false)
on conflict (id) do nothing;

-- Chaque utilisateur ne voit et ne modifie que le dossier portant son identifiant :
-- chemin attendu : <user_id>/<nom_de_fichier>
drop policy if exists medias_lecture_sien on storage.objects;
create policy medias_lecture_sien on storage.objects
  for select to authenticated using (
    bucket_id = 'medias' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists medias_depot_sien on storage.objects;
create policy medias_depot_sien on storage.objects
  for insert to authenticated with check (
    bucket_id = 'medias' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists medias_suppression_sien on storage.objects;
create policy medias_suppression_sien on storage.objects
  for delete to authenticated using (
    bucket_id = 'medias' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ============================================================================
-- CATALOGUE INITIAL — 8 templates (le cahier des charges en exige au moins 8)
-- ============================================================================
insert into public.templates (id, nom, categorie, format, apercu, parametres) values
  ('punch',     'Punch',     'dynamique',  '9:16', 'Texte qui frappe, transitions seches',
   '{"rythme": "rapide", "transition": "coupe"}'::jsonb),
  ('slide',     'Slide',     'sobre',      '9:16', 'Glissements lateraux, ton professionnel',
   '{"rythme": "moyen", "transition": "glissement"}'::jsonb),
  ('pulse',     'Pulse',     'energique',  '9:16', 'Zoom pulsant sur les mots cles',
   '{"rythme": "rapide", "transition": "zoom"}'::jsonb),
  ('clair',     'Clair',     'minimal',    '9:16', 'Fond clair, typographie large',
   '{"rythme": "lent", "transition": "fondu"}'::jsonb),
  ('audace',    'Audace',    'impact',     '9:16', 'Contrastes forts, gros titres',
   '{"rythme": "rapide", "transition": "coupe"}'::jsonb),
  ('narration', 'Narration', 'editorial',  '9:16', 'Rythme pose, adapte aux recits',
   '{"rythme": "lent", "transition": "fondu"}'::jsonb),
  ('affiche',   'Affiche',   'editorial',  '9:16', 'Composition type affiche',
   '{"rythme": "moyen", "transition": "glissement"}'::jsonb),
  ('energie',   'Energie',   'dynamique',  '9:16', 'Battement marque, ideal sport',
   '{"rythme": "rapide", "transition": "zoom"}'::jsonb)
on conflict (id) do nothing;
