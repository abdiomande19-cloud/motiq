/**
 * Motiq — polices proposees pour le kit de marque.
 *
 * Ce fichier est volontairement separe des actions serveur : un module marque
 * `'use server'` ne peut exporter QUE des fonctions asynchrones. Exporter une
 * constante depuis un tel fichier provoque une erreur de compilation.
 *
 * Ces polices sont largement disponibles : le moteur de rendu pourra les
 * charger sans surprise.
 */

export const POLICES = [
  'Inter',
  'Poppins',
  'Montserrat',
  'Roboto',
  'Barlow Condensed',
  'Bebas Neue',
  'Playfair Display',
  'Space Grotesk',
] as const

export type Police = (typeof POLICES)[number]

/**
 * Garde de type : la liste ci-dessus est un tuple de litteraux, donc
 * `POLICES.includes(uneChaine)` refuse une chaine quelconque a la compilation.
 * Cette fonction fait le test en conservant l'information de type.
 */
export function estPoliceValide(valeur: string): valeur is Police {
  return (POLICES as readonly string[]).includes(valeur)
}

/** Adresse Google Fonts pour afficher un vrai apercu de la police. */
export function adressePolice(police: string): string {
  const famille = police.trim().replace(/\s+/g, '+')
  return `https://fonts.googleapis.com/css2?family=${famille}:wght@400;600;700&display=swap`
}
