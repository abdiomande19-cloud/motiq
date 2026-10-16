'use client'

import Link from 'next/link'
import { useEffect } from 'react'

/**
 * Motiq — page d'erreur.
 *
 * Elle ne masque pas le problème : elle affiche le message réel et propose de
 * réessayer. Un « une erreur est survenue » sans détail oblige à deviner.
 */
export default function Erreur({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Trace cote navigateur, pour retrouver l'erreur dans la console.
    console.error('[Motiq] erreur de rendu :', error)
  }, [error])

  return (
    <>
      <h1>Quelque chose a échoué</h1>
      <p className="sous-titre">
        La page n&apos;a pas pu s&apos;afficher. Réessaie : si le problème persiste, le message
        ci-dessous dit exactement ce qui s&apos;est passé.
      </p>

      <div className="message message-erreur" role="alert">
        <strong>{error.name}</strong> — {error.message}
        {error.digest && (
          <>
            <br />
            <span className="carte-detail">Référence : {error.digest}</span>
          </>
        )}
      </div>

      <div className="carte-actions">
        <button type="button" className="bouton-principal" onClick={reset}>
          Réessayer
        </button>
        <Link href="/" className="bouton-secondaire">
          Retour à l&apos;accueil
        </Link>
      </div>

      <div className="note">
        <strong>Ce qui n&apos;est jamais perdu :</strong> tes projets, ton script et tes réglages
        sont enregistrés dans la base, pas dans cette page. Une erreur d&apos;affichage ne les
        touche pas.
      </div>
    </>
  )
}
