import Link from 'next/link'

/**
 * Motiq — page d'accueil du socle.
 *
 * Elle appelle reellement la couche de donnees : si cette page s'affiche,
 * c'est que le depot repond. Aucune donnee n'est inventee pour l'occasion ;
 * les compteurs viennent de la base locale.
 */

export const dynamic = 'force-dynamic'

export default async function Accueil() {
  const { depot } = await import('@/lib/data')

  const [templates, projets, profilDemo] = await Promise.all([
    depot.listerTemplates(),
    depot.listerProjets('demo-invite'),
    depot.obtenirProfil('demo-invite'),
  ])

  return (
    <>
      <h1>Motiq — socle de l&apos;application</h1>
      <p className="sous-titre">
        Phase 2 : les fondations. L&apos;application démarre en local, les 13 écrans validés sont
        intégrés, et la couche de données répond — <strong>sans aucun identifiant</strong>.
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
            <td>{projets.length}</td>
          </tr>
          <tr>
            <td>Profil de test</td>
            <td>{profilDemo ? profilDemo.email : 'aucun (normal : base neuve)'}</td>
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
