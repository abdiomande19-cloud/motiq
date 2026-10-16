-- ============================================================================
-- MOTIQ — MIGRATION 0009 : nettoyage des droits sur subscriptions
--
-- Deux defauts constates en VERIFIANT la migration 0008 dans le catalogue :
--
-- 1. DEUX POLITIQUES SELECT identiques. La 0008 en a ajoute une alors que la
--    0001 en avait deja une. Deux politiques permissives equivalentes ne sont
--    pas une faille, mais elles rendent la lecture trompeuse : on croit voir
--    deux regles differentes. On garde celle de la 0001, dont le nom suit la
--    convention des 18 autres (table_action_sien) ; la mienne s'en ecartait.
--
-- 2. `anon` (visiteur NON connecte) pouvait lire la table. RLS le filtrait bien
--    (auth.uid() est nul, donc aucune ligne), mais un droit inutile est un
--    droit qu'on oublie. On le retire, ainsi que TRUNCATE / REFERENCES /
--    TRIGGER, dont personne n'a besoin ici.
-- ============================================================================

-- 1. La politique redondante, hors convention de nommage.
drop policy if exists "abonnements: lecture des siens" on public.subscriptions;

-- 2. Droits inutiles.
revoke select, truncate, references, trigger on public.subscriptions from anon;
revoke truncate, references, trigger on public.subscriptions from authenticated;

-- On garde, volontairement : SELECT pour authenticated (RLS filtre par
-- utilisateur) et tout pour service_role (le serveur ecrit apres verification
-- du paiement). Aucun INSERT/UPDATE/DELETE pour un utilisateur : il ne doit
-- jamais pouvoir s'ecrire un abonnement.
