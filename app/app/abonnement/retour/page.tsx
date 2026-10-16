import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { creerClientServeur } from '@/lib/supabase/server'
import { obtenirDepot } from '@/lib/data'
import { verifierTransaction } from '@/lib/paiement'
import { montantPaystack, TARIFS } from '@/lib/tarifs'
import type { Plan } from '@/lib/data/types'

export const metadata: Metadata = {
  title: 'Motiq — retour de paiement',
}

export const dynamic = 'force-dynamic'

/**
 * Motiq — retour de la page de paiement Paystack.
 *
 * PRINCIPE : on ne croit NI le navigateur, NI l'adresse de retour.
 * N'importe qui peut ouvrir cette adresse a la main, avec la reference qu'il
 * veut. Le seul juge est Paystack : on lui redemande la transaction, et on
 * compare ce qu'il repond a ce qu'on attendait.
 *
 * QUATRE CONTROLES, tous necessaires :
 *   1. le paiement est « success » ;
 *   2. la devise est bien le XOF ;
 *   3. le MONTANT correspond au prix du plan (sinon 1 Fr CFA suffirait) ;
 *   4. le paiement appartient a la personne connectee.
 */

const PAYABLES: Plan[] = ['pro', 'business']

/**
 * Construit l'adresse de retour en cas de probleme.
 *
 * On appelle ensuite `redirect()` DIRECTEMENT : il est type `never`, ce qui
 * permet au compilateur de comprendre que le code s'arrete la et de resserrer
 * les types (`reference` n'est alors plus « peut-etre absent »). Une fonction
 * maison ne beneficie pas de ce raisonnement — la version precedente laissait
 * passer des valeurs « peut-etre absentes », et le test de types l'a signale.
 */
const versEchec = (message: string) => '/abonnement?erreur=' + encodeURIComponent(message)

export default async function PageRetour({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>
}) {
  const params = await searchParams
  const reference = params.reference ?? params.trxref

  const supabase = await creerClientServeur()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/connexion?suite=' + encodeURIComponent('/abonnement'))

  if (!reference) redirect(versEchec('Aucune référence de paiement reçue.'))

  // ------------------------------------------------ 1. Paystack fait foi
  const resultat = await verifierTransaction(reference)
  if (!resultat.ok) {
    redirect(versEchec(`Paystack n’a pas confirmé ce paiement : ${resultat.message}`))
  }

  const transaction = resultat.data

  if (transaction.statut !== 'success') {
    redirect(
      versEchec(`Le paiement n’a pas abouti (statut « ${transaction.statut} »). Rien n’a été débité.`),
    )
  }

  if (transaction.devise !== 'XOF') {
    redirect(versEchec(`Devise inattendue (« ${transaction.devise} »). Le paiement n’a pas été appliqué.`))
  }

  const planDemande = String(transaction.metadonnees.plan ?? '')
  if (!PAYABLES.includes(planDemande as Plan)) {
    redirect(versEchec('Ce paiement ne correspond à aucun plan payant.'))
  }
  const plan = planDemande as Plan

  // ------------------------------------------------ 2. le montant paye
  const attendu = montantPaystack(plan)
  if (transaction.montant !== attendu) {
    redirect(
      versEchec(
        `Montant inattendu : ${transaction.montant} reçu, ${attendu} attendu pour le plan ` +
          `${TARIFS[plan].nom}. Rien n’a été activé — signale-le, nous régularisons.`,
      ),
    )
  }

  // ------------------------------------------------ 3. a qui appartient ce paiement
  const proprietaire = String(transaction.metadonnees.user_id ?? '')
  if (proprietaire !== session.user.id) {
    redirect(versEchec('Ce paiement appartient à un autre compte.'))
  }

  // ------------------------------------------------ 4. activation (serveur)
  // Cle secrete : l'utilisateur n'a pas le droit d'ecrire un abonnement, et
  // c'est voulu. On passe donc par le serveur, apres les controles ci-dessus.
  const depotServeur = obtenirDepot()
  try {
    await depotServeur.activerAbonnement({
      userId: session.user.id,
      plan,
      reference: transaction.reference,
      statut: transaction.statut,
      planCode: transaction.planCode,
      codeClient: transaction.codeClient,
    })
  } catch (erreur) {
    redirect(
      versEchec(
        'Le paiement est confirmé mais l’activation a échoué : ' +
          (erreur instanceof Error ? erreur.message : 'erreur inconnue') +
          '. Ton paiement n’est pas perdu — signale-le, nous appliquerons le plan à la main.',
      ),
    )
  }

  redirect(
    '/abonnement?ok=' +
      encodeURIComponent(
        `Abonnement ${TARIFS[plan].nom} activé : ${TARIFS[plan].quotaMensuel} rendus par mois à partir de maintenant.`,
      ),
  )
}
