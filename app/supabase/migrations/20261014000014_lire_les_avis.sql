-- ============================================================================
-- MOTIQ — MIGRATION 0014 : lire les avis publies AVEC leur auteur
--
-- LE PROBLEME
-- Les avis vivent dans `reviews`, les noms dans `profiles`. Or RLS interdit a
-- un visiteur de parcourir les profils des autres — et c'est tres bien ainsi :
-- sans cela, n'importe qui pourrait lire les noms et les emails des inscrits.
--
-- Joindre les deux tables depuis le code est donc IMPOSSIBLE pour un visiteur.
-- Il faut une fonction serveur qui traverse RLS de facon controlee.
--
-- CE QUE LA FONCTION EXPOSE, ET RIEN D'AUTRE
--   - la note, le commentaire, la date ;
--   - un nom ABREGE : le prenom, et l'initiale du nom s'il y en a un.
--   - jamais l'email, jamais l'identifiant, jamais le nom complet.
--
-- Afficher « Awa D. » suffit a humaniser un avis. Afficher « Awa Diallo
-- (awa.diallo@exemple.com) » exposerait des gens qui n'ont rien demande.
-- ============================================================================

create or replace function public.avis_publies(p_limite int default 50)
returns table (
  id          uuid,
  note        smallint,
  commentaire text,
  auteur      text,
  cree_le     timestamptz,
  est_a_moi   boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    r.id,
    r.note,
    r.commentaire,
    case
      when coalesce(trim(p.nom), '') = '' then 'Utilisateur Motiq'
      when position(' ' in trim(p.nom)) > 0
        then split_part(trim(p.nom), ' ', 1) || ' ' || left(split_part(trim(p.nom), ' ', 2), 1) || '.'
      else trim(p.nom)
    end as auteur,
    r.cree_le,
    (r.user_id = auth.uid()) as est_a_moi
  from public.reviews r
  join public.profiles p on p.id = r.user_id
  where r.statut = 'publie'
  order by r.cree_le desc
  -- Borne haute : meme si l'appelant demande 100 000, on n'en rend que 200.
  -- Une fonction publique ne doit pas pouvoir etre transformee en outil
  -- d'extraction massive.
  limit greatest(1, least(coalesce(p_limite, 50), 200));
$$;

comment on function public.avis_publies(int) is
  'Avis publies, avec un nom abrege. Expose le prenom et l''initiale, jamais l''email ni l''identifiant.';

revoke all on function public.avis_publies(int) from public;
grant execute on function public.avis_publies(int) to anon, authenticated;

-- ============================================================================
-- Mon propre avis, meme masque.
--
-- Sans cela, un utilisateur dont l'avis a ete masque ne le verrait plus du tout
-- et croirait a une perte de donnees. Il doit pouvoir le lire, le corriger et
-- le republier.
-- ============================================================================
create or replace function public.mon_avis()
returns table (
  id          uuid,
  note        smallint,
  commentaire text,
  statut      text,
  motif_masquage text,
  cree_le     timestamptz,
  maj_le      timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select r.id, r.note, r.commentaire, r.statut, r.motif_masquage, r.cree_le, r.maj_le
  from public.reviews r
  where r.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.mon_avis() from public;
grant execute on function public.mon_avis() to authenticated;
