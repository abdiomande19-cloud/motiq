/**
 * Motiq — point d'entree unique du depot de donnees (decision D2).
 *
 * Le reste de l'application fait toujours :
 *
 *     import { depot } from '@/lib/data'
 *     const projets = await depot.listerProjets(userId)
 *
 * et ne sait jamais quelle base est derriere. Aujourd'hui : locale (fichier).
 * Demain : Supabase, des que les identifiants sont disponibles — sans toucher
 * aux ecrans ni aux routes.
 */

import { DepotLocal } from './local'
import type { DepotMotiq } from './repository'

let instance: DepotMotiq | null = null

/**
 * Choisit l'implementation.
 *
 * Aujourd'hui, seule l'implementation locale existe. La bascule Supabase sera
 * ajoutee ici, en une seule fonction, quand SUPABASE_URL et les cles seront
 * presentes dans l'environnement serveur. En attendant, on ne simule rien :
 * on utilise explicitement le local.
 */
export function obtenirDepot(): DepotMotiq {
  if (instance) return instance

  const urlSupabase = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL

  if (urlSupabase) {
    // Volontairement non implemente a ce stade : pas de fausse promesse.
    // Le socle continue de fonctionner sur le local tant que la phase 2
    // n'est pas terminee.
    console.warn(
      '[Motiq] SUPABASE_URL est definie, mais l implementation Supabase n est pas ' +
        'encore branchee. Le depot local est utilise. Voir le plan de phases.',
    )
  }

  instance = new DepotLocal()
  return instance
}

/** Depot pret a l'emploi : `import { depot } from '@/lib/data'`. */
export const depot: DepotMotiq = obtenirDepot()

export * from './types'
export * from './repository'
