import type { Metadata } from 'next'
import Formulaire from './formulaire'

export const metadata: Metadata = {
  title: 'Motiq — connexion',
}

export default function PageConnexion() {
  return (
    <>
      <h1>Bienvenue sur Motiq</h1>
      <p className="sous-titre">
        Connecte-toi pour retrouver tes projets, ou cree un compte en quelques secondes.
      </p>
      <Formulaire />
    </>
  )
}
