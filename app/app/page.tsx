import Link from 'next/link'

/**
 * Motiq — page d'accueil du socle.
 *
 * Elle appelle reellement la couche de donnees : si cette page s'affiche,
 * c'est que le depot repond. Aucune donnee n'est inventee pour l'occasion ;
 * les compteurs viennent de la base locale.
 */

export const dynamic = 'force-dynamic'

/**
 * Identifiant bien forme mais inexistant. Il permet de prouver que la lecture
 * fonctionne de bout en bout SANS inventer de donnees : la requete est valide
 * et doit rendre 0 ligne. (Un identifiant fantaisiste comme « demo-invite »
 * serait refuse par PostgreSQL : la colonne est de type uuid.)
 */
const UTILISATEUR_INEXISTANT = '00000000-0000-0000-0000-000000000000'

export default async function Accueil() {
  const { depot } = await import('@/lib/data')

  const [templates, projets, profil] = await Promise.all([
    depot.listerTemplates(),
    depot.listerProjets(UTILISATEUR_INEXISTANT),
    depot.obtenirProfil(UTILISATEUR_INEXISTANT),
  ])

  return (
    <>
      <h1>Motiq — socle de l&apos;application</h1>
      <p className="sous-titre">
        Phase 2 : les fondations. L&apos;application démarre, les 13 écrans validés sont intégrés,
        et la couche de données lit la <strong>vraie base Supabase</strong> (projet <code>motiq</code>,
        Europe de l&apos;Ouest) — avec la sécurité RLS active sur les 8 tables.
      </p>

      <h2>La couche de données répond</h2>
      <table>
        <thead>
          <tr>
            <th>Élément</th>
            <th>Valeur lue en direct</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Implémentation active</td>
            <td>
              <code>{depot.nom}</code>
            </td>
          </tr>
          <tr>
            <td>Templates disponibles</td>
            <td>
              <strong>{templates.length}</strong> — minimum exigé par le cahier des charges : 8
            </td>
          </tr>
          <tr>
            <td>Projets de l&apos;utilisateur de test</td>
            <td>{projets.length} — lecture valide, aucune donnee inventee</td>
          </tr>
          <tr>
            <td>Profil de test</td>
            <td>{profil ? profil.email : 'aucun (normal : base neuve)'}</td>
          </tr>
        </tbody>
      </table>

      <div className="note">
        <strong>Ce qui n&apos;est pas encore branché :</strong> l&apos;authentification, le stockage
        des médias, la génération vidéo et les paiements. Ils attendent les identifiants Supabase,
        la clé Anthropic, le service de transcription et Stripe — voir l&apos;état du socle.
      </div>

      <h2>Les écrans validés de la phase 1</h2>
      <p className="sous-titre">
        Les 13 maquettes sont servies telles quelles, sans aucune modification.{' '}
        <Link href="/ecrans">Voir la galerie complète →</Link>
      </p>

      <h2>État du socle</h2>
      <p className="sous-titre">
        Détail des phases, de ce qui est fait et de ce qui bloque : <Link href="/etat">page état</Link>.
      </p>
    </>
  )
}
