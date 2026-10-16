import 'server-only'

import crypto from 'node:crypto'

/**
 * Motiq — le paiement, cote serveur.
 *
 * POURQUOI PAYSTACK ET PAS STRIPE
 * En Cote d'Ivoire, Stripe n'a pas de compte direct : stripe.com/global y
 * renvoie vers Paystack, qui est une societe Stripe. Paystack encaisse en
 * FCFA et accepte le Mobile Money (Orange Money, MTN Momo, Wave), ce que
 * Stripe classique ne fait pas.
 *
 * CE MODULE NE DOIT JAMAIS ETRE IMPORTE PAR UN COMPOSANT CLIENT
 * La cle secrete donne acces a tout le compte : mouvements d'argent, lecture
 * de toutes les transactions, remboursements. `server-only` fait echouer la
 * COMPILATION si un composant client tente de l'importer, au lieu de laisser
 * la cle fuir silencieusement dans le paquet du navigateur.
 */

const BASE = 'https://api.paystack.co'

function cleSecrete(): string {
  const cle = process.env.PAYSTACK_SECRET_KEY
  if (!cle) {
    throw new Error(
      'Motiq : PAYSTACK_SECRET_KEY est absente. Renseigne-la dans app/.env.local ' +
        '(outils/3-remplir-les-cles.bat).',
    )
  }
  return cle
}

async function appel<T>(chemin: string, init?: RequestInit): Promise<
  { ok: true; data: T } | { ok: false; message: string; code: number }
> {
  let reponse: Response
  try {
    reponse = await fetch(`${BASE}${chemin}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${cleSecrete()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Sans cet en-tete, Cloudflare repond « 403 error code: 1010 » — ce
        // qui ressemble exactement a une cle invalide et envoie sur une
        // fausse piste pendant longtemps.
        'User-Agent': 'Motiq/0.1',
        ...(init?.headers ?? {}),
      },
    })
  } catch (erreur) {
    return {
      ok: false,
      code: 0,
      message: `Paystack injoignable : ${erreur instanceof Error ? erreur.message : 'erreur réseau'}`,
    }
  }

  const corps = (await reponse.json().catch(() => null)) as
    | { status?: boolean; message?: string; data?: T }
    | null

  if (!reponse.ok || !corps?.status) {
    return {
      ok: false,
      code: reponse.status,
      message: corps?.message || `Réponse inattendue de Paystack (HTTP ${reponse.status}).`,
    }
  }

  return { ok: true, data: corps.data as T }
}

export interface TransactionInitialisee {
  authorizationUrl: string
  accessCode: string
  reference: string
}

/**
 * Ouvre une transaction. Le montant doit deja etre en sous-unite : passer par
 * `montantPaystack()` de lib/tarifs.ts, jamais multiplier a la main.
 */
export async function initialiserTransaction(params: {
  email: string
  /** Montant en sous-unite (prix x 100 — exigence Paystack pour le XOF). */
  montant: number
  /** Code du plan Paystack (PLN_...) pour creer l'abonnement recurrent. */
  planCode?: string
  reference: string
  callbackUrl: string
  metadonnees: Record<string, string>
}): Promise<{ ok: true; data: TransactionInitialisee } | { ok: false; message: string }> {
  const resultat = await appel<{
    authorization_url: string
    access_code: string
    reference: string
  }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      amount: params.montant,
      currency: 'XOF',
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadonnees,
      ...(params.planCode ? { plan: params.planCode } : {}),
      channels: ['card', 'mobile_money', 'bank_transfer'],
    }),
  })

  if (!resultat.ok) return { ok: false, message: resultat.message }

  return {
    ok: true,
    data: {
      authorizationUrl: resultat.data.authorization_url,
      accessCode: resultat.data.access_code,
      reference: resultat.data.reference,
    },
  }
}

export interface TransactionVerifiee {
  statut: string
  montant: number
  devise: string
  reference: string
  email: string
  codeClient: string | null
  planCode: string | null
  metadonnees: Record<string, unknown>
}

/**
 * Relit une transaction chez Paystack.
 *
 * C'est la SEULE source de verite : ni le navigateur, ni l'URL de retour ne
 * disent qu'un paiement a reussi. Un utilisateur peut appeler l'URL de retour
 * a la main, ou modifier la reference dans l'adresse — le serveur redemande
 * donc toujours a Paystack.
 */
export async function verifierTransaction(
  reference: string,
): Promise<{ ok: true; data: TransactionVerifiee } | { ok: false; message: string }> {
  const resultat = await appel<Record<string, unknown>>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: 'GET' },
  )
  if (!resultat.ok) return { ok: false, message: resultat.message }

  const d = resultat.data
  const client = (d.customer ?? {}) as Record<string, unknown>

  // PIEGE VERIFIE : dans la reponse de verification, `plan` est une CHAINE
  // (« PLN_... »), alors qu'ailleurs l'API renvoie un OBJET { plan_code }.
  // Les deux formes arrivent reellement — attendre uniquement l'objet laissait
  // plan_code vide en base, sans aucune erreur. On accepte les deux.
  const planBrut = d.plan
  const codePlan =
    typeof planBrut === 'string'
      ? planBrut
      : ((planBrut as Record<string, unknown> | null)?.plan_code ?? null)

  return {
    ok: true,
    data: {
      statut: String(d.status ?? ''),
      montant: Number(d.amount ?? 0),
      devise: String(d.currency ?? ''),
      reference: String(d.reference ?? reference),
      email: String(client.email ?? ''),
      codeClient: client.customer_code ? String(client.customer_code) : null,
      planCode: codePlan ? String(codePlan) : null,
      metadonnees: (d.metadata ?? {}) as Record<string, unknown>,
    },
  }
}

/**
 * Verifie qu'une notification vient bien de Paystack.
 *
 * Paystack signe le CORPS BRUT avec la cle secrete (HMAC-SHA512). On ne peut
 * donc pas comparer les donnees analysees : il faut l'octet pour l'octet recu,
 * sinon la signature ne correspond jamais. Un webhook non signe est une porte
 * ouverte : n'importe qui pourrait s'annoncer abonne en appelant l'URL.
 */
export function signatureValide(corpsBrut: string, signatureRecue: string | null): boolean {
  if (!signatureRecue) return false

  const attendue = crypto.createHmac('sha512', cleSecrete()).update(corpsBrut).digest('hex')

  // Comparaison a temps constant : une comparaison naive laisse fuir le nombre
  // d'octets corrects par le temps de reponse.
  const a = Buffer.from(attendue, 'utf8')
  const b = Buffer.from(signatureRecue, 'utf8')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
