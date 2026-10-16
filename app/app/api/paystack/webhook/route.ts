import { NextResponse } from 'next/server'
import { signatureValide } from '@/lib/paiement'
import { obtenirDepot } from '@/lib/data'
import { montantPaystack, TARIFS } from '@/lib/tarifs'
import type { Plan } from '@/lib/data/types'

/**
 * Motiq — notification de paiement envoyee par Paystack.
 *
 * POURQUOI CE FICHIER EXISTE ALORS QUE LA PAGE DE RETOUR SUFFIT
 * La page de retour ne se declenche que si le client REVIENT sur le site.
 * S'il ferme son navigateur apres avoir paye, ou si sa connexion coupe, le
 * paiement est encaisse mais le plan jamais active. Le webhook, lui, est
 * appele par Paystack directement : il ne depend pas du client.
 *
 * IL NE REMPLACE PAS LA PAGE DE RETOUR, IL LA DOUBLE. Les deux appellent le
 * meme `activerAbonnement`, et la fonction SQL fait un ON CONFLICT sur la
 * reference : recevoir les deux ne cree pas deux abonnements.
 *
 * ATTENTION — EN LOCAL, CETTE ROUTE N'EST PAS JOIGNABLE
 * Paystack doit pouvoir appeler une adresse PUBLIQUE. Sur localhost, il ne
 * peut pas. Le circuit est donc verifie par la page de retour pendant le
 * developpement ; le webhook prend le relais une fois l'application deployee.
 * Il reste dans le depot parce que sans lui, la production perdrait des
 * paiements sans que personne ne s'en apercoive.
 *
 * SECURITE : la signature HMAC porte sur le CORPS BRUT. Lire `requete.json()`
 * d'abord consommerait le corps et la verification echouerait toujours — ou
 * pire, on serait tente de la retirer. Un webhook non verifie est une porte
 * ouverte : n'importe qui pourrait s'annoncer abonne en appelant cette adresse.
 */

type EvenementPaystack = {
  event?: string
  data?: {
    status?: string
    amount?: number
    currency?: string
    reference?: string
    subscription_code?: string
    customer?: { email?: string; customer_code?: string }
    plan?: { plan_code?: string } | string | null
    metadata?: Record<string, unknown>
  }
}

export async function POST(requete: Request): Promise<NextResponse> {
  const corpsBrut = await requete.text()
  const signature = requete.headers.get('x-paystack-signature')

  if (!signatureValide(corpsBrut, signature)) {
    // 401 : Paystack reessaiera. On ne traite rien.
    return NextResponse.json({ erreur: 'Signature invalide.' }, { status: 401 })
  }

  let evenement: EvenementPaystack
  try {
    evenement = JSON.parse(corpsBrut) as EvenementPaystack
  } catch {
    return NextResponse.json({ erreur: 'Corps illisible.' }, { status: 400 })
  }

  const type = evenement.event ?? ''
  const donnees = evenement.data ?? {}

  // ------------------------------------------------ resiliation
  // Sans ce traitement, un client qui resilie chez Paystack garderait le plan
  // Pro et 10 rendus par mois POUR TOUJOURS, sans jamais etre paye. C'est une
  // fuite de revenu silencieuse : rien ne casse, donc personne ne s'en apercoit.
  //
  // On ne traite QUE « disable » (l'abonnement est termine). « not_renew »
  // signifie qu'il ne se renouvellera pas mais qu'il court encore : retrograder
  // a ce moment-la couperait un client qui a paye.
  if (type === 'subscription.disable') {
    try {
      await obtenirDepot().desactiverAbonnement({
        codeClient: donnees.customer?.customer_code ?? null,
        email: donnees.customer?.email ?? null,
        statut: String(donnees.status ?? 'disabled'),
      })
    } catch (erreur) {
      return NextResponse.json(
        {
          erreur: 'résiliation impossible',
          detail: erreur instanceof Error ? erreur.message : 'erreur inconnue',
        },
        { status: 500 },
      )
    }
    return NextResponse.json({ recu: true, resilie: true })
  }

  // On repond 200 a tout ce qu'on ne traite pas : sinon Paystack reessaie
  // indefiniment un evenement qui ne nous interesse pas.
  if (type !== 'charge.success') {
    return NextResponse.json({ recu: true, ignore: type })
  }

  const reference = String(donnees.reference ?? '')
  const metadonnees = donnees.metadata ?? {}
  const planDemande = String(metadonnees.plan ?? '')
  const proprietaire = String(metadonnees.user_id ?? '')

  if (!reference || !proprietaire || !['pro', 'business'].includes(planDemande)) {
    return NextResponse.json({ recu: true, ignore: 'métadonnées incomplètes' })
  }
  const plan = planDemande as Plan

  // Memes controles que la page de retour : sans eux, un webhook rejoue ou
  // forge pourrait activer un plan sans le paiement correspondant.
  if (donnees.status !== 'success') {
    return NextResponse.json({ recu: true, ignore: `statut ${donnees.status}` })
  }
  if (donnees.currency !== 'XOF') {
    return NextResponse.json({ recu: true, ignore: `devise ${donnees.currency}` })
  }
  if (Number(donnees.amount) !== montantPaystack(plan)) {
    return NextResponse.json({
      recu: true,
      ignore: `montant ${donnees.amount} au lieu de ${montantPaystack(plan)} pour ${TARIFS[plan].nom}`,
    })
  }

  try {
    // `plan` arrive tantot en texte, tantot en objet selon l'evenement.
    const planBrut = donnees.plan
    const codePlan =
      typeof planBrut === 'string' ? planBrut : (planBrut?.plan_code ?? null)

    await obtenirDepot().activerAbonnement({
      userId: proprietaire,
      plan,
      reference,
      statut: String(donnees.status),
      planCode: codePlan,
      codeClient: donnees.customer?.customer_code ?? null,
    })
  } catch (erreur) {
    // 500 : Paystack reessaiera. C'est voulu — mieux vaut un troisieme essai
    // qu'un paiement encaisse sans abonnement.
    return NextResponse.json(
      {
        erreur: 'activation impossible',
        detail: erreur instanceof Error ? erreur.message : 'erreur inconnue',
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ recu: true, active: plan })
}
