-- ============================================================================
-- MOTIQ — MIGRATION 0002 : user_id par defaut
--
-- POURQUOI CETTE MIGRATION
-- Lors de la premiere campagne de tests, une insertion a ete refusee par RLS
-- (« new row violates row-level security policy ») parce que le client devait
-- fournir lui-meme user_id. Le refus etait CORRECT — la securite a joue son
-- role — mais le schema peut etre plus tolerant sans etre moins sur.
--
-- Apres cette migration :
--   - si le client ne fournit pas user_id, PostgreSQL prend auth.uid() ;
--   - la politique WITH CHECK continue d'exiger auth.uid() = user_id.
--
-- Donc : un utilisateur ne peut toujours PAS ecrire au nom d'un autre, mais le
-- cas normal (ecrire chez soi) ne peut plus echouer par oubli.
-- ============================================================================

alter table public.projects      alter column user_id set default auth.uid();
alter table public.brand_kits    alter column user_id set default auth.uid();
alter table public.subscriptions alter column user_id set default auth.uid();
alter table public.usage         alter column user_id set default auth.uid();

comment on column public.projects.user_id is
  'Proprietaire du projet. Defaut = auth.uid(). La politique RLS impose auth.uid() = user_id.';
