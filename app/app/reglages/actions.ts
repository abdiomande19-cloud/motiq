/**
 * Motiq — actions des reglages du compte.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { creerClientServeur } from '@/lib/supabase/server'
import { obtenirDepotPourJeton } from '@/lib/data'

export interface EtatReglages {
  erreur?: string
  succes?: string
}

async function session() {
  const supabase = await creerClientServeur()
  const {
    data: { session: s },
  } = await supabase.auth.getSession()
  return s
}

const NOM_MIN = 2
const NOM_MAX = 60

export async function enregistrerNom(
  _etat: EtatReglages,
  donnees: FormData,
): Promise<EtatReglages> {
  const s = await session()
  if (!s) return { erreur: 'Ta session a expiré. Reconnecte-toi.' }

  const nom = String(donnees.get('nom') ?? '').trim()

  if (nom.length < NOM_MIN) {
    return { erreur: `Ton nom doit faire au moins ${NOM_MIN} caractères.` }
  }
  if (nom.length > NOM_MAX) {
    return { erreur: `Ton nom est trop long (${NOM_MAX} caractères maximum).` }
  }

  try {
    const depot = obtenirDepotPourJeton(s.access_token)
    await depot.mettreAJourProfil(s.user.id, { nom })
  } catch (erreur) {
    return {
      erreur: `L'enregistrement a échoué : ${erreur instanceof Error ? erreur.message : 'raison inconnue'}`,
    }
  }

  revalidatePath('/reglages')
  return { succes: 'Nom enregistré.' }
}
