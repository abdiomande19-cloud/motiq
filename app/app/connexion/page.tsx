import type { Metadata } from 'next'
import BoutonGoogle from './bouton-google'
import Formulaire from './formulaire'

export const metadata: Metadata = {
  title: 'Motiq — connexion',
}

/**
 * Page de connexion.
 *
 * `searchParams` porte le message d'erreur renvoye par /auth/callback quand un
 * retour OAuth echoue. On l'affiche ici plutot que sur une page separee :
 * la personne reste la ou elle doit agir.
 */
export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>
}) {
  const { erreur } = await searchParams

  return (
    <>
      <h1>Bienvenue sur Motiq</h1>
      <p className="sous-titre">
        Connecte-toi pour retrouver tes projets, ou cree un compte en quelques secondes.
      </p>

      {erreur && (
        <div className="message message-erreur" role="alert">
          {erreur}
        </div>
      )}

      <BoutonGoogle />
      <Formulaire />
    </>
  )
}
