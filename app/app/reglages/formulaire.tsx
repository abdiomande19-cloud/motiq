/**
 * Motiq — formulaire du nom (composant client).
 */

'use client'

import { useActionState, useState } from 'react'
import { enregistrerNom, type EtatReglages } from './actions'

export default function FormulaireNom({ nomInitial }: { nomInitial: string }) {
  const [nom, setNom] = useState(nomInitial)
  const [etat, envoyer, enCours] = useActionState(enregistrerNom, {} as EtatReglages)

  return (
    <form action={envoyer} className="formulaire">
      <label>
        <span>Ton nom</span>
        <input
          type="text"
          name="nom"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          minLength={2}
          maxLength={60}
          required
        />
      </label>

      <button type="submit" className="bouton-principal" disabled={enCours}>
        {enCours ? 'Enregistrement...' : 'Enregistrer'}
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
