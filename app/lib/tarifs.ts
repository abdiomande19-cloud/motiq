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

export const DEVISE = 'F CFA'
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
 * 4900 -> « 4 900 F CFA »
 *
 * Formatage ecrit a la main plutot que par `toLocaleString` : le rendu depend
 * alors du moteur et de l'environnement, ce qui a deja produit des espaces
 * insecables invisibles dans le HTML.
 */
const grouper = (montant: number): string =>
  String(montant).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

export const formaterPrix = (montant: number): string => `${grouper(montant)} ${DEVISE}`

/** « 4 900 F/mois » — pour une phrase. */
export const formaterTarif = (plan: Plan): string =>
  `${formaterPrix(TARIFS[plan].prix)}${PERIODE}`
