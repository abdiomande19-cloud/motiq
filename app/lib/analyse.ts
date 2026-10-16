import 'server-only'

import { typeDepuisNom } from './fichiers'

/**
 * Motiq — lire le CONTENU d'une piece jointe.
 *
 * POURQUOI CE FICHIER
 * Deposer un fichier ne sert a rien si personne ne peut le lire. Sans cette
 * etape, un PDF reste une suite d'octets que l'IA ne verra jamais : elle
 * recevrait le NOM du fichier et devrait deviner ce qu'il contient.
 *
 * CE QU'ON SAIT LIRE, ET CE QU'ON NE SAIT PAS
 * On l'annonce sans detour, parce qu'un utilisateur qui depose un fichier
 * illisible doit le savoir tout de suite — pas decouvrir plus tard que son
 * document a ete ignore.
 *
 *   LISIBLES     PDF, Word (.docx), Excel (.xlsx), texte, CSV, Markdown, RTF
 *   NON LISIBLES Word 97-2003 (.doc) et Excel 97-2003 (.xls) : formats binaires
 *                anciens, qui demandent un analyseur dedie.
 *   SANS TEXTE   images, sons, videos : il n'y a pas de texte a extraire. Une
 *                image demanderait un modele de vision, une note vocale une
 *                transcription — deux services distincts de celui-ci.
 */

export interface Analyse {
  /** Le texte extrait, pret a etre transmis a l'IA. Vide si rien n'a pu l'etre. */
  texte: string
  /** Comment on l'a obtenu — affiche a l'utilisateur, jamais invente. */
  methode: string
  /** Pourquoi rien n'a pu etre extrait. Absent quand tout s'est bien passe. */
  nonLisible?: string
}

/** Nombre de caracteres au-dela duquel on coupe : un document entier noierait l'IA. */
const MAX_CARACTERES = 20_000

