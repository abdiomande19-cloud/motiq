/**
 * Motiq — bouton de lancement de la generation (composant client).
 */

'use client'

import { useActionState } from 'react'
import { lancerGeneration, type EtatAction } from './actions'

interface Props {
  projetId: string
  pret: boolean
  raison: string
}

export default function BoutonGeneration({ projetId, pret, raison }: Props) {
  const [etat, envoyer, enCours] = useActionState(lancerGeneration, {} as EtatAction)

  return (
    <form action={envoyer} className="formulaire">
      <input type="hidden" name="projetId" value={projetId} />

      <button type="submit" className="bouton-principal" disabled={!pret || enCours}>
        {enCours ? 'Enregistrement...' : 'Lancer la generation'}
      </button>

      {!pret && <p className="carte-detail">{raison}</p>}

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
