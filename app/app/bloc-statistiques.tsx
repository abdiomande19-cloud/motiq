import type { Statistiques } from '@/lib/data/types'
import CompteurAnime from './compteur-anime'

/**
 * Motiq — les chiffres de la page publique.
 *
 * PRINCIPE : AUCUN CHIFFRE INVENTE.
 * Tout vient de `statistiquesPubliques()`, qui lit la base. Quand une valeur
 * n'existe pas encore, on l'annonce telle quelle — « pas encore d'avis » —
 * plutot que d'afficher une note de 5 etoiles sortie de nulle part.
 *
 * Une page d'accueil qui annonce 12 000 utilisateurs quand il y en a 2 ne
 * trompe personne longtemps : le premier visiteur curieux verifie, et c'est
 * toute la credibilite du produit qui part avec.
 */
export default function BlocStatistiques({ chiffres }: { chiffres: Statistiques }) {
  const rienEncore = chiffres.utilisateurs === 0

  const tuiles = [
    {
      valeur: chiffres.utilisateurs,
      libelle: chiffres.utilisateurs > 1 ? 'utilisateurs inscrits' : 'utilisateur inscrit',
      note: null as string | null,
    },
    {
      valeur: chiffres.projets,
      libelle: chiffres.projets > 1 ? 'projets créés' : 'projet créé',
      note: null,
    },
    {
      valeur: chiffres.avis,
      libelle: chiffres.avis > 1 ? 'avis publiés' : 'avis publié',
      note: null,
    },
  ]

  return (
    <div className="bloc-chiffres">
      <div className="chiffres-grille">
        {tuiles.map((tuile) => (
          <div className="chiffre" key={tuile.libelle}>
            <div className="chiffre-valeur">
              <CompteurAnime valeur={tuile.valeur} />
            </div>
            <div className="chiffre-libelle">{tuile.libelle}</div>
          </div>
        ))}

        {/* La note n'apparait QUE si quelqu'un a note quelque chose. */}
        <div className="chiffre">
          {chiffres.noteMoyenne === null ? (
            <>
              <div className="chiffre-valeur chiffre-vide">—</div>
              <div className="chiffre-libelle">
                pas encore de note
                <br />
                <span className="carte-detail">sois le premier à donner ton avis</span>
              </div>
            </>
          ) : (
            <>
              <div className="chiffre-valeur">
                <CompteurAnime valeur={chiffres.noteMoyenne * 10} duree={1200} />{' '}
                <span className="chiffre-unite">/ 50</span>
              </div>
              <div className="chiffre-libelle">
                note moyenne
                <br />
                <span className="carte-detail">
                  {(chiffres.noteMoyenne * 10) % 10 === 0
                    ? `${chiffres.noteMoyenne} sur 5`
                    : `${chiffres.noteMoyenne} sur 5`}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="chiffres-source">
        {rienEncore ? (
          <>
            <strong>Motiq démarre.</strong> Ces compteurs se remplissent avec les vrais inscrits —
            ils afficheront <strong>0</strong> tant qu&apos;il n&apos;y aura personne, et c&apos;est
            exactement ce qu&apos;ils font.
          </>
        ) : (
          <>
            Chiffres lus dans la base à l&apos;instant, sans arrondi ni estimation.
            {chiffres.clientsSatisfaits > 0 && (
              <>
                {' '}
                <strong>{chiffres.clientsSatisfaits}</strong>{' '}
                {chiffres.clientsSatisfaits > 1 ? 'personnes ont noté' : 'personne a noté'} 4 étoiles
                ou plus.
              </>
            )}
          </>
        )}
      </p>
    </div>
  )
}
