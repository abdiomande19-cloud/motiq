'use server'

import { revalidatePath } from 'next/cache'
import { creerClientServeur } from '@/lib/supabase/server'
import { obtenirDepotPourJeton } from '@/lib/data'

/**
 * Motiq — publier, modifier et supprimer son avis.
 *
 * PROTECTION CONTRE LE SPAM ET LES FAUX AVIS
 *
 * Aucune de ces protections ne repose sur la bonne volonte de l'utilisateur, et
 * aucune n'est seulement dans l'interface — elles seraient alors contournables
 * en ecrivant directement par l'API.
 *
 *   1. UN SEUL AVIS PAR PERSONNE. Contrainte UNIQUE en base. Sans elle, un
 *      utilisateur mecontent publierait cinquante avis a une etoile et ferait
 *      tomber la moyenne : c'est la premiere attaque contre un systeme d'avis.
 *   2. LE POT DE MIEL. Un champ invisible que seuls les robots remplissent.
 *      Un humain ne le voit pas, donc ne le remplit pas.
 *   3. LONGUEUR MINIMALE. « ok » et « test » ne sont pas des avis. La
 *      contrainte existe aussi en base, donc elle tient meme si ce code change.
 *   4. SESSION OBLIGATOIRE. La regle RLS impose que l'auteur soit la personne
 *      connectee : on ne peut pas signer un avis a la place d'un autre.
 *
 * CE QUI N'EST PAS FAIT, ET QU'IL FAUT SAVOIR
 * Rien n'empeche ici quelqu'un de creer plusieurs comptes pour publier
 * plusieurs avis. Seule une verification d'identite (telephone, paiement)
 * l'empecherait, et ce n'est pas au programme. La moderation humaine reste
 * donc necessaire — c'est pour cela qu'elle existe.
 */

export interface EtatAvis {
  erreur?: string
  succes?: string
}

const LONGUEUR_MIN = 10
const LONGUEUR_MAX = 2000

async function session() {
  const supabase = await creerClientServeur()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

/** Valide la note et le commentaire, avec des messages utiles. */
function valider(note: number, commentaire: string): string | null {
  if (!Number.isInteger(note) || note < 1 || note > 5) {
    return 'Choisis une note de 1 à 5 étoiles.'
  }
  if (commentaire.length < LONGUEUR_MIN) {
    return `Ton commentaire est trop court (${commentaire.length} caractères, ${LONGUEUR_MIN} minimum). Dis-nous ce qui t’a plu ou déplu.`
  }
  if (commentaire.length > LONGUEUR_MAX) {
    return `Ton commentaire est trop long (${commentaire.length} caractères, ${LONGUEUR_MAX} maximum).`
  }
  return null
}

export async function publierAvis(_precedent: EtatAvis, donnees: FormData): Promise<EtatAvis> {
  // 2. Pot de miel : invisible pour un humain, rempli par les robots.
  if (String(donnees.get('site_web') ?? '').trim() !== '') {
    return { succes: 'Merci, ton avis a bien été pris en compte.' }
  }

  const note = Number(donnees.get('note'))
  const commentaire = String(donnees.get('commentaire') ?? '').trim()

  const probleme = valider(note, commentaire)
  if (probleme) return { erreur: probleme }

  const s = await session()
  if (!s) return { erreur: 'Connecte-toi pour publier un avis.' }

  const depot = obtenirDepotPourJeton(s.access_token)

  try {
    const existant = await depot.monAvis(s.user.id)

    if (existant) {
      // 1. Deja un avis : on le MODIFIE. La base refuserait un second avis de
      //    toute facon, mais autant lui dire clairement ce qui se passe.
      const modifie = await depot.modifierAvis({
        userId: s.user.id,
        avisId: existant.id,
        note,
        commentaire,
      })
      if (!modifie) return { erreur: 'Ton avis n’a pas pu être modifié. Réessaie.' }
      revalidatePath('/')
      return { succes: 'Ton avis a été mis à jour.' }
    }

    await depot.enregistrerAvis({ userId: s.user.id, note, commentaire })
    revalidatePath('/')
    return { succes: 'Merci ! Ton avis est publié.' }
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : 'erreur inconnue'
    if (message.includes('duplicate') || message.includes('unique')) {
      return { erreur: 'Tu as déjà publié un avis.' }
    }
    return { erreur: `Ton avis n’a pas pu être enregistré : ${message}` }
  }
}

export async function supprimerMonAvis(donnees: FormData): Promise<void> {
  const s = await session()
  if (!s) return

  const avisId = String(donnees.get('avisId') ?? '')
  if (!avisId) return

  const depot = obtenirDepotPourJeton(s.access_token)
  await depot.supprimerAvis(s.user.id, avisId)
  revalidatePath('/')
}
