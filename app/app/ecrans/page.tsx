import type { Metadata } from 'next'

/**
 * Galerie des 13 écrans validés en phase 1.
 *
 * Les fichiers HTML sont servis tels quels depuis `public/ecrans/` : ils sont
 * autonomes (CSS et JS inlinés) et n'ont subi AUCUNE modification. Cette page
 * se contente de les lister et de pointer vers eux.
 */

export const metadata: Metadata = {
  title: 'Motiq — les 13 écrans validés',
}

const ECRANS: { fichier: string; numero: string; titre: string; detail: string }[] = [
  { fichier: '01-accueil-visiteur.html', numero: '01', titre: 'Accueil visiteur', detail: 'Présentation et tarifs' },
  { fichier: '02-connexion-inscription.html', numero: '02', titre: 'Connexion / inscription', detail: 'Email et Google' },
  { fichier: '03-accueil-connecte.html', numero: '03', titre: 'Accueil connecté', detail: 'Créer, projets récents, quota' },
  { fichier: '04-creation-entree.html', numero: '04', titre: 'Création — entrée', detail: 'Texte, images ou voix' },
  { fichier: '05-script-scenes.html', numero: '05', titre: 'Script par scènes', detail: 'Valider ou modifier' },
  { fichier: '06-templates.html', numero: '06', titre: 'Choix du template', detail: 'Galerie de styles' },
  { fichier: '07-generation.html', numero: '07', titre: 'Génération', detail: 'Progression animée' },
  { fichier: '08-editeur-apercu.html', numero: '08', titre: 'Éditeur et aperçu', detail: 'Textes, ordre, couleurs, police, musique' },
  { fichier: '09-export-partage.html', numero: '09', titre: 'Export et partage', detail: 'MP4 et réseaux' },
  { fichier: '10-bibliotheque.html', numero: '10', titre: 'Bibliothèque', detail: 'Ouvrir, dupliquer, supprimer' },
  { fichier: '11-kit-marque.html', numero: '11', titre: 'Kit de marque', detail: 'Logo, couleurs, police' },
  { fichier: '12-abonnement.html', numero: '12', titre: 'Abonnement', detail: 'Gratuit, Pro, Business' },
  { fichier: '13-parametres-compte.html', numero: '13', titre: 'Paramètres du compte', detail: 'Profil et préférences' },
]

export default function GalerieEcrans() {
  return (
    <>
      <h1>Les 13 écrans de Motiq</h1>
      <p className="sous-titre">
        Maquettes validées en phase 1 (27 519 lignes de HTML autonome au total). Servies sans aucune
        modification — elles restent la référence visuelle.
      </p>

      <div className="cartes">
        {ECRANS.map((ecran) => (
          <a key={ecran.fichier} className="carte" href={`/ecrans/${ecran.fichier}`}>
            <span className="carte-numero">{ecran.numero}</span>
            <span className="carte-titre">{ecran.titre}</span>
            <div className="carte-detail">{ecran.detail}</div>
          </a>
        ))}
      </div>

      <h2>Index d&apos;origine</h2>
      <p className="sous-titre">
        L&apos;index produit en phase 1 est également disponible :{' '}
        <a href="/ecrans/index.html">ouvrir l&apos;index des maquettes</a>.
      </p>
    </>
  )
}
