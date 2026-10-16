-- ============================================================================
-- MOTIQ — MIGRATION 0012 : accueillir les documents et leur texte lu
--
-- Deux ajouts, tous deux imposes par la nouvelle entree de pieces jointes :
--
-- 1. Un type « document » pour la table assets. Sans lui, un PDF depose
--    n'aurait aucune case ou se ranger, et la base refuserait la ligne.
--
-- 2. Une colonne `texte_extrait` : le contenu LISIBLE du fichier. C'est elle
--    qui permet a l'IA de comprendre une demande appuyee sur un document.
--    Sans elle, un PDF reste un nom de fichier et une taille en octets.
--
-- La contrainte de type existante est retiree par son NOM REEL, cherche dans
-- le catalogue, plutot que par un nom suppose : la migration 0001 a pu la
-- nommer autrement, et un « drop constraint » sur un nom faux echoue en
-- silence en laissant l'ancienne regle en place.
-- ============================================================================

do $$
declare
  contrainte text;
begin
  select conname into contrainte
    from pg_constraint
   where conrelid = 'public.assets'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) like '%type%'
   limit 1;

  if contrainte is not null then
    execute format('alter table public.assets drop constraint %I', contrainte);
  end if;
end $$;

alter table public.assets
  add constraint assets_type_check
  check (type in ('image', 'audio', 'video', 'logo', 'document'));

alter table public.assets
  add column if not exists texte_extrait text;

comment on column public.assets.texte_extrait is
  'Contenu lisible de la piece jointe (PDF, Word, Excel, texte). Nul quand le fichier ne contient pas de texte exploitable : image, son, video.';

-- On garde le droit d'ecrire ses propres lignes : les politiques de la
-- migration 0001 filtrent deja par utilisateur.
