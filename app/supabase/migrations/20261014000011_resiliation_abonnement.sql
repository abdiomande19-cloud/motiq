-- ============================================================================
-- MOTIQ — MIGRATION 0011 : resilier un abonnement
--
-- LE TROU
-- Le webhook ne traitait que « charge.success ». Si un client resilie chez
-- Paystack, ou si son abonnement s'arrete, Motiq n'en savait rien : il gardait
-- le plan Pro et 10 rendus par mois... POUR TOUJOURS, sans jamais etre paye.
-- C'est une fuite de revenu silencieuse : personne ne s'en apercoit puisque
-- tout continue de fonctionner.
--
-- Paystack envoie « subscription.disable » a l'arret. Cette fonction fait
-- retomber le compte au plan gratuit.
--
-- POURQUOI CETTE SIGNATURE ET PAS (user_id, reference)
-- Les evenements d'abonnement ne transportent NI l'identifiant de
-- l'utilisateur, NI la reference de la transaction : Paystack y met le code
-- client et l'email. Une fonction qui exigerait (user_id, reference) serait
-- inutilisable au moment precis ou elle sert. On lui donne ce que l'evenement
-- contient vraiment, et elle retrouve le reste.
--
-- PRECAUTION : on ne retrograde que s'il ne reste AUCUN autre abonnement
-- actif. Sans ce garde-fou, resilier le plan Business ferait perdre un plan
-- Pro encore valide — et un client qui a paye se retrouverait ramene au
-- gratuit par une resiliation qui ne le concernait pas.
-- ============================================================================

create or replace function public.desactiver_abonnement(
  p_code_client text,
  p_email       text,
  p_statut      text
)
returns void
language plpgsql
volatile
as $$
declare
  v_user_id   uuid;
  v_reference text;
begin
  -- Retrouver l'abonnement : par le code client d'abord, sinon par l'email du
  -- compte. Le plus recent gagne.
  select s.user_id, s.reference
    into v_user_id, v_reference
    from public.subscriptions s
    join public.profiles p on p.id = s.user_id
   where (p_code_client is not null and s.code_client = p_code_client)
      or (p_email is not null and p.email = p_email)
   order by s.periode_debut desc
   limit 1;

  -- Evenement sans correspondance : on ne fait RIEN, et surtout on ne devine
  -- pas. Mieux vaut un abonnement a resoudre a la main qu'un compte degrade
  -- par erreur.
  if v_user_id is null then
    return;
  end if;

  update public.subscriptions
     set statut_paiement = p_statut,
         annule_le       = coalesce(annule_le, now())
   where user_id = v_user_id
     and reference = v_reference;

  if not exists (
    select 1
      from public.subscriptions
     where user_id = v_user_id
       and annule_le is null
       and statut_paiement in ('success', 'active', 'non-renewing')
  ) then
    update public.profiles
       set plan          = 'gratuit',
           quota_restant = 3,
           quota_mois    = date_trunc('month', now())::date,
           maj_le        = now()
     where id = v_user_id;
  end if;
end;
$$;

comment on function public.desactiver_abonnement(text, text, text) is
  'Marque un abonnement comme resilie (retrouve par code client ou email) et retrograde au gratuit s''il ne reste aucun abonnement actif. Reservee au serveur.';

revoke all on function public.desactiver_abonnement(text, text, text) from public;
revoke all on function public.desactiver_abonnement(text, text, text) from anon;
revoke all on function public.desactiver_abonnement(text, text, text) from authenticated;
grant execute on function public.desactiver_abonnement(text, text, text) to service_role;
