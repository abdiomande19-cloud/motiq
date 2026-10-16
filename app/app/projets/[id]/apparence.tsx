/**
 * Motiq — apparence du projet (composant client).
 *
 * Couleurs, police et musique. L'apercu utilise le VRAI texte de la premiere
 * scene du script : ce qu'on voit correspond a ce que la video montrera.
 *
 * Detail important : le formulaire de musique transporte aussi les couleurs et
 * la police. Sans cela, deposer une musique effacerait les reglages visuels.
 */

'use client'

import { useActionState, useEffect, useState } from 'react'
import { POLICES, adressePolice } from '@/lib/polices'
import type { Apparence } from '@/lib/data'
import {
  deposerMusique,
  enregistrerApparence,
  retirerMusique,
  type EtatAction,
} from './actions'

interface Props {
  projetId: string
  apparence: Apparence | null
  /** Couleurs du kit de marque, proposees par defaut. */
  couleursDuKit: string[]
  /** Texte de la premiere scene, pour un apercu fidele. */
  texteApercu: string
  /** Lien signe vers la musique, s'il y en a une. */
  lienMusique: string | null
}

const COULEURS_PAR_DEFAUT = ['#22d3c5', '#ff7a59']

export default function ApparenceProjet({
  projetId,
  apparence,
  couleursDuKit,
  texteApercu,
  lienMusique,
}: Props) {
  const base = apparence?.couleurs ?? (couleursDuKit.length >= 2 ? couleursDuKit : COULEURS_PAR_DEFAUT)

  const [premiere, setPremiere] = useState(base[0] ?? COULEURS_PAR_DEFAUT[0])
  const [deuxieme, setDeuxieme] = useState(base[1] ?? COULEURS_PAR_DEFAUT[1])
  const [aTrois, setATrois] = useState((apparence?.couleurs.length ?? 0) > 2)
  const [troisieme, setTroisieme] = useState(apparence?.couleurs[2] ?? '#0b0f14')
  const [police, setPolice] = useState(apparence?.police ?? 'Inter')

  const [etatApparence, envoyerApparence, apparenceEnCours] = useActionState(
    enregistrerApparence,
    {} as EtatAction,
  )
  const [etatMusique, envoyerMusique, musiqueEnCours] = useActionState(
    deposerMusique,
    {} as EtatAction,
  )
  const [etatRetrait, envoyerRetrait, retraitEnCours] = useActionState(
    retirerMusique,
    {} as EtatAction,
  )

  useEffect(() => {
    const identifiant = 'motiq-police-projet'
    let lien = document.getElementById(identifiant) as HTMLLinkElement | null
    if (!lien) {
      lien = document.createElement('link')
      lien.id = identifiant
      lien.rel = 'stylesheet'
      document.head.appendChild(lien)
    }
    lien.href = adressePolice(police)
  }, [police])

  /** Champs caches communs : chaque formulaire doit transporter tout l'etat. */
  const champsCouleurs = (
    <>
      <input type="hidden" name="projetId" value={projetId} />
      <input type="hidden" name="couleur1" value={premiere} />
      <input type="hidden" name="couleur2" value={deuxieme} />
      <input type="hidden" name="couleur3" value={aTrois ? troisieme : ''} />
      <input type="hidden" name="police" value={police} />
    </>
  )

  return (
    <>
      <form action={envoyerApparence} className="formulaire">
        {champsCouleurs}
        <input type="hidden" name="musique" value={apparence?.musique ?? ''} />

        <div className="kit-couleurs">
          <label>
            <span>Couleur 1 (fond)</span>
            <input type="color" value={premiere} onChange={(e) => setPremiere(e.target.value)} />
            <code>{premiere}</code>
          </label>
          <label>
            <span>Couleur 2 (texte)</span>
            <input type="color" value={deuxieme} onChange={(e) => setDeuxieme(e.target.value)} />
            <code>{deuxieme}</code>
          </label>
          {aTrois && (
            <label>
              <span>Couleur 3</span>
              <input
                type="color"
                value={troisieme}
                onChange={(e) => setTroisieme(e.target.value)}
              />
              <code>{troisieme}</code>
            </label>
          )}
        </div>

        <label className="kit-case">
          <input type="checkbox" checked={aTrois} onChange={(e) => setATrois(e.target.checked)} />
          <span>Utiliser une troisième couleur (facultatif)</span>
        </label>

        <label>
          <span>Police</span>
          <select value={police} onChange={(e) => setPolice(e.target.value)}>
            {POLICES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="bouton-principal" disabled={apparenceEnCours}>
          {apparenceEnCours ? 'Enregistrement...' : 'Enregistrer les couleurs et la police'}
        </button>

        {etatApparence.erreur && (
          <p className="message message-erreur" role="alert">
            {etatApparence.erreur}
          </p>
        )}
        {etatApparence.succes && (
          <p className="message message-succes" role="status">
            {etatApparence.succes}
          </p>
        )}
      </form>

      <h3>La musique</h3>
      {apparence?.musique ? (
        <div className="musique-cadre">
          <audio controls src={lienMusique ?? undefined} className="musique-lecteur">
            Ton navigateur ne peut pas lire cet audio.
          </audio>
          <div className="carte-detail">
            Fichier : <code>{apparence.musique.split('/').pop()}</code>
          </div>
          <form action={envoyerRetrait} className="formulaire">
            {champsCouleurs}
            <button type="submit" className="bouton-mini bouton-danger-leger" disabled={retraitEnCours}>
              Retirer la musique
            </button>
          </form>
          {etatRetrait.succes && (
            <p className="message message-succes" role="status">
              {etatRetrait.succes}
            </p>
          )}
        </div>
      ) : (
        <form action={envoyerMusique} className="formulaire">
          {champsCouleurs}
          <label>
            <span>Ajouter une musique (MP3, M4A, AAC, WAV ou OGG — 8 Mo max)</span>
            <input type="file" name="musique" accept="audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/ogg" />
          </label>
          <button type="submit" className="bouton-secondaire" disabled={musiqueEnCours}>
            {musiqueEnCours ? 'Dépôt...' : 'Envoyer la musique'}
          </button>
          {etatMusique.erreur && (
            <p className="message message-erreur" role="alert">
              {etatMusique.erreur}
            </p>
          )}
          {etatMusique.succes && (
            <p className="message message-succes" role="status">
              {etatMusique.succes}
            </p>
          )}
        </form>
      )}

      <h3>Aperçu de la première scène</h3>
      <p className="sous-titre">
        Le texte ci-dessous vient de ton script. La police est réellement chargée, et les couleurs
        sont celles que tu viens de choisir.
      </p>
      <div className="kit-apercu" style={{ background: premiere }}>
        <div
          className="kit-apercu-bloc"
          style={{ color: deuxieme, fontFamily: `'${police}', sans-serif` }}
        >
          <div className="kit-apercu-titre">{texteApercu}</div>
          <div className="kit-apercu-pastilles">
            {(aTrois ? [premiere, deuxieme, troisieme] : [premiere, deuxieme]).map((c) => (
              <span key={c} className="kit-pastille" style={{ background: c }} title={c} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