function nettoyer(texte: string): string {
  return texte
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ------------------------------------------------------------------- PDF
async function lirePdf(octets: Buffer): Promise<Analyse> {
  try {
    const { extractText, getDocumentProxy } = await import('unpdf')
    const document = await getDocumentProxy(new Uint8Array(octets))
    const { text, totalPages } = await extractText(document, { mergePages: true })
    const contenu = nettoyer(String(text))

    if (!contenu) {
      return {
        texte: '',
        methode: 'PDF lu',
        nonLisible:
          'Ce PDF ne contient aucun texte sélectionnable. C’est le cas des PDF scannés (une photo de document) : il faudrait une reconnaissance de caractères, que Motiq ne fait pas encore.',
      }
    }
    return { texte: contenu, methode: `PDF lu (${totalPages} page${totalPages > 1 ? 's' : ''})` }
  } catch (erreur) {
    return {
      texte: '',
      methode: 'PDF',
      nonLisible: `Ce PDF n’a pas pu être ouvert : ${erreur instanceof Error ? erreur.message : 'fichier illisible'}.`,
    }
  }
}

// ------------------------------------------------------------------ WORD
async function lireDocx(octets: Buffer): Promise<Analyse> {
  try {
    const mammoth = (await import('mammoth')).default
    const resultat = await mammoth.extractRawText({ buffer: octets })
    const contenu = nettoyer(resultat.value)

    if (!contenu) {
      return { texte: '', methode: 'Word lu', nonLisible: 'Ce document Word ne contient pas de texte.' }
    }

    const avertissements = resultat.messages.filter((m) => m.type === 'warning').length
    return {
      texte: contenu,
      methode:
        `Word lu${avertissements ? ` (${avertissements} élément(s) non transcrit(s) : images, tableaux complexes)` : ''}`,
    }
  } catch (erreur) {
    return {
      texte: '',
      methode: 'Word',
      nonLisible: `Ce document Word n’a pas pu être ouvert : ${erreur instanceof Error ? erreur.message : 'fichier illisible'}.`,
    }
  }
}

// ----------------------------------------------------------------- EXCEL
/**
 * Lit un .xlsx et rend chaque feuille sous forme de lignes.
 *
 * ATTENTION AU PIEGE : dans un .xlsx, une cellule de texte ne contient pas le
 * texte, mais un NUMERO qui renvoie a la table `sharedStrings.xml`. Rendre les
 * `<v>` tels quels afficherait « 3 » au lieu de « Bouake ». Il faut resoudre
 * l'indice — c'est le genre d'erreur qui produit un document lu « avec succes »
 * et pourtant vide de sens.
 */
async function lireXlsx(octets: Buffer): Promise<Analyse> {
  try {
    const JSZip = (await import('jszip')).default
    const archive = await JSZip.loadAsync(octets)

    // 1. La table des chaines partagees.
    const xmlPartagees = await archive.file('xl/sharedStrings.xml')?.async('string')
    const partagees: string[] = xmlPartagees
      ? [...xmlPartagees.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((bloc) =>
          [...bloc[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''),
        )
      : []

    const decoder = (valeur: string) =>
      valeur
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")

    // 2. Chaque feuille.
    const feuilles = Object.keys(archive.files)
      .filter((nom) => /^xl\/worksheets\/sheet\d+\.xml$/.test(nom))
      .sort()

    const morceaux: string[] = []
    let cellules = 0

    for (const [indice, cheminFeuille] of feuilles.entries()) {
      const xml = await archive.file(cheminFeuille)?.async('string')
      if (!xml) continue

      const lignes: string[] = []
      for (const ligne of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
        const valeurs: string[] = []
        for (const cellule of ligne[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
          const attributs = cellule[1]
          const corps = cellule[2]
          const brut = corps.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? ''
          const enLigne = corps.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1]

          if (enLigne !== undefined) {
            valeurs.push(decoder(enLigne))
          } else if (/t="s"/.test(attributs)) {
            // Indice dans la table des chaines.
            valeurs.push(decoder(partagees[Number(brut)] ?? ''))
          } else {
            valeurs.push(decoder(brut))
          }
          cellules += 1
        }
        if (valeurs.some((v) => v !== '')) lignes.push(valeurs.join(' | '))
      }

      if (lignes.length) {
        morceaux.push(`--- Feuille ${indice + 1} ---\n${lignes.join('\n')}`)
      }
    }

    const contenu = nettoyer(morceaux.join('\n\n'))
    if (!contenu) {
      return {
        texte: '',
        methode: 'Excel lu',
        nonLisible:
          'Ce classeur ne contient aucune valeur textuelle ou numérique lisible. S’il est composé uniquement de graphiques ou d’images, Motiq ne peut pas l’exploiter.',
      }
    }

    return {
      texte: contenu,
      methode: `Excel lu (${feuilles.length} feuille(s), ${cellules} cellule(s))`,
    }
  } catch (erreur) {
    return {
      texte: '',
      methode: 'Excel',
      nonLisible: `Ce classeur n’a pas pu être ouvert : ${erreur instanceof Error ? erreur.message : 'fichier illisible'}.`,
    }
  }
}

// ------------------------------------------------------------------- RTF
/** Un RTF est du texte avec des balises : on retire les commandes. */
function lireRtf(octets: Buffer): Analyse {
  const brut = octets.toString('latin1')
  const texte = brut
    .replace(/\\'([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\par[d]?/g, '\n')
    .replace(/\{\\\*[\s\S]*?\}/g, '')
    .replace(/\\[a-z]+-?\d* ?/gi, '')
    .replace(/[{}]/g, '')
  const contenu = nettoyer(texte)
  return contenu
    ? { texte: contenu, methode: 'RTF lu' }
    : { texte: '', methode: 'RTF', nonLisible: 'Ce fichier RTF ne contient pas de texte.' }
}

// --------------------------------------------------------------- aiguillage
/**
 * Extrait le texte d'une piece jointe.
 *
 * Ne LEVE JAMAIS : un fichier qu'on ne sait pas lire est un cas normal, pas
 * une panne. On rend toujours un resultat exploitable par l'appelant.
 */
export async function extraireTexte(
  nom: string,
  octets: Buffer,
  typeAnnonce?: string,
): Promise<Analyse> {
  const type = typeAnnonce || typeDepuisNom(nom)
  const extension = nom.toLowerCase().split('.').pop() ?? ''

  if (type === 'application/pdf' || extension === 'pdf') return lirePdf(octets)

  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === 'docx'
  ) {
    return lireDocx(octets)
  }

  if (
    type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    extension === 'xlsx'
  ) {
    return lireXlsx(octets)
  }

  if (extension === 'doc' || extension === 'xls' || type === 'application/msword' || type === 'application/vnd.ms-excel') {
    return {
      texte: '',
      methode: 'ancien format',
      nonLisible:
        `« ${nom} » est au format 97-2003 (.doc ou .xls), un format binaire ancien que Motiq ne sait pas ouvrir. ` +
        'Enregistre-le en .docx ou .xlsx et redépose-le : le contenu sera alors lu.',
    }
  }

  if (type === 'application/rtf' || extension === 'rtf') return lireRtf(octets)

  if (type.startsWith('text/') || ['txt', 'csv', 'md', 'log', 'json'].includes(extension)) {
    const contenu = nettoyer(octets.toString('utf8'))
    return contenu
      ? { texte: contenu, methode: 'texte lu' }
      : { texte: '', methode: 'texte', nonLisible: `« ${nom} » est vide.` }
  }

  if (type.startsWith('image/')) {
    return {
      texte: '',
      methode: 'image',
      nonLisible:
        `« ${nom} » est une image : elle n’a pas de texte à extraire. Motiq la gardera pour illustrer la vidéo. ` +
        'La DÉCRIRE automatiquement demanderait un modèle de vision, qui est un service d’IA payant, distinct de celui-ci.',
    }
  }

  if (type.startsWith('audio/')) {
    return {
      texte: '',
      methode: 'son',
      nonLisible:
        `« ${nom} » est un son. En extraire les paroles demande une transcription — voir la note vocale, ` +
        'qui utilise la reconnaissance vocale du navigateur.',
    }
  }

  if (type.startsWith('video/')) {
    return {
      texte: '',
      methode: 'vidéo',
      nonLisible:
        `« ${nom} » est une vidéo : Motiq ne sait pas en extraire de texte. La vidéo servira d’illustration.`,
    }
  }

  return {
    texte: '',
    methode: 'inconnu',
    nonLisible: `Motiq ne sait pas lire « ${nom} » (${type}).`,
  }
}

/** Coupe un texte trop long, en le signalant honnetement. */
export function borner(texte: string): { texte: string; tronque: boolean } {
  if (texte.length <= MAX_CARACTERES) return { texte, tronque: false }
  return {
    texte: texte.slice(0, MAX_CARACTERES),
    tronque: true,
  }
}
