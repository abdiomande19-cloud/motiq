-- ============================================================================
-- MOTIQ — MIGRATION 0008 : la table subscriptions passe a Paystack
--
-- POURQUOI
-- La migration 0001 a ete ecrite en supposant Stripe. En Cote d'Ivoire, Stripe
-- n'a pas de compte direct : il passe par Paystack (societe Stripe). La colonne
-- `statut_stripe` porte donc un nom trompeur, et il manque de quoi rapprocher
-- un paiement recu de l'abonnement qu'il paie.
--
-- CE QUI CHANGE
--   statut_stripe -> statut_paiement          (nom neutre, valable pour tout)
--   + fournisseur   : 'paystack' aujourd'hui
--   + reference     : la reference Paystack de la transaction
--   + code_client   : le client Paystack, pour retrouver ses paiements
--   + plan_code     : l'identifiant du plan cote Paystack (PLN_...)
--   + annule_le     : date de resiliation, quand elle arrive
--
-- La reference est UNIQUE : sans cela, le meme paiement rejoue par un webhook
-- (Paystack peut renvoyer un evenement plusieurs fois) creerait deux
-- abonnements pour un seul paiement.
-- ============================================================================

alter table public.subscriptions
  rename column statut_stripe to statut_paiement;

alter table public.subscriptions
  add column if not exists fournisseur  text not null default 'paystack',
  add column if not exists reference    text,
  add column if not exists code_client  text,
  add column if not exists plan_code    text,
  add column if not exists annule_le    timestamptz;

comment on column public.subscriptions.statut_paiement is
  'Statut renvoye par le fournisseur : success, active, non-renewing, cancelled...';
comment on column public.subscriptions.reference is
  'Reference de la transaction chez le fournisseur. Unique : empeche qu''un webhook rejoue cree un doublon.';
comment on table public.subscriptions is
  'Abonnements, relies a Paystack (societe Stripe) — mode test puis production.';

-- Une seule ligne par reference. Index partiel : plusieurs lignes peuvent avoir
-- une reference nulle (abonnements crees a la main), mais jamais la meme
-- reference deux fois.
create unique index if not exists subscriptions_reference_unique
  on public.subscriptions (reference)
  where reference is not null;

-- ------------------------------------------------------------------ securite
-- Les abonnements s'ecrivent UNIQUEMENT cote serveur (cle secrete), apres
-- verification du paiement aupres de Paystack. Un utilisateur ne doit pas
-- pouvoir s'ecrire un abonnement : ce serait la meme faille que le plan
-- modifiable corrige par la migration 0005.
revoke insert, update, delete on public.subscriptions from anon;
revoke insert, update, delete on public.subscriptions from authenticated;
grant select on public.subscriptions to authenticated;

-- La lecture reste filtree par RLS : chacun ne voit que ses abonnements.
drop policy if exists "abonnements: lecture des siens" on public.subscriptions;
create policy "abonnements: lecture des siens"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- Fonction d'activation, reservee au serveur.
--
-- Elle fait trois choses en UNE transaction, ce qui evite l'etat intermediaire
-- ou l'abonnement est enregistre mais le plan pas encore change :
--   1. met a jour le plan du profil ;
--   2. remet le quota du mois a la dotation du nouveau plan (sinon un client
--      qui vient de payer resterait bloque a 3 rendus jusqu'au mois suivant) ;
--   3. enregistre l'abonnement.
-- ============================================================================
create or replace function public.activer_abonnement(
  p_user_id   uuid,
  p_plan      text,
  p_reference text,
  p_statut    text,
  p_plan_code text,
  p_code_client text
)
returns void
language plpgsql
volatile
as $$
declare
  -- Dotation par plan : doit rester aligne sur lib/tarifs.ts.
  v_quota int;
begin
  v_quota := case p_plan
               when 'pro'      then 10
               when 'business' then 40
               else 3
             end;

  update public.profiles
     set plan          = p_plan,
         quota_restant = v_quota,
         quota_mois    = date_trunc('month', now())::date,
         maj_le        = now()
   where id = p_user_id;

  insert into public.subscriptions
    (user_id, plan, statut_paiement, reference, plan_code, code_client, periode_debut)
  values
    (p_user_id, p_plan, p_statut, p_reference, p_plan_code, p_code_client, now())
  on conflict (reference) do update
    set plan            = excluded.plan,
        statut_paiement = excluded.statut_paiement,
        plan_code       = excluded.plan_code,
        code_client     = excluded.code_client;
end;
$$;

comment on function public.activer_abonnement(uuid, text, text, text, text, text) is
  'Active un abonnement et remet le quota du mois a la dotation du plan. Reservee au serveur.';

revoke all on function public.activer_abonnement(uuid, text, text, text, text, text) from public;
revoke all on function public.activer_abonnement(uuid, text, text, text, text, text) from anon;
revoke all on function public.activer_abonnement(uuid, text, text, text, text, text) from authenticated;
grant execute on function public.activer_abonnement(uuid, text, text, text, text, text) to service_role;
