/**
 * Motiq — enregistrement du service worker et proposition d'installation.
 *
 * Le service worker n'est enregistre QU'EN PRODUCTION : en developpement, il
 * mettrait en cache les fichiers de compilation et fausserait le rechargement
 * a chaud (on croirait a un bug qui n'existe pas).
 */

'use client'

import { useEffect, useState } from 'react'

/** L'evenement d'installation n'est pas dans les types standard. */
interface EvenementInstallation extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function Installation() {
  const [invite, setInvite] = useState<EvenementInstallation | null>(null)
  const [installee, setInstallee] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Un service worker refuse n'empeche pas l'application de fonctionner.
      })
    }

    if (window.matchMedia('(display-mode: standalone)').matches) setInstallee(true)

    function surInvite(evenement: Event) {
      evenement.preventDefault()
      setInvite(evenement as EvenementInstallation)
    }
    function surInstallation() {
      setInstallee(true)
      setInvite(null)
    }

    window.addEventListener('beforeinstallprompt', surInvite)
    window.addEventListener('appinstalled', surInstallation)
    return () => {
      window.removeEventListener('beforeinstallprompt', surInvite)
      window.removeEventListener('appinstalled', surInstallation)
    }
  }, [])

  // Rien a proposer si l'application est deja installee, ou si le navigateur
  // n'a pas emis d'invitation (Firefox, Safari, ou deja installee).
  if (installee || !invite) return null

  return (
    <button
      type="button"
      className="bouton-mini"
      onClick={async () => {
        await invite.prompt()
        await invite.userChoice
        setInvite(null)
      }}
    >
      Installer l&apos;application
    </button>
  )
}
