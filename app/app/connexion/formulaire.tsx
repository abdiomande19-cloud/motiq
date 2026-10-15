/**
 * Motiq — formulaire de connexion / inscription (composant client).
 *
 * Un seul formulaire, deux modes. L'etat vient de l'action serveur : aucun
 * message de succes n'est affiche sans que le serveur l'ait confirme.
 */

'use client'

import { useActionState, useState } from 'react'
import { sInscrire, seConnecter, type EtatFormulaire } from './actions'

const ETAT_INITIAL: EtatFormulaire = {}

export default function Formulaire() {
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion')
  const action = mode === 'connexion' ? seConnecter : sInscrire
  const [etat, envoyer, enCours] = useActionState(action, ETAT_INITIAL)

  return (
    <div className="formulaire-cadre">
      <div className="onglets">
        <button
          type="button"
          className={mode === 'connexion' ? 'onglet actif' : 'onglet'}
          onClick={() => setMode('connexion')}
        >
          Se connecter
        </button>
        <button
          type="button"
          className={mode === 'inscription' ? 'onglet actif' : 'onglet'}
          onClick={() => setMode('inscription')}
        >
          Creer un compte
        </button>
      </div>

      <form action={envoyer} className="formulaire">
        {mode === 'inscription' && (
          <label>
            <span>Ton nom</span>
            <input type="text" name="nom" autoComplete="name" placeholder="Comment t'appeler ?" />
          </label>
        )}

        <label>
          <span>Adresse email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="toi@exemple.com"
          />
        </label>

        <label>
          <span>Mot de passe</span>
          <input
            type="password"
            name="motDePasse"
            autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            placeholder="6 caracteres minimum"
          />
        </label>

        <button type="submit" className="bouton-principal" disabled={enCours}>
          {enCours
            ? 'Un instant...'
            : mode === 'connexion'
              ? 'Se connecter'
              : 'Creer mon compte'}
        </button>

        {etat.erreur && (
          <p className="message message-erreur" role="alert">
            {etat.erreur}
          </p>
        )}
        {etat.succes && (
          <p className="message message-succes" role="status">
            {etat.succes}
          </p>
        )}
      </form>

      <p className="formulaire-note">
        Aucune donnee n&apos;est inventee : ton compte est cree dans la base Supabase du projet, et
        chaque ligne n&apos;est lisible que par toi (securite RLS).
      </p>
    </div>
  )
}
