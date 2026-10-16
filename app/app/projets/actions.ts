/**
 * Motiq — actions des projets (cote serveur, sous la session de l'utilisateur).
 *
 * Point cle : le depot est construit avec le jeton de l'utilisateur connecte.
 * Les requetes partent donc avec SON identite, et c'est RLS qui decide de ce
 * qu'il a le droit de voir ou d'ecrire. Le serveur ne peut pas « oublier » de
 * filtrer : la base refuse d'elle-meme.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { creerClientServeur } from '@/lib/supabase/server'
import { obtenirDepotPourJeton } from '@/lib/data'

export interface EtatProjet {
  erreur?: string
  succes?: string
}

/** Renvoie la session courante, ou null. */
async function session() {
  const supabase = await creerClientServeur()
  const {
    data: { session: s },
  } = await supabase.auth.getSession()
  return s
}

export async function creerProjet(
  _etat: EtatProjet,
  donnees: FormData,
): Promise<EtatProjet> {
  const s = await session()
  if (!s) return { erreur: 'Ta session a expire. Reconnecte-toi.' }

  const titre = String(donnees.get('titre') ?? '').trim()
  const idee = String(donnees.get('idee') ?? '').trim()
  const entreeSource = String(donnees.get('entreeSource') ?? 'texte')

  if (!titre) return { erreur: 'Donne un titre a ton projet.' }

  const origines = ['texte', 'images', 'voix', 'video']
  if (!origines.includes(entreeSource)) {
    return { erreur: 'Origine inconnue pour ce projet.' }
  }

  const projet = await (async () => {
    try {
      const depot = obtenirDepotPourJeton(s.access_token)
      return await depot.creerProjet({
        userId: s.user.id,
        titre,
        entreeSource: entreeSource as 'texte' | 'images' | 'voix' | 'video',
        idee: idee || null,
      })
    } catch (erreur) {
      return null
    }
  })()

  if (!projet) {
    return { erreur: 'La création a échoué. Recharge la page et réessaie.' }
  }

  revalidatePath('/projets')

  // On emmene DIRECTEMENT l'utilisateur dans son projet.
  // Constat d'usage reel : sans cette redirection, on reste sur la liste et il
  // faut deviner qu'il faut cliquer sur le titre pour continuer — un projet
  // reste alors vide alors que tout est pret.
  redirect(`/projets/${projet.id}`)
}

export async function supprimerProjet(projetId: string): Promise<void> {
  const s = await session()
  if (!s) return

  const depot = obtenirDepotPourJeton(s.access_token)
  await depot.supprimerProjet(s.user.id, projetId)
  revalidatePath('/projets')
}

export async function dupliquerProjet(projetId: string): Promise<void> {
  const s = await session()
  if (!s) return

  const depot = obtenirDepotPourJeton(s.access_token)
  await depot.dupliquerProjet(s.user.id, projetId)
  revalidatePath('/projets')
}
