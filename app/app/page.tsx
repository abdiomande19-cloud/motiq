import type { Metadata } from 'next'
import AccueilVisiteur from './accueil-visiteur'

/**
 * Motiq — accueil visiteur.
 *
 * Le contenu vit dans `accueil-visiteur.tsx` : cette page ne porte que les
 * metadonnees. L'accueil est la vitrine (ecran 01 valide en phase 1) ; l'etat
 * technique du socle est sur /etat.
 */

export const metadata: Metadata = {
  title: 'Motiq — une idée, une vidéo prête à publier',
  description:
    'Écrivez une phrase, importez des images ou enregistrez votre voix. Motiq écrit le script, découpe les scènes et rend une vidéo motion design verticale.',
}

export const dynamic = 'force-dynamic'

export default function Accueil() {
  return <AccueilVisiteur />
}
