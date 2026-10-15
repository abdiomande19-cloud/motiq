import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { creerClientServeur } from '@/lib/supabase/server'
import { obtenirDepotPourJeton } from '@/lib/data'
import { seDeconnecter } from '../connexion/actions'
import BoutonCreerProjet from './bouton-creer'
import BoutonProjet from './bouton-projet'

export const metadata: Metadata = {
  title: 'Motiq — mes projets',
}

/** Page privee : toujours rendue a la demande, avec la session de l'utilisateur. */
export const dynamic = 'force-dynamic'

const LIBELLE_STATUT: Record<string, string> = {
  brouillon: 'Brouillon',
  script_valide: 'Script validé',
  en_generation: 'En génération',
  pret: 'Prêt',
  echec: 'Échec',
}

export default async function PageProjets() {
  const supabase = await creerClientServeur()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Double securite : le proxy filtre deja, mais on ne rend jamais cette page
  // sans session, meme si le proxy etait contourne.
  if (!session) redirect('/connexion')

  const utilisateur = session.user
  const depot = obtenirDepotPourJeton(session.access_token)

  // Toutes ces lectures partent avec le jeton de l'utilisateur : RLS filtre.
  const [projets, profil, templates, usage] = await Promise.all([
    depot.listerProjets(utilisateur.id),
    depot.obtenirProfil(utilisateur.id),
    depot.listerTemplates(),
    depot.obtenirUsage(utilisateur.id, new Date().toISOString().slice(0, 7)),
  ])

  return (
    <>
      <div className="entete-page">
        <div>
          <h1>Mes projets</h1>
          <p className="sous-titre">
            Connecté en tant que <strong>{profil?.nom || utilisateur.email}</strong>
            {profil ? ` — plan ${profil.plan}` : ''}
          </p>
        </div>
        <form action={seDeconnecter}>
          <button type="submit" className="bouton-secondaire">
            Se déconnecter
          </button>
        </form>
      </div>

      <table>
        <thead>
          <tr>
            <th>Ce que dit la base</th>
            <th>Valeur lue sous ton identité</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Compte</td>
            <td>
              <code>{utilisateur.id}</code>
            </td>
          </tr>
          <tr>
            <td>Profil (table <code>profiles</code>)</td>
            <td>
              {profil
                ? `créé automatiquement à l'inscription — quota ${profil.quotaRestant}`
                : 'absent — le déclencheur de création a-t-il bien tourné ?'}
            </td>
          </tr>
          <tr>
            <td>Templates visibles</td>
            <td>{templates.length} (catalogue partagé, lecture seule)</td>
          </tr>
          <tr>
            <td>Rendus ce mois-ci</td>
            <td>{usage ? `${usage.nombreRendus} rendu(s), ${usage.minutesGenerees} min` : 'aucun'}</td>
          </tr>
        </tbody>
      </table>

      <h2>Créer un projet</h2>
      <BoutonCreerProjet />

      <h2>Tes projets ({projets.length})</h2>
      {projets.length === 0 ? (
        <div className="note">
          Aucun projet pour l&apos;instant. <strong>Et c&apos;est la bonne réponse :</strong> cette
          page lit la base avec <em>ton</em> jeton, et elle n&apos;y voit que tes lignes. Un autre
          utilisateur ne verrait pas celles que tu créeras.
        </div>
      ) : (
        <div className="cartes">
          {projets.map((projet) => (
            <div key={projet.id} className="carte carte-projet">
              <Link href={`/projets/${projet.id}`} className="carte-titre">
                {projet.titre}
              </Link>
              <div className="carte-detail">
                {LIBELLE_STATUT[projet.statut] ?? projet.statut} · entrée {projet.entreeSource}
              </div>
              <div className="carte-detail">
                Modifié le {new Date(projet.majLe).toLocaleDateString('fr-FR')}
              </div>
              <BoutonProjet projetId={projet.id} titre={projet.titre} />
            </div>
          ))}
        </div>
      )}

      <div className="note">
        <strong>Ce qui suit :</strong> l&apos;éditeur d&apos;écran 04 (création), le script découpé en
        scènes, le choix du template, puis la génération. Ces étapes ont besoin d&apos;une clé
        Anthropic et d&apos;un worker de rendu — voir la <a href="/etat">page état</a>.
      </div>
    </>
  )
}
