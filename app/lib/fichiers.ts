/**
 * Motiq — depot et lecture de fichiers (stockage Supabase).
 *
 * REGLE DE SECURITE : le chemin d'un fichier DOIT commencer par l'identifiant
 * de l'utilisateur. C'est exactement ce qu'exige la politique du bucket
 * « medias » :
 *
 *     (storage.foldername(name))[1] = auth.uid()
 *
 * Autrement dit : meme si ce code etait modifie pour viser le dossier d'un
 * autre, le stockage refuserait. Le code n'est pas le garde-fou.
 *
 * Le bucket est PRIVE : un logo ne se lit donc pas par une adresse publique,
 * mais par un lien signe, valable une heure.
 */

import 'server-only'

import { creerClientServeur } from './supabase/server'

export const BUCKET = 'medias'

/** Types acceptes et taille maximale (2 Mo). */
export const TYPES_ACCEPTES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
export const TAILLE_MAX = 2 * 1024 * 1024

export interface ResultatDepot {
  chemin?: string
  erreur?: string
}

/** Depose un fichier dans le dossier de l'utilisateur connecte. */
export async function deposerFichier(dossier: string, fichier: File): Promise<ResultatDepot> {
  const supabase = await creerClientServeur()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { erreur: 'Ta session a expiré. Reconnecte-toi.' }
  if (fichier.size === 0) return { erreur: 'Le fichier est vide.' }
  if (fichier.size > TAILLE_MAX) {
    return { erreur: `Le fichier est trop lourd (${Math.round(fichier.size / 1024)} Ko, maximum 2048 Ko).` }
  }
  if (!TYPES_ACCEPTES.includes(fichier.type)) {
    return { erreur: 'Format non accepté : PNG, JPEG, WebP ou SVG uniquement.' }
  }

  // On nettoie le nom : un nom de fichier est une donnee venue de l'exterieur.
  const nomSur = fichier.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(-80)

  const chemin = `${user.id}/${dossier}/${Date.now()}-${nomSur}`

  const { error } = await supabase.storage.from(BUCKET).upload(chemin, fichier, {
    contentType: fichier.type,
    upsert: false,
  })

  if (error) return { erreur: `Le dépôt a échoué : ${error.message}` }
  return { chemin }
}

/** Lien temporaire pour afficher un fichier d'un bucket prive. */
export async function lienSigne(chemin: string | null, secondes = 3600): Promise<string | null> {
  if (!chemin) return null

  const supabase = await creerClientServeur()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(chemin, secondes)
  if (error) return null
  return data.signedUrl
}
