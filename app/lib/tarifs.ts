import type { Plan } from '@/lib/data/types'

/**
 * Motiq — TARIFS. Source unique.
 *
 * POURQUOI CE FICHIER
 * Les prix apparaissaient a cinq endroits : l'application, deux maquettes
 * servies, deux maquettes sources et les scripts qui les generent. Un prix
 * modifie a un seul endroit finit par diverger des autres. Ici, il n'existe
 * qu'une fois.
 *
 * ORIGINE DES MONTANTS
 * Fixes par le donneur d'ordre. Ils ne sont PAS deduits : ce sont des
 * decisions. Les maquettes de phase 1 disaient « a definir » — c'est remplace.
 *
 * DEVISE
 * Franc CFA (XOF). Les montants sont des entiers : pas de centimes, pas de
 * flottants, donc pas d'arrondi hasardeux au moment de facturer.
 */

export const DEVISE = 'Fr CFA'
export const PERIODE = '/mois'

export interface Tarif {
  plan: Plan
  nom: string
  /** Prix mensuel, en francs CFA. Entier. */
  prix: number
  /**
   * Rendus inclus par mois.
   *
   * `null` = pas encore fixe. On ne met PAS de chiffre inventé : la maquette
   * annonce « quotas provisoires — à valider », et un quota trop genereux
   * engage un coût reel (chaque rendu consomme des appels payants).
   *
   * Pro a 10 et Business 40 : decision du donneur d'ordre, prise sur la marge
   * restante. A 0,30 EUR le rendu, 20 rendus Pro ne laissaient que 1,47 EUR de
   * marge sur 7,47 EUR, et 30 rendus passaient en perte.
   */
  quotaMensuel: number
}

export const TARIFS: Record<Plan, Tarif> = {
  gratuit: { plan: 'gratuit', nom: 'Gratuit', prix: 0, quotaMensuel: 3 },
  pro: { plan: 'pro', nom: 'Pro', prix: 4900, quotaMensuel: 10 },
  business: { plan: 'business', nom: 'Business', prix: 9900, quotaMensuel: 40 },
}

/** Nombre de rendus par mois pour un plan donne. Jamais zero par accident. */
export const quotaDuPlan = (plan: Plan): number => TARIFS[plan].quotaMensuel

/**
 * 4900 -> « 4 900 Fr CFA »
 *
 * Formatage ecrit a la main plutot que par `toLocaleString` : le rendu depend
 * alors du moteur et de l'environnement, ce qui a deja produit des espaces
 * insecables invisibles dans le HTML.
 */
const grouper = (montant: number): string =>
  String(montant).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

export const formaterPrix = (montant: number): string => `${grouper(montant)} ${DEVISE}`

/** « 4 900 Fr CFA/mois » — pour une phrase. */
export const formaterTarif = (plan: Plan): string =>
  `${formaterPrix(TARIFS[plan].prix)}${PERIODE}`

/**
 * Montant a envoyer a Paystack, en « sous-unite ».
 *
 * PIEGE MAJEUR, lu dans la documentation officielle Paystack :
 *   « While there is no subunit for XOF, developers must multiply the amount
 *     by 100 regardless. »
 *
 * Le Fr CFA n'a PAS de centimes — et pourtant Paystack attend quand meme le
 * montant multiplie par 100. Envoyer 4900 ferait payer 49 Fr CFA au lieu de
 * 4 900 : une erreur d'un facteur 100, que le client verrait sur sa facture.
 *
 * Cette fonction existe pour que la multiplication ne soit jamais ecrite a la
 * main ailleurs : c'est le seul endroit ou l'on peut se tromper.
 */
export const montantPaystack = (plan: Plan): number => TARIFS[plan].prix * 100

/** L'inverse, pour relire un montant recu de Paystack. */
export const depuisPaystack = (montant: number): number => Math.round(montant / 100)
