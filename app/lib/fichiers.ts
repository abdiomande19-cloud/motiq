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

// ============================================================================
// CE QU'UN UTILISATEUR PEUT DEPOSER
//
// Les listes sont volontairement LARGES : un utilisateur qui depose la photo
// prise par son telephone ne doit pas se heurter a un refus parce que son
// appareil produit de l'AVIF ou du HEIC, formats qu'on n'avait pas prevus.
// Refuser un fichier legitime coute plus cher que d'en accepter un de plus.
// ============================================================================

/** Images : 10 Mo max (maquette ecran 04 : « 2 a 8 photos, 10 Mo maximum »). */
export const TYPES_IMAGE = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/svg+xml',
]
export const TAILLE_IMAGE_MAX = 10 * 1024 * 1024

/** Anciens noms, conserves : le logo et les vignettes deja en place. */
export const TYPES_ACCEPTES = TYPES_IMAGE
export const TAILLE_MAX = TAILLE_IMAGE_MAX

/**
 * Son — musique ET note vocale.
 *
 * « audio/webm » N'EST PAS UN DETAIL : c'est le format que produit
 * l'enregistreur du navigateur (MediaRecorder) quand on enregistre sa voix.
 * Sans lui, un enregistrement parfaitement reussi etait REFUSE au depot. Le
 * format que produisent nos propres outils doit figurer dans nos listes.
 */
export const TYPES_SON = [
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/wav',
  'audio/wave',
]
export const TAILLE_SON_MAX = 25 * 1024 * 1024

/** Videos : formats produits par les telephones et les navigateurs. */
export const TYPES_VIDEO = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'video/3gpp',
  'video/x-matroska',
]
export const TAILLE_VIDEO_MAX = 100 * 1024 * 1024

/**
 * Documents : ce dont l'IA peut LIRE le texte pour comprendre la demande.
 *
 * Un fichier qu'on ne sait pas lire est un fichier qu'on ne sait pas exploiter.
 * Cette liste ne contient donc que des formats que le moteur d'analyse sait
 * ouvrir (voir lib/analyse.ts).
 */
export const TYPES_DOCUMENT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/rtf',
]
export const TAILLE_DOCUMENT_MAX = 20 * 1024 * 1024

/** Tout ce qui peut etre joint a une demande. */
export const TOUS_TYPES = [...TYPES_IMAGE, ...TYPES_VIDEO, ...TYPES_DOCUMENT, ...TYPES_SON]

/** Lit une taille en clair, pour un message utile. */
export function tailleLisible(octets: number): string {
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

/** Devine le type a partir de l'extension, quand le navigateur ne le donne pas. */
export function typeDepuisNom(nom: string): string {
  const extension = nom.toLowerCase().split('.').pop() ?? ''
  const table: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    avif: 'image/avif',
    heic: 'image/heic',
    heif: 'image/heif',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    m4v: 'video/x-m4v',
    '3gp': 'video/3gpp',
    mkv: 'video/x-matroska',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    rtf: 'application/rtf',
    mp3: 'audio/mpeg',
    m4a: 'audio/x-m4a',
    aac: 'audio/aac',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
  }
  return table[extension] ?? 'application/octet-stream'
}

export interface ResultatDepot {
  chemin?: string
  erreur?: string
}

export interface OptionsDepot {
  types: string[]
  tailleMax: number
  /** Nom du probleme de format, pour un message clair. */
  descriptionTypes: string
}

/** Depose un fichier dans le dossier de l'utilisateur connecte. */
export async function deposerFichier(
  dossier: string,
  fichier: File,
  options: OptionsDepot = {
    types: TYPES_ACCEPTES,
    tailleMax: TAILLE_MAX,
    descriptionTypes: 'PNG, JPEG, WebP ou SVG',
  },
): Promise<ResultatDepot> {
  const supabase = await creerClientServeur()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { erreur: 'Ta session a expiré. Reconnecte-toi.' }
  if (fichier.size === 0) return { erreur: `« ${fichier.name} » est vide.` }
  if (fichier.size > options.tailleMax) {
    return {
      erreur: `« ${fichier.name} » est trop lourd (${tailleLisible(fichier.size)}, maximum ${tailleLisible(options.tailleMax)}).`,
    }
  }

  // Le navigateur ne remplit pas toujours `type` (HEIC, documents recents).
  // Se fier alors a l'extension vaut mieux que refuser sur une case vide —
  // c'est exactement le cas des photos prises avec un telephone.
  const type = fichier.type || typeDepuisNom(fichier.name)
  if (!options.types.includes(type)) {
    return {
      erreur: `« ${fichier.name} » : format non accepté (${options.descriptionTypes}).`,
    }
  }

  // On nettoie le nom : un nom de fichier est une donnee venue de l'exterieur.
  const nomSur = fichier.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(-80)

  const chemin = `${user.id}/${dossier}/${Date.now()}-${nomSur}`

  const { error } = await supabase.storage.from(BUCKET).upload(chemin, fichier, {
    contentType: type,
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

/**
 * Telecharge un fichier du stockage, cote serveur, POUR L'ANALYSER.
 *
 * A ne pas confondre avec `lienSigne` : celui-ci rend une adresse a ouvrir dans
 * le navigateur, celle-la rend les OCTETS, pour en extraire le texte. C'est
 * toute la difference entre « afficher un fichier » et « comprendre ce qu'il
 * dit ».
 */
export async function telecharger(chemin: string): Promise<Buffer | null> {
  const supabase = await creerClientServeur()
  const { data, error } = await supabase.storage.from(BUCKET).download(chemin)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}

/**
 * Retire un fichier du stockage.
 *
 * La politique du bucket s'applique aussi ici : le chemin doit commencer par
 * l'identifiant de l'utilisateur. Impossible de supprimer le fichier d'un autre.
 */
export async function retirerFichier(chemin: string): Promise<boolean> {
  const supabase = await creerClientServeur()
  const { error } = await supabase.storage.from(BUCKET).remove([chemin])
  return !error
}
