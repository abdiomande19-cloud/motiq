import Link from 'next/link'

/**
 * Motiq — page « introuvable ».
 *
 * Elle sert DEUX cas volontairement indistinguables :
 *   1. une adresse qui n'existe pas ;
 *   2. un projet qui appartient a quelqu'un d'autre.
 *
 * Dans le second cas, la base ne rend pas la ligne (RLS) : pour nous, le projet
 * n'existe pas. Afficher « vous n'avez pas acces » revelerait son existence.
 * C'est pour cela que ce message ne parle que d'adresse introuvable.
 */
export default function NonTrouve() {
  return (
    <>
      <h1>Cette page n&apos;existe pas</h1>
      <p className="sous-titre">
        L&apos;adresse demandée n&apos;existe pas, ou ne mène à rien qui te soit accessible.
      </p>

      <table>
        <thead>
          <tr>
            <th>Tu cherchais peut-être</th>
            <th>Où aller</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>L&apos;accueil</td>
            <td>
              <Link href="/">La page d&apos;accueil</Link>
            </td>
          </tr>
          <tr>
            <td>Tes projets</td>
            <td>
              <Link href="/projets">La bibliothèque de projets</Link> (connexion requise)
            </td>
          </tr>
          <tr>
            <td>Ton identité visuelle</td>
            <td>
              <Link href="/kit-marque">Le kit de marque</Link>
            </td>
          </tr>
          <tr>
            <td>Les maquettes validées</td>
            <td>
              <Link href="/ecrans">Les 13 écrans</Link>
            </td>
          </tr>
          <tr>
            <td>L&apos;état du projet</td>
            <td>
              <Link href="/etat">La page état</Link>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="note">
        <strong>Une précision utile :</strong> si tu as suivi un lien vers un projet et que tu
        arrives ici, c&apos;est peut-être que ce projet n&apos;est pas le tien. La base ne me
        laisse pas le distinguer d&apos;une adresse inventée — te dire « accès refusé » en dirait
        déjà trop.
      </div>
    </>
  )
}
