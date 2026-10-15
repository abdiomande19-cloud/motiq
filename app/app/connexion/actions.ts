/**
 * Motiq — actions serveur d'authentification.
 *
 * Tout se passe cote serveur : le navigateur ne voit jamais de cle, et la
 * session est ecrite dans des cookies httpOnly par @supabase/ssr.
 *
 * Les messages d'erreur de Supabase sont traduits : un utilisateur francophone
 * ne doit pas lire « Invalid login credentials ».
 */

'use server'

import { redirect } from 'next/navigation'
import { creerClientServeur } from '@/lib/supabase/server'

export interface EtatFormulaire {
  erreur?: string
  succes?: string
}

/** Traduit les messages de Supabase les plus courants. */
function enFrancais(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (m.includes('email not confirmed')) {
    return "Confirme d'abord ton adresse : un lien t'a ete envoye par email."
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Un compte existe deja avec cette adresse. Essaie de te connecter.'
  }
  if (m.includes('password should be at least')) {
    return 'Le mot de passe doit contenir au moins 6 caracteres.'
  }
  if (m.includes('unable to validate email') || m.includes('invalid format')) {
    return "Cette adresse email n'a pas l'air valide."
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Trop de tentatives. Patiente une minute avant de reessayer.'
  }
  return `Une erreur est survenue : ${message}`
}

export async function seConnecter(
  _etat: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const email = String(donnees.get('email') ?? '').trim()
  const motDePasse = String(donnees.get('motDePasse') ?? '')

  if (!email || !motDePasse) {
    return { erreur: 'Renseigne ton adresse email et ton mot de passe.' }
  }

  const supabase = await creerClientServeur()
  const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })

  if (error) return { erreur: enFrancais(error.message) }

  redirect('/projets')
}

export async function sInscrire(
  _etat: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const email = String(donnees.get('email') ?? '').trim()
  const motDePasse = String(donnees.get('motDePasse') ?? '')
  const nom = String(donnees.get('nom') ?? '').trim()

  if (!email || !motDePasse) {
    return { erreur: 'Renseigne ton adresse email et ton mot de passe.' }
  }
  if (motDePasse.length < 6) {
    return { erreur: 'Le mot de passe doit contenir au moins 6 caracteres.' }
  }

  const supabase = await creerClientServeur()
  const { data, error } = await supabase.auth.signUp({
    email,
    password: motDePasse,
    options: { data: { nom: nom || email.split('@')[0] } },
  })

  if (error) return { erreur: enFrancais(error.message) }

  // Deux cas selon le reglage du projet :
  //  - la session est ouverte tout de suite -> on entre ;
  //  - une confirmation par email est exigee -> on le dit clairement.
  if (data.session) redirect('/projets')

  return {
    succes:
      'Compte cree. Un email de confirmation vient de partir : clique sur le lien, puis connecte-toi.',
  }
}

export async function seDeconnecter(): Promise<void> {
  const supabase = await creerClientServeur()
  await supabase.auth.signOut()
  redirect('/')
}
