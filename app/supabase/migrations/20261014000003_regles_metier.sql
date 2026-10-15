-- ============================================================================
-- MOTIQ — MIGRATION 0003 : les regles metier verifiees PAR LA BASE
--
-- POURQUOI CETTE MIGRATION
-- La regle « la video doit durer entre 15 et 60 secondes » (cahier des charges,
-- 6.1 point 5) n'existait que dans l'action serveur. Une ecriture directe en
-- base — script, outil externe, futur worker de rendu — l'aurait contournee.
--
-- Principe applique partout dans ce projet : le code applicatif ne peut pas
-- « oublier » une regle, parce que c'est la base qui la fait respecter.
--
-- Les scripts absents (projet brouillon) restent evidemment autorises.
-- ============================================================================

-- ------------------------------------------------------------------ duree
alter table public.projects drop constraint if exists projects_duree_valide;

alter table public.projects add constraint projects_duree_valide check (
  script is null
  or (
    -- Le CASE garantit que la conversion en nombre n'a lieu QUE si le champ
    -- est bien un nombre : sinon PostgreSQL leverait une erreur de conversion
    -- au lieu de refuser proprement.
    case
      when jsonb_typeof(script -> 'dureeTotaleSecondes') = 'number'
        then (script ->> 'dureeTotaleSecondes')::numeric between 15 and 60
      else false
    end
    and jsonb_array_length(coalesce(script -> 'scenes', '[]'::jsonb)) >= 1
  )
);

comment on constraint projects_duree_valide on public.projects is
  'Interdit un script hors des bornes 15-60 s, ou sans scene, meme en ecriture directe.';

-- ------------------------------------------------------------------ progression
-- La progression d'un rendu doit rester un pourcentage coherent.
alter table public.render_jobs drop constraint if exists render_jobs_progression_bornee;
alter table public.render_jobs add constraint render_jobs_progression_bornee
  check (progression between 0 and 100);
