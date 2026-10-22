import { NextResponse } from 'next/server'
import { creerClientServeur } from '@/lib/supabase/server'

/**
 * Motiq — retour de Google (et de tout fournisseur OAuth).
 *
 * CE QUE FAIT CETTE ROUTE, ET POURQUOI ELLE EXISTE
 * Google ne renvoie pas une session : il renvoie un CODE a usage unique dans
 * l'adresse. Ce code ne vaut rien tel quel — il faut l'echanger contre une
 * vraie session, cote serveur, avec le secret de l'application. C'est ce que
 * fait `exchangeCodeForSession`.
 *
 * POURQUOI PAS ECHANGER CE CODE DANS LE NAVIGATEUR : le code circule dans
 * l'URL, donc dans l'historique, les journaux du serveur et les en-tetes de
 * provenance. Le consommer cote serveur, une seule fois, limite sa duree de
 * vie utile a quelques centaines de millisecondes.
 *
 * EN CAS D'ECHEC, ON NE RESTE PAS BLOQUE : on renvoie vers /connexion avec un
 * message. Une page blanche apres une connexion ratee est le pire des
 * comportements — la personne ne sait pas si elle est connectee ou non.
 */

export async function GET(requete: Request) {
  const url = new URL(requete.url)
  const code = url.searchParams.get('code')
  const erreurFournisseur = url.searchParams.get('error')

  // L'utilisateur a refuse la demande, ou Google a renvoye une erreur.
  if (erreurFournisseur || !code) {
    return NextResponse.redirect(
      `${url.origin}/connexion?erreur=${encodeURIComponent('La connexion a été annulée.')}`,
    )
  }

  // On n'accepte QUE des chemins internes : une adresse complete venue de
  // l'exterieur transformerait ce retour en redirection ouverte, donc en
  // tremplin de phishing aux couleurs de Motiq.
  const suiteBrute = url.searchParams.get('suite') ?? '/projets'
  const suite = suiteBrute.startsWith('/') && !suiteBrute.startsWith('//') ? suiteBrute : '/projets'

  const supabase = await creerClientServeur()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${url.origin}/connexion?erreur=${encodeURIComponent(
        `La connexion Google a échoué : ${error.message}`,
      )}`,
    )
  }

  return NextResponse.redirect(`${url.origin}${suite}`)
}
