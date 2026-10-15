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
import { DepotSupabase } from './supabase'
import type { DepotMotiq } from './repository'

let instance: DepotMotiq | null = null

/**
 * Choisit l'implementation, dans cet ordre :
 *
 *  1. Supabase, si l'URL du projet et la cle secrete sont presentes dans
 *     l'environnement serveur. C'est le mode normal des que la base existe.
 *  2. Sinon, l'implementation locale sur fichier JSON : le socle doit pouvoir
 *     demarrer sans aucun identifiant (developpement, demonstration).
 *
 * `DepotSupabase` importe « server-only » : si un composant client tentait de
 * l'importer, la compilation echouerait — au lieu de laisser fuir la cle secrete
 * dans le navigateur.
 */
export function obtenirDepot(): DepotMotiq {
  if (instance) return instance

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.SUPABASE_SECRET_KEY

  if (url && cle) {
    instance = new DepotSupabase(url, cle)
    return instance
  }

  if (url || cle) {
    console.warn(
      '[Motiq] Configuration Supabase incomplete (URL ou cle manquante) : ' +
        'le depot local est utilise. Voir la page /etat.',
    )
  }

  instance = new DepotLocal()
  return instance
}

/**
 * Depot qui parle a la base SOUS L'IDENTITE de l'utilisateur connecte.
 *
 * C'est LE mode a utiliser des qu'il y a une session : on passe la cle PUBLIQUE
 * (sans danger, destinee au navigateur) et le jeton de l'utilisateur. Les
 * requetes arrivent donc dans PostgreSQL avec le role « authenticated » et
 * l'identifiant de l'utilisateur — et c'est RLS qui filtre. Le code applicatif
 * ne peut pas « oublier » de filtrer : la base refuse d'elle-meme.
 *
 * A l'inverse, `obtenirDepot()` sans jeton sert la cle secrete : c'est le mode
 * serveur/administration, a reserver aux traitements de fond.
 */
export function obtenirDepotPourJeton(jeton: string): DepotMotiq {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publique = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publique) {
    throw new Error(
      'Motiq : configuration Supabase absente. Impossible de lire la base sous ' +
        "l'identite de l'utilisateur.",
    )
  }

  return new DepotSupabase(url, publique, jeton)
}

/** Depot pret a l'emploi : `import { depot } from '@/lib/data'`. */
export const depot: DepotMotiq = obtenirDepot()

export * from './types'
export * from './repository'
