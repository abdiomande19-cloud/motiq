/**
 * Motiq — formulaire du kit de marque (composant client).
 *
 * L'apercu charge reellement la police choisie depuis Google Fonts : ce que
 * l'utilisateur voit correspond a ce que le rendu utilisera, au lieu d'une
 * approximation avec une police systeme.
 */

'use client'

import { useActionState, useEffect, useState } from 'react'
import { POLICES, adressePolice } from '@/lib/polices'
import {
  deposerLogo,
  enregistrerCouleursEtPolice,
  retirerLogo,
  type EtatKit,
} from './actions'

interface Props {
  couleursInitiales: string[]
  policeInitiale: string
  lienLogo: string | null
}

export default function FormulaireKit({
  couleursInitiales,
  policeInitiale,
  lienLogo,
}: Props) {
  const [premiere, setPremiere] = useState(couleursInitiales[0] ?? '#22d3c5')
  const [deuxieme, setDeuxieme] = useState(couleursInitiales[1] ?? '#ff7a59')
  const [aTrois, setATrois] = useState(couleursInitiales.length > 2)
  const [troisieme, setTroisieme] = useState(couleursInitiales[2] ?? '#e8eef6')
  const [police, setPolice] = useState(policeInitiale)

  const [etatKit, envoyerKit, kitEnCours] = useActionState(
    enregistrerCouleursEtPolice,
    {} as EtatKit,
  )
  const [etatLogo, envoyerLogo, logoEnCours] = useActionState(deposerLogo, {} as EtatKit)
  const [etatRetrait, envoyerRetrait, retraitEnCours] = useActionState(retirerLogo, {} as EtatKit)

  // Chargement de la police choisie, pour un apercu fidele.
  useEffect(() => {
    const identifiant = 'motiq-police-apercu'
    let lien = document.getElementById(identifiant) as HTMLLinkElement | null
    if (!lien) {
      lien = document.createElement('link')
      lien.id = identifiant
      lien.rel = 'stylesheet'
      document.head.appendChild(lien)
    }
    lien.href = adressePolice(police)
  }, [police])

  const couleursChoisies = aTrois ? [premiere, deuxieme, troisieme] : [premiere, deuxieme]

  return (
    <>
      <h2>Le logo</h2>
      <div className="kit-logo">
        <div className="kit-logo-apercu">
          {lienLogo ? (
            // Le bucket est prive : cette adresse est signee et expire dans 1 h.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lienLogo} alt="Logo du kit de marque" />
          ) : (
            <span className="carte-detail">
              Aucun logo
              <br />
              (PNG, JPEG, WebP ou SVG — 2 Mo max)
            </span>
          )}
        </div>

        <div className="kit-logo-actions">
          <form action={envoyerLogo} className="formulaire">
            <label>
              <span>Choisir un fichier</span>
              <input type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
            </label>
            <button type="submit" className="bouton-secondaire" disabled={logoEnCours}>
              {logoEnCours ? 'Dépôt...' : 'Envoyer le logo'}
            </button>
          </form>

          {lienLogo && (
            <form action={envoyerRetrait}>
              <button type="submit" className="bouton-mini bouton-danger-leger" disabled={retraitEnCours}>
                Retirer le logo
              </button>
            </form>
          )}

          {etatLogo.erreur && (
            <p className="message message-erreur" role="alert">
              {etatLogo.erreur}
            </p>
          )}
          {etatLogo.succes && (
            <p className="message message-succes" role="status">
              {etatLogo.succes}
            </p>
          )}
          {etatRetrait.succes && (
            <p className="message message-succes" role="status">
              {etatRetrait.succes}
            </p>
          )}
        </div>
      </div>

      <h2>Les couleurs et la police</h2>
      <form action={envoyerKit} className="formulaire">
        <input type="hidden" name="couleur1" value={premiere} />
        <input type="hidden" name="couleur2" value={deuxieme} />
        <input type="hidden" name="couleur3" value={aTrois ? troisieme : ''} />

        <div className="kit-couleurs">
          <label>
            <span>Couleur 1</span>
            <input
              type="color"
              value={premiere}
              onChange={(e) => setPremiere(e.target.value)}
            />
            <code>{premiere}</code>
          </label>

          <label>
            <span>Couleur 2</span>
            <input
              type="color"
              value={deuxieme}
              onChange={(e) => setDeuxieme(e.target.value)}
            />
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
          <input
            type="checkbox"
            checked={aTrois}
            onChange={(e) => setATrois(e.target.checked)}
          />
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

        <button type="submit" className="bouton-principal" disabled={kitEnCours}>
          {kitEnCours ? 'Enregistrement...' : 'Enregistrer le kit de marque'}
        </button>

        {etatKit.erreur && (
          <p className="message message-erreur" role="alert">
            {etatKit.erreur}
          </p>
        )}
        {etatKit.succes && (
          <p className="message message-succes" role="status">
            {etatKit.succes}
          </p>
        )}
      </form>

      <h2>Aperçu</h2>
      <p className="sous-titre">
        Voici ce que tes vidéos utiliseront. La police est réellement chargée, pas approchée.
      </p>
      <div className="kit-apercu" style={{ background: premiere }}>
        <div
          className="kit-apercu-bloc"
          style={{ color: deuxieme, fontFamily: `'${police}', sans-serif` }}
        >
          {lienLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lienLogo} alt="" className="kit-apercu-logo" />
          )}
          <div className="kit-apercu-titre">Ta marque, en mouvement</div>
          <div className="kit-apercu-texte">
            Trois mots qui restent en tête, sur fond de ta couleur.
          </div>
          <div className="kit-apercu-pastilles">
            {couleursChoisies.map((c) => (
              <span key={c} className="kit-pastille" style={{ background: c }} title={c} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
