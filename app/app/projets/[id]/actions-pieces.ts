'use server'

import { randomUUID } from 'node:crypto'
import { creerClientServeur } from '@/lib/supabase/server'
import { obtenirDepot } from '@/lib/data'
import {
  deposerFichier,
  TAILLE_DOCUMENT_MAX,
  TAILLE_IMAGE_MAX,
  TAILLE_SON_MAX,
  TAILLE_VIDEO_MAX,
  TYPES_DOCUMENT,
  TYPES_IMAGE,
  TYPES_SON,
  TYPES_VIDEO,
  typeDepuisNom,
} from '@/lib/fichiers'
import { borner, extraireTexte } from '@/lib/analyse'
import type { TypeAsset } from '@/lib/data/types'

/**
 * Motiq — recevoir TOUT ce qu'un utilisateur peut apporter.
 *
 * Un seul point d'entree pour les images, les videos, les documents et les
 * notes vocales. Les separate serait plus « propre » sur le papier et plus
 * penible a l'usage : l'utilisateur, lui, veut deposer ce qu'il a sous la main
 * et voir ce que Motiq en a compris.
 *
 * CE QUI SE PASSE POUR CHAQUE FICHIER
 *   1. on identifie son genre (image, video, document, son) ;
 *   2. on le depose dans le stockage prive, sous le dossier de l'utilisateur ;
 *   3. on LIT son contenu quand c'est possible, et on enregistre le texte ;
 *   4. on dit clairement ce qui n'a pas pu etre lu, et pourquoi.
 *
 * L'etape 3 est celle qui change tout : sans elle, un PDF depose resterait un
 * nom de fichier. Avec elle, l'IA peut lire le document et comprendre la
 * demande.
 */

export interface EtatAction {
  erreur?: string
  succes?: string
  /** Ce que Motiq a compris de chaque piece. Affiche tel quel a l'utilisateur. */
  rapport?: string[]
}

interface Genre {
  dossier: string
  types: string[]
  tailleMax: number
  description: string
  typeAsset: TypeAsset
}

/** Classe un fichier selon son genre. */
function classer(nom: string, typeAnnonce: string): Genre | null {
  const type = typeAnnonce || typeDepuisNom(nom)

  if (type.startsWith('image/')) {
    return {
      dossier: 'images',
      types: TYPES_IMAGE,
      tailleMax: TAILLE_IMAGE_MAX,
      description: 'PNG, JPEG, WebP, AVIF, HEIC, GIF ou SVG',
      typeAsset: 'image',
    }
  }
  if (type.startsWith('video/')) {
    return {
      dossier: 'videos',
      types: TYPES_VIDEO,
      tailleMax: TAILLE_VIDEO_MAX,
      description: 'MP4, MOV, WebM, M4V ou MKV',
      typeAsset: 'video',
    }
  }
  if (type.startsWith('audio/')) {
    return {
      dossier: 'sons',
      types: TYPES_SON,
      tailleMax: TAILLE_SON_MAX,
      description: 'WebM, OGG, MP3, M4A, AAC ou WAV',
      typeAsset: 'audio',
    }
  }
  if (TYPES_DOCUMENT.includes(type) || type === 'application/octet-stream') {
    return {
      dossier: 'documents',
      types: TYPES_DOCUMENT,
      tailleMax: TAILLE_DOCUMENT_MAX,
      description: 'PDF, Word (.docx), Excel (.xlsx), texte, CSV, Markdown ou RTF',
      typeAsset: 'document' as TypeAsset,
    }
  }
  return null
}

/** Recoit un lot de pieces jointes. */
export async function deposerPieces(
  _precedent: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  const projetId = String(donnees.get('projetId') ?? '')
  if (!projetId) return { erreur: 'Projet introuvable.' }

  const fichiers = donnees
    .getAll('pieces')
    .filter((v): v is File => v instanceof File && v.size > 0)

  if (fichiers.length === 0) {
    return { erreur: 'Choisis au moins un fichier, ou enregistre une note vocale.' }
  }

  const supabase = await creerClientServeur()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erreur: 'Ta session a expiré. Reconnecte-toi.' }

  const depot = obtenirDepot()
  const rapport: string[] = []
  let acceptes = 0

  for (const fichier of fichiers) {
    const genre = classer(fichier.name, fichier.type)

    if (!genre) {
      rapport.push(`✗ ${fichier.name} — format non reconnu (${fichier.type || 'inconnu'})`)
      continue
    }

    // 1. Lire le contenu AVANT de deposer : si le fichier est illisible, mieux
    //    vaut le dire tout de suite que le stocker en silence.
    let texte = ''
    let note = ''
    if (genre.dossier === 'documents') {
      const analyse = await extraireTexte(
        fichier.name,
        Buffer.from(await fichier.arrayBuffer()),
        fichier.type,
      )
      const borne = borner(analyse.texte)
      texte = borne.texte
      if (analyse.nonLisible) {
        note = ` — ${analyse.nonLisible}`
      } else if (borne.tronque) {
        note = ` — ${analyse.methode}, texte coupé à 20 000 caractères`
      } else {
        note = ` — ${analyse.methode}, ${analyse.texte.length} caractères lus`
      }
    } else {
      note = ` — ${genre.description.split(',')[0]}`
    }

    // 2. Deposer dans le stockage prive.
    const resultat = await deposerFichier(genre.dossier, fichier, {
      types: genre.types,
      tailleMax: genre.tailleMax,
      descriptionTypes: genre.description,
    })

    if (resultat.erreur || !resultat.chemin) {
      rapport.push(`✗ ${fichier.name} — ${resultat.erreur ?? 'dépôt impossible'}`)
      continue
    }

    // 3. Enregistrer la piece.
    try {
      await depot.enregistrerAsset({
        id: randomUUID(),
        projetId,
        type: genre.typeAsset as 'image' | 'audio' | 'video' | 'logo',
        chemin: resultat.chemin,
        tailleOctets: fichier.size,
      })
    } catch (erreur) {
      rapport.push(
        `✗ ${fichier.name} — dépôt réussi mais fiche non enregistrée : ${erreur instanceof Error ? erreur.message : 'erreur inconnue'}`,
      )
      continue
    }

    acceptes += 1
    rapport.push(`✓ ${fichier.name}${note}`)
    if (texte) {
      rapport.push(`   Motiq a lu : « ${texte.slice(0, 160).replace(/\s+/g, ' ')}… »`)
    }
  }

  if (acceptes === 0) {
    return { erreur: `Aucune pièce n’a pu être acceptée.\n${rapport.join('\n')}`, rapport }
  }

  return {
    succes: `${acceptes} pièce(s) acceptée(s) sur ${fichiers.length}.`,
    rapport,
  }
}
