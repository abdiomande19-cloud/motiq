-- ============================================================================
-- MOTIQ — MIGRATION 0004 : l'apparence d'un projet
--
-- Le cahier des charges prevoit un editeur simple : textes, ordre des scenes,
-- COULEURS, POLICE, MUSIQUE. Or le modele du chapitre 10.3 ne prevoit que
-- script et template. Cette migration ajoute ce qui manque.
--
-- POURQUOI UNE COLONNE PLUTOT QUE REUTILISER LE SCRIPT
-- Le script decrit ce qui est DIT. L'apparence decrit COMMENT c'est montre.
-- Les melanger rendrait impossible le changement de script sans perdre les
-- reglages visuels.
--
-- POURQUOI jsonb ET PAS DES COLONNES
-- Ces reglages evoluent avec les templates. Une colonne figee par reglage
-- obligerait une migration a chaque nouveau template.
--
-- COMME PARTOUT DANS CE PROJET : les regles sont dans la BASE. Un tableau
-- direct, hors interface, ne peut pas y echapper.
-- ============================================================================

alter table public.projects
  add column if not exists apparence jsonb;

comment on column public.projects.apparence is
  'Reglages visuels du projet : couleurs, police, musique. Null = herite du kit de marque.';

-- ------------------------------------------------------------------ structure
alter table public.projects drop constraint if exists projects_apparence_valide;

alter table public.projects add constraint projects_apparence_valide check (
  apparence is null
  or (
    -- Le champ doit etre un objet JSON.
    jsonb_typeof(apparence) = 'object'

    -- 2 ou 3 couleurs, exactement comme la table brand_kits.
    and apparence ? 'couleurs'
    and jsonb_typeof(apparence -> 'couleurs') = 'array'
    and jsonb_array_length(apparence -> 'couleurs') between 2 and 3

    -- Chaque couleur au format #RRGGBB. Le jsonpath permet de verifier CHAQUE
    -- element du tableau : une sous-requete serait refusee dans un CHECK.
    and not jsonb_path_exists(
      apparence,
      '$.couleurs[*] ? (!(@ like_regex "^#[0-9a-fA-F]{6}$"))'
    )

    -- Une police non vide.
    and apparence ? 'police'
    and jsonb_typeof(apparence -> 'police') = 'string'
    and length(apparence ->> 'police') > 0

    -- La musique est facultative, mais si elle est presente elle doit etre
    -- une chaine (le chemin dans le stockage) ou explicitement nulle.
    and (
      not (apparence ? 'musique')
      or apparence -> 'musique' = 'null'::jsonb
      or (jsonb_typeof(apparence -> 'musique') = 'string'
          and length(apparence ->> 'musique') > 0)
    )
  )
);

comment on constraint projects_apparence_valide on public.projects is
  'Refuse une apparence mal formee (couleurs hors format hexa, police vide), meme en ecriture directe.';
