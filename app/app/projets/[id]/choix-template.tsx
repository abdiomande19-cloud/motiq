/**
 * Motiq — choix du template (composant client).
 *
 * Le catalogue vient de la base (table templates, 8 entrees). Le choix est
 * enregistre cote serveur apres verification que le template existe bien.
 */

'use client'

import { useActionState, useState } from 'react'
import type { Template } from '@/lib/data'
import { choisirTemplate, type EtatAction } from './actions'

interface Props {
  projetId: string
  templates: Template[]
  templateActuel: string | null
}

export default function ChoixTemplate({ projetId, templates, templateActuel }: Props) {
  const [choisi, setChoisi] = useState<string | null>(templateActuel)
  const [etat, envoyer, enCours] = useActionState(choisirTemplate, {} as EtatAction)

  return (
    <form action={envoyer} className="formulaire">
      <input type="hidden" name="projetId" value={projetId} />
      <input type="hidden" name="templateId" value={choisi ?? ''} />

      <div className="cartes">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className={choisi === template.id ? 'carte carte-choix choisi' : 'carte carte-choix'}
            onClick={() => setChoisi(template.id)}
            aria-pressed={choisi === template.id}
          >
            <span className="carte-titre">{template.nom}</span>
            <div className="carte-detail">{template.apercu}</div>
            <div className="carte-detail">
              {template.categorie} · {template.format}
            </div>
          </button>
        ))}
      </div>

      <div className="carte-actions">
        <button type="submit" className="bouton-principal" disabled={!choisi || enCours}>
          {enCours ? 'Enregistrement...' : 'Garder ce template'}
        </button>
        {templateActuel && (
          <span className="carte-detail">
            Template actuel : {templates.find((t) => t.id === templateActuel)?.nom ?? templateActuel}
          </span>
        )}
      </div>

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
