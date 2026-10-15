/**
 * Motiq — actions sur un projet (dupliquer, supprimer).
 *
 * La suppression demande une confirmation explicite : c'est une action
 * irreversible cote utilisateur (le cahier des charges la prevoit, on ne
 * l'execute pas par accident).
 */

'use client'

import { useState } from 'react'
import { dupliquerProjet, supprimerProjet } from './actions'

export default function BoutonProjet({ projetId }: { projetId: string; titre: string }) {
  const [confirmation, setConfirmation] = useState(false)

  return (
    <div className="carte-actions">
      <form action={dupliquerProjet.bind(null, projetId)}>
        <button type="submit" className="bouton-mini">
          Dupliquer
        </button>
      </form>

      {confirmation ? (
        <form action={supprimerProjet.bind(null, projetId)} className="confirmation">
          <span>Supprimer pour de bon ?</span>
          <button type="submit" className="bouton-mini bouton-danger">
            Oui, supprimer
          </button>
          <button
            type="button"
            className="bouton-mini"
            onClick={() => setConfirmation(false)}
          >
            Annuler
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="bouton-mini bouton-danger-leger"
          onClick={() => setConfirmation(true)}
        >
          Supprimer
        </button>
      )}
    </div>
  )
}
