'use client'

import { useState } from 'react'
import { creerClientNavigateur } from '@/lib/supabase/client'

/**
 * Motiq — « Continuer avec Google ».
 *
 * COMMENT CA MARCHE
 * On ne demande JAMAIS le mot de passe Google, et on ne le voit jamais : le
 * navigateur part chez Google, la personne s'y connecte, puis Google renvoie
 * un CODE a usage unique sur /auth/callback. Ce code est echange contre une
 * session Supabase cote serveur.
 *
 * Le jeton Google ne transite donc jamais par notre code applicatif.
 *
 * CE QUE CA CHANGE POUR L'UTILISATEUR
 * Un compte en deux clics au lieu d'un mot de passe a inventer et retenir.
 * C'est la difference entre un visiteur qui s'inscrit et un visiteur qui part.
 *
 * SI CE N'EST PAS ENCORE CONFIGURE
 * Le bouton reste cliquable et affiche le message d'erreur renvoye par
 * Supabase. Mieux vaut un message clair qu'un bouton qui ne fait rien.
 */

export default function BoutonGoogle() {
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function connecter() {
    setEnCours(true)
    setErreur(null)

    const supabase = creerClientNavigateur()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // On revient sur le domaine depuis lequel on est parti : en local ou
        // en production, l'adresse de retour est donc toujours la bonne.
        redirectTo: `${window.location.origin}/auth/callback?suite=/projets`,
      },
    })

    if (error) {
      setEnCours(false)
      setErreur(
        error.message.includes('provider is not enabled')
          ? 'La connexion Google n’est pas encore activée. Utilise ton email et ton mot de passe en attendant.'
          : `La connexion Google a échoué : ${error.message}`,
      )
    }
    // En cas de succes, le navigateur a deja quitte la page.
  }

  return (
    <div className="bouton-google-bloc">
      <button
        type="button"
        className="bouton-google"
        onClick={connecter}
        disabled={enCours}
      >
        <span className="bouton-google-icone" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.5h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.6z" />
            <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3z" />
            <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
          </svg>
        </span>
        {enCours ? 'Redirection vers Google…' : 'Continuer avec Google'}
      </button>

      {erreur && (
        <p className="message message-erreur" role="alert" style={{ marginTop: 10 }}>
          {erreur}
        </p>
      )}

      <div className="separateur-ou">
        <span>ou</span>
      </div>
    </div>
  )
}
