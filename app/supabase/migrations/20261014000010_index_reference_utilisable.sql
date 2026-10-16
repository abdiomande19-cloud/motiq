-- ============================================================================
-- MOTIQ — MIGRATION 0010 : l'index unique doit etre utilisable par ON CONFLICT
--
-- LE BUG
-- La migration 0008 a cree un index UNIQUE PARTIEL :
--   create unique index ... on subscriptions (reference) where reference is not null;
--
-- L'intention etait bonne : plusieurs abonnements peuvent avoir une reference
-- nulle (crees a la main), mais jamais deux fois la meme reference.
--
-- Le probleme est ailleurs : PostgreSQL refuse d'utiliser un index PARTIEL pour
-- inferer une clause ON CONFLICT. `on conflict (reference)` echoue alors avec :
--   ERROR 42P10: there is no unique or exclusion constraint
--                matching the ON CONFLICT specification
--
-- Consequence reelle : l'activation d'un abonnement etait IMPOSSIBLE. Le
-- paiement passait, le plan ne changeait jamais. Le defaut a ete trouve en
-- testant le circuit, pas en relisant le SQL.
--
-- LA CORRECTION
-- Un index unique ORDINAIRE suffit, et fait meme mieux : PostgreSQL considere
-- deux valeurs NULL comme DISTINCTES dans un index unique. Plusieurs
-- abonnements a reference nulle sont donc acceptes, et deux fois la meme
-- reference est bien refuse.
--
-- Le predicat n'etait pas seulement genant : il etait inutile.
-- ============================================================================

drop index if exists public.subscriptions_reference_unique;

create unique index if not exists subscriptions_reference_unique
  on public.subscriptions (reference);

comment on index public.subscriptions_reference_unique is
  'Une reference donnee ne peut appartenir qu''a un seul abonnement. Les NULL restent multiples (PostgreSQL les considere distincts) — l''index partiel precedent etait donc inutile, et surtout inutilisable par ON CONFLICT.';
