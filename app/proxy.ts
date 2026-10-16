/**
 * Motiq — proxy (ex-« middleware »).
 *
 * Deux roles :
 *  1. rafraichir la session Supabase a chaque requete, pour que le jeton ne
 *     perime pas pendant la navigation ;
 *  2. proteger les pages privees : un visiteur non connecte qui demande
 *     /projets est renvoye vers /connexion.
 *
 * Next 16 : ce fichier s'appelle `proxy.ts` (l'ancien nom `middleware.ts` est
 * deprecie). La fonction exportee doit s'appeler `proxy`.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Pages qui exigent une session.
 *
 * ATTENTION : c'est une LISTE BLANCHE. Une page privee oubliee ici n'est PAS
 * protegee par le proxy. Chaque page privee garde donc son propre controle
 * (`if (!session) redirect(...)`) — le proxy est un filtre rapide, pas la
 * seule serrure.
 *
 * /api/paystack/webhook n'y figure pas, et c'est volontaire : Paystack appelle
 * cette adresse sans session. Il ne peut pas se connecter — la signature HMAC
 * remplace la session.
 */
const PAGES_PRIVEES = ['/projets', '/tableau-de-bord', '/reglages', '/kit-marque', '/abonnement']

export async function proxy(request: NextRequest) {
  let reponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  // Sans configuration Supabase, on ne bloque rien : le socle doit rester
  // consultable (et l'implementation locale prend le relais).
  if (!url || !cle) return reponse

  const supabase = createServerClient(url, cle, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(liste) {
        for (const { name, value } of liste) {
          request.cookies.set(name, value)
        }
        reponse = NextResponse.next({ request })
        for (const { name, value, options } of liste) {
          reponse.cookies.set(name, value, options)
        }
      },
    },
  })

  // IMPORTANT : ne jamais faire confiance a getSession() ici (valeur de cookie
  // falsifiable). getUser() valide le jeton aupres de Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const chemin = request.nextUrl.pathname
  const estPrivee = PAGES_PRIVEES.some((p) => chemin === p || chemin.startsWith(`${p}/`))

  if (!user && estPrivee) {
    const cible = request.nextUrl.clone()
    cible.pathname = '/connexion'
    cible.searchParams.set('suite', chemin)
    return NextResponse.redirect(cible)
  }

  // Un utilisateur deja connecte n'a rien a faire sur l'ecran de connexion.
  if (user && chemin === '/connexion') {
    const cible = request.nextUrl.clone()
    cible.pathname = '/projets'
    cible.search = ''
    return NextResponse.redirect(cible)
  }

  return reponse
}

export const config = {
  matcher: [
    /*
     * Tout sauf les fichiers statiques et les maquettes de la phase 1
     * (qui restent consultables sans compte).
     */
    '/((?!_next/static|_next/image|favicon.ico|ecrans|manifest.webmanifest|icone.svg|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)',
  ],
}
