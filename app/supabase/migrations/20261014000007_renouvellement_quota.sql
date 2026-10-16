-- ============================================================================
-- MOTIQ — MIGRATION 0007 : le quota se renouvelle chaque mois
--
-- LE BUG QUE CETTE MIGRATION CORRIGE
-- La migration 0006 a introduit un compteur `quota_restant` qui ne fait que
-- diminuer. Rien ne le remet a zero : un utilisateur du plan gratuit serait
-- bloque POUR TOUJOURS apres ses 3 premiers rendus.
--
-- Or le cahier des charges dit « quelques videos PAR MOIS ». Le renouvellement
-- n'etait pas seulement absent : c'etait un defaut fonctionnel.
--
-- COMMENT
-- On retient a quel mois appartient le quota (`quota_mois`). Avant de verifier
-- le quota, le serveur appelle `assurer_quota_du_mois` :
--   - si le quota date d'un mois precedent -> il repart a sa dotation ;
--   - sinon -> rien ne change.
--
-- POURQUOI PAS UNE TACHE PLANIFIEE
-- Un ordonnanceur devrait tourner pour tout le monde, a heure fixe, et raterait
-- les comptes crees entre deux passages. Ici, le renouvellement se fait au
-- moment ou l'on en a besoin : impossible de l'oublier.
--
-- LA DOTATION RESTE « A VALIDER »
-- La valeur par defaut (3) est celle de l'inscription. La maquette de phase 1
-- dit explicitement « quotas provisoires — a valider » : aucun chiffre par plan
-- n'est invente ici. Les dotations Pro et Business seront fixees avec les
-- abonnements.
-- ============================================================================

alter table public.profiles
  add column if not exists quota_mois date not null default date_trunc('month', now())::date;

comment on column public.profiles.quota_mois is
  'Mois auquel se rattache le quota restant. Sert a le renouveler.';

-- Les lignes existantes : on les rattache au mois courant.
update public.profiles
   set quota_mois = date_trunc('month', now())::date
 where quota_mois is null;

-- ------------------------------------------------------------------ fonction
create or replace function public.assurer_quota_du_mois(
  p_user_id uuid,
  p_quota_par_defaut int
)
returns public.profiles
language plpgsql
volatile
as $$
declare
  profil public.profiles;
begin
  -- Renouvellement, uniquement si le quota date d'un mois precedent.
  update public.profiles
     set quota_restant = p_quota_par_defaut,
         quota_mois = date_trunc('month', now())::date,
         maj_le = now()
   where id = p_user_id
     and quota_mois < date_trunc('month', now())::date;

  select * into profil from public.profiles where id = p_user_id;
  return profil;
end;
$$;

comment on function public.assurer_quota_du_mois(uuid, int) is
  'Renouvelle le quota s''il date d''un mois precedent, puis rend le profil. Reservee au serveur.';

-- Comme le decompte : personne d'autre que le serveur ne peut l'appeler.
-- Sans cela, un utilisateur pourrait se renouveler son quota a volonte.
revoke all on function public.assurer_quota_du_mois(uuid, int) from public;
revoke all on function public.assurer_quota_du_mois(uuid, int) from anon;
revoke all on function public.assurer_quota_du_mois(uuid, int) from authenticated;
grant execute on function public.assurer_quota_du_mois(uuid, int) to service_role;
