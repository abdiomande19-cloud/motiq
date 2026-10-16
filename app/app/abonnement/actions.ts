'use server'

import { randomUUID } from 'node:crypto'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { creerClientServeur } from '@/lib/supabase/server'
import { initialiserTransaction } from '@/lib/paiement'
import { montantPaystack, TARIFS } from '@/lib/tarifs'
import type { Plan } from '@/lib/data/types'

/**
 * Motiq — demarrer un abonnement.
 *
 * Le navigateur ne decide RIEN : il envoie le nom du plan, et c'est ici que
 * le montant est calcule, a partir de lib/tarifs.ts. Un montant venu du
 * formulaire serait modifiable : il suffirait de payer 1 Fr CFA pour obtenir
 * le plan Business.
 */

/** Plans reellement payants. Le gratuit ne s'achete pas. */
const PAYABLES: Plan[] = ['pro', 'business']

function codePlan(plan: Plan): string | null {
  const code = plan === 'pro' ? process.env.PAYSTACK_PLAN_PRO : process.env.PAYSTACK_PLAN_BUSINESS
  return code && code.trim() ? code.trim() : null
}

export async function demarrerAbonnement(formData: FormData): Promise<void> {
  const demande = String(formData.get('plan') ?? '')

  if (!PAYABLES.includes(demande as Plan)) {
    redirect('/abonnement?erreur=' + encodeURIComponent('Ce plan ne peut pas être souscrit.'))
  }
  const plan = demande as Plan

  const supabase = await creerClientServeur()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/connexion?suite=' + encodeURIComponent('/abonnement'))
  }

  const planCode = codePlan(plan)
  if (!planCode) {
    redirect(
      '/abonnement?erreur=' +
        encodeURIComponent(
          'Le paiement n’est pas encore configuré : les identifiants des plans sont absents.',
        ),
    )
  }

  const entetes = await headers()
  const origine =
    entetes.get('origin') ??
    `http://${entetes.get('host') ?? 'localhost:3000'}`

  // Reference unique : Paystack la refuse si elle a deja servi, ce qui evite
  // qu'un double clic cree deux transactions.
  const reference = `motiq_${plan}_${Date.now()}_${randomUUID().slice(0, 8)}`

  const resultat = await initialiserTransaction({
    email: user.email,
    // Le montant vient des tarifs, jamais du formulaire. `montantPaystack`
    // applique la multiplication par 100 exigee par Paystack pour le XOF.
    montant: montantPaystack(plan),
    planCode,
    reference,
    callbackUrl: `${origine}/abonnement/retour`,
    metadonnees: { user_id: user.id, plan },
  })

  if (!resultat.ok) {
    redirect('/abonnement?erreur=' + encodeURIComponent(resultat.message))
  }

  // Redirection vers la page de paiement Paystack. `redirect` leve une
  // exception de controle : surtout pas dans un try/catch.
  redirect(resultat.data.authorizationUrl)
}
