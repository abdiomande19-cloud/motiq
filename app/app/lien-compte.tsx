/**
 * Motiq — lien de compte dans le bandeau.
 *
 * Composant client : il interroge la session dans le navigateur, ce qui permet
 * de garder les pages statiques (les 13 ecrans, la page etat) reellement
 * statiques — elles ne dependent pas de la session.
 */

'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { creerClientNavigateur } from '@/lib/supabase/client'

export default function LienCompte() {
  const [connecte, setConnecte] = useState<boolean | null>(null)

  useEffect(() => {
    let actif = true

    try {
      const supabase = creerClientNavigateur()
      supabase.auth
        .getUser()
        .then(({ data }) => {
          if (actif) setConnecte(Boolean(data.user))
        })
        .catch(() => {
          if (actif) setConnecte(false)
        })
    } catch {
      // Supabase non configure : on reste sur l'etat « non connecte ».
      setConnecte(false)
    }

    return () => {
      actif = false
    }
  }, [])

  if (connecte === null) {
    return <span className="lien-compte" aria-hidden="true" />
  }

  return connecte ? (
    <Link href="/projets">Mes projets</Link>
  ) : (
    <Link href="/connexion">Se connecter</Link>
  )
}
