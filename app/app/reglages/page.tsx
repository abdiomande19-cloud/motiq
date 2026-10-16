import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { creerClientServeur } from '@/lib/supabase/server'
import { obtenirDepotPourJeton, type Profil } from '@/lib/data'
import { formaterPrix, PERIODE, quotaDuPlan, TARIFS } from '@/lib/tarifs'
import { seDeconnecter } from '../connexion/actions'
import FormulaireNom from './formulaire'

export const metadata: Metadata = {
  title: 'Motiq — réglages du compte',
}

export const dynamic = 'force-dynamic'

/**
 * Libelle du plan : il vient de lib/tarifs.ts, comme le prix et le quota.
 * Une table ecrite ici finirait par dire « Pro » quand les tarifs diraient
 * autre chose.
 */
const libellePlan = (plan: string): string =>
  plan in TARIFS ? TARIFS[plan as keyof typeof TARIFS].nom : plan

export default async function PageReglages() {
  const supabase = await creerClientServeur()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/connexion')

  const utilisateur = session.user
  const depot = obtenirDepotPourJeton(session.access_token)

  const mois = new Date().toISOString().slice(0, 7)

  let [profil, usage, projets] = await Promise.all([
    depot.obtenirProfil(utilisateur.id),
    depot.obtenirUsage(utilisateur.id, mois),
    depot.listerProjets(utilisateur.id),
  ])

  // Filet de securite : le profil est normalement cree par un declencheur a
  // l'inscription. S'il manque (compte ancien, declencheur ajoute apres coup),
  // on le cree ici plutot que d'afficher une page cassee.
  let profilRecree = false
  if (!profil) {
    try {
      profil = await depot.creerProfil({
        id: utilisateur.id,
        email: utilisateur.email ?? '',
        nom: (utilisateur.user_metadata?.nom as string) || (utilisateur.email ?? '').split('@')[0],
        plan: 'gratuit',
        quotaRestant: quotaDuPlan('gratuit'),
        quotaMois: `${new Date().toISOString().slice(0, 7)}-01`,
      })
      profilRecree = true
    } catch {
      // Si la creation echoue aussi, la page reste lisible sans profil.
    }
  }

  const createsLe = new Date(utilisateur.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      <h1>Réglages du compte</h1>
      <p className="sous-titre">
        Ton profil, ton plan et ta consommation. Tes données ne sont lisibles que par toi — la
        sécurité est appliquée par la base, pas par cet écran.
      </p>

      {profilRecree && (
        <div className="note">
          <strong>Ton profil manquait.</strong> Il a été créé à l&apos;instant : compte ancien, ou
          créé avant le déclencheur automatique. Rien n&apos;a été inventé — l&apos;identifiant et
          l&apos;email viennent de ta session.
        </div>
      )}

      <h2>Ton profil</h2>
      <table>
        <thead>
          <tr>
            <th>Donnée</th>
            <th>Valeur</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Identifiant</td>
            <td>
              <code>{utilisateur.id}</code>
            </td>
          </tr>
          <tr>
            <td>Adresse email</td>
            <td>
              {utilisateur.email}{' '}
              <span className="carte-detail">(modifiable seulement par email, pas encore branché)</span>
            </td>
          </tr>
          <tr>
            <td>Compte créé le</td>
            <td>{createsLe}</td>
          </tr>
          <tr>
            <td>Plan</td>
            <td>
              <strong>{libellePlan(profil?.plan ?? 'gratuit')}</strong>{' '}
              <span className="carte-detail">
                {profil
                  ? `${formaterPrix(TARIFS[profil.plan].prix)}${PERIODE} — ${quotaDuPlan(profil.plan)} rendus par mois`
                  : ''}
              </span>
            </td>
          </tr>
          <tr>
            <td>Rendus restants ce mois-ci</td>
            <td>{profil ? `${profil.quotaRestant} sur ${quotaDuPlan(profil.plan)}` : '—'}</td>
          </tr>
          <tr>
            <td>Consommation ({mois})</td>
            <td>
              {usage
                ? `${usage.nombreRendus} rendu(s), ${usage.minutesGenerees} minute(s)`
                : 'aucun rendu ce mois-ci'}
            </td>
          </tr>
          <tr>
            <td>Projets</td>
            <td>
              {projets.length} — <Link href="/projets">voir la bibliothèque</Link>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Changer ton nom</h2>
      <FormulaireNom nomInitial={profil?.nom ?? ''} />

      <h2>Ton identité visuelle</h2>
      <p className="sous-titre">
        Logo, couleurs et police : <Link href="/kit-marque">kit de marque</Link>.
      </p>

      <h2>Session</h2>
      <form action={seDeconnecter}>
        <button type="submit" className="bouton-secondaire">
          Se déconnecter
        </button>
      </form>

      <div className="note">
        <strong>Ce qui n&apos;est pas là :</strong> la suppression du compte et le changement
        d&apos;adresse email demandent un envoi d&apos;email et une confirmation. Je ne les ai pas
        branchés — plutôt que d&apos;afficher un bouton qui ne ferait rien, ils sont absents.
      </div>
    </>
  )
}
