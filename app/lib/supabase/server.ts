/**
 * Motiq — client Supabase cote serveur, adosse aux cookies de session.
 *
 * C'est ce client qui permet a l'application de savoir QUI est connecte, et de
 * parler a la base avec le jeton de cet utilisateur : RLS s'applique alors
 * normalement, comme pour n'importe quel client.
 *
 * Note Next 16 : `cookies()` est asynchrone et doit etre attendu.
 */

import 'server-only'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function creerClientServeur() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !cle) {
    throw new Error(
      'Motiq : NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY est absente. ' +
        'Voir app/.env.local.',
    )
  }

  const magasin = await cookies()

  return createServerClient(url, cle, {
    cookies: {
      getAll() {
        return magasin.getAll()
      },
      setAll(liste) {
        try {
          for (const { name, value, options } of liste) {
            magasin.set(name, value, options)
          }
        } catch {
          // Appele depuis un composant serveur en lecture seule : sans effet,
          // c'est le proxy (proxy.ts) qui rafraichit la session.
        }
      },
    },
  })
}

/** Renvoie l'utilisateur connecte, ou null. Ne leve jamais. */
export async function utilisateurCourant() {
  const supabase = await creerClientServeur()
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user ?? null
}
