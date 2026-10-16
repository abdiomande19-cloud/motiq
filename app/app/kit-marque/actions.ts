/**
 * Motiq — actions du kit de marque.
 *
 * Deux regles du cahier des charges sont verifiees ICI et DANS LA BASE :
 *   - entre 2 et 3 couleurs (contrainte CHECK sur la table brand_kits) ;
 *   - les couleurs sont au format hexa #RRGGBB.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { creerClientServeur } from '@/lib/supabase/server'
import { obtenirDepotPourJeton } from '@/lib/data'
import { deposerFichier } from '@/lib/fichiers'
import { estPoliceValide } from '@/lib/polices'
import type { KitMarque } from '@/lib/data'

export interface EtatKit {
  erreur?: string
  succes?: string
}

const HEXA = /^#[0-9a-fA-F]{6}$/

async function session() {
  const supabase = await creerClientServeur()
  const {
    data: { session: s },
  } = await supabase.auth.getSession()
  return s
}

/** Enregistre un kit (cree s'il n'existe pas encore, met a jour sinon). */
async function ecrireKit(
  jeton: string,
  userId: string,
  changements: Partial<Pick<KitMarque, 'logo' | 'couleurs' | 'police'>>,
): Promise<{ erreur?: string; kit?: KitMarque }> {
  const depot = obtenirDepotPourJeton(jeton)

  try {
    const existant = await depot.obtenirKitMarque(userId)

    const kit = await depot.enregistrerKitMarque({
      id: existant?.id ?? crypto.randomUUID(),
      userId,
      logo: changements.logo !== undefined ? changements.logo : (existant?.logo ?? null),
      couleurs: changements.couleurs ?? existant?.couleurs ?? ['#22d3c5', '#ff7a59'],
      police: changements.police ?? existant?.police ?? 'Inter',
    })

    return { kit }
  } catch (erreur) {
    return {
      erreur: `L'enregistrement a échoué : ${erreur instanceof Error ? erreur.message : 'raison inconnue'}`,
    }
  }
}

export async function enregistrerCouleursEtPolice(
  _etat: EtatKit,
  donnees: FormData,
): Promise<EtatKit> {
  const s = await session()
  if (!s) return { erreur: 'Ta session a expiré. Reconnecte-toi.' }

  // Les champs arrivent sous forme couleur1, couleur2, couleur3.
  const couleurs = [1, 2, 3]
    .map((n) => String(donnees.get(`couleur${n}`) ?? '').trim())
    .filter((c) => c.length > 0)

  if (couleurs.length < 2 || couleurs.length > 3) {
    return { erreur: 'Il faut 2 ou 3 couleurs.' }
  }
  for (const couleur of couleurs) {
    if (!HEXA.test(couleur)) {
      return { erreur: `« ${couleur} » n'est pas une couleur valide (format attendu #RRGGBB).` }
    }
  }

  const police = String(donnees.get('police') ?? 'Inter').trim()
  if (!estPoliceValide(police)) {
    return { erreur: 'Cette police ne fait pas partie de la liste.' }
  }

  const resultat = await ecrireKit(s.access_token, s.user.id, { couleurs, police })
  if (resultat.erreur) return { erreur: resultat.erreur }

  revalidatePath('/kit-marque')
  return { succes: 'Kit de marque enregistré.' }
}

export async function deposerLogo(_etat: EtatKit, donnees: FormData): Promise<EtatKit> {
  const s = await session()
  if (!s) return { erreur: 'Ta session a expiré. Reconnecte-toi.' }

  const fichier = donnees.get('logo')
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { erreur: 'Choisis d\u2019abord un fichier.' }
  }

  const depot = await deposerFichier('logo', fichier)
  if (depot.erreur || !depot.chemin) return { erreur: depot.erreur ?? 'Dépôt impossible.' }

  const resultat = await ecrireKit(s.access_token, s.user.id, { logo: depot.chemin })
  if (resultat.erreur) return { erreur: resultat.erreur }

  revalidatePath('/kit-marque')
  return { succes: 'Logo déposé. Il n\u2019est lisible que par toi (bucket privé).' }
}

export async function retirerLogo(_etat: EtatKit, _donnees: FormData): Promise<EtatKit> {
  const s = await session()
  if (!s) return { erreur: 'Ta session a expiré. Reconnecte-toi.' }

  const resultat = await ecrireKit(s.access_token, s.user.id, { logo: null })
  if (resultat.erreur) return { erreur: resultat.erreur }

  revalidatePath('/kit-marque')
  return { succes: 'Logo retiré du kit.' }
}
