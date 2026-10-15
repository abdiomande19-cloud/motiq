/**
 * Motiq — formulaire de creation d'un projet (composant client).
 *
 * Le succes affiche vient de l'action serveur, jamais du navigateur.
 */

'use client'

import { useActionState } from 'react'
import { creerProjet, type EtatProjet } from './actions'

const ETAT_INITIAL: EtatProjet = {}

export default function BoutonCreerProjet() {
  const [etat, envoyer, enCours] = useActionState(creerProjet, ETAT_INITIAL)

  return (
    <form action={envoyer} className="formulaire">
      <div className="formulaire-ligne">
        <label>
          <span>Titre du projet</span>
          <input type="text" name="titre" required placeholder="Ex. Promo de lancement" />
        </label>

        <label>
          <span>Point de depart</span>
          <select name="entreeSource" defaultValue="texte">
            <option value="texte">Une idee ecrite</option>
            <option value="images">Des images</option>
            <option value="voix">Une note vocale</option>
            <option value="video">Une video</option>
          </select>
        </label>
      </div>

      <label>
        <span>Ton idee (facultatif)</span>
        <textarea
          name="idee"
          rows={3}
          placeholder="Explique en une phrase ce que la video doit raconter."
        />
      </label>

      <button type="submit" className="bouton-principal" disabled={enCours}>
        {enCours ? 'Creation...' : 'Creer le projet'}
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
  )
}
