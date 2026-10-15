/**
 * Motiq — client Supabase cote navigateur.
 *
 * N'utilise QUE la cle publique (celle qui a le prefixe NEXT_PUBLIC_).
 * Ce client est soumis a RLS : il ne voit que les donnees autorisees pour la
 * session de l'utilisateur connecte. La cle secrete n'apparait jamais ici.
 */

'use client'

import { createBrowserClient } from '@supabase/ssr'

export function creerClientNavigateur() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !cle) {
    throw new Error(
      'Motiq : NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY est absente. ' +
        'Voir app/.env.local.',
    )
  }

  return createBrowserClient(url, cle)
}
