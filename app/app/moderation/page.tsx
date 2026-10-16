import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { creerClientServeur } from '@/lib/supabase/server'
import { obtenirDepotPourJeton } from '@/lib/data'
import { masquerAvis, retablirAvis } from './actions'

export const metadata: Metadata = {
  title: 'Motiq — modération des avis',
}

export const dynamic = 'force-dynamic'

/**
 * Motiq — moderer les avis.
 *
 * Reserve aux profils marques `est_moderateur` en base. La page verifie ce
 * droit pour eviter d'afficher un ecran inutile, mais CE N'EST PAS ELLE QUI
 * PROTEGE : la politique RLS refuse la modification a quiconque n'est pas
 * moderateur, meme en appelant l'API directement.
 */
export default async function PageModeration({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>
}) {
  const { erreur } = await searchParams

  const supabase = await creerClientServeur()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/connexion?suite=' + encodeURIComponent('/moderation'))

  const depot = obtenirDepotPourJeton(session.access_token)
  const profil = await depot.obtenirProfil(session.user.id)

  if (!profil?.estModerateur) {
    return (
      <>
        <h1>Modération</h1>
        <div className="message message-erreur" role="alert">
          <strong>Cette page est réservée à la modération.</strong> Ton compte n&apos;a pas ce rôle.
          Il se donne en base, sur une décision explicite — jamais en s&apos;inscrivant.
        </div>
        <p>
          <Link href="/">← Retour à l&apos;accueil</Link>
        </p>
      </>
    )
  }

  const avis = await depot.listerTousLesAvis(session.user.id)
  const publies = avis.filter((a) => a.statut === 'publie')
  const masques = avis.filter((a) => a.statut !== 'publie')

  return (
    <>
      <h1>Modération des avis</h1>
      <p className="sous-titre">
        {avis.length} avis au total — {publies.length} en ligne, {masques.length} masqué(s).
      </p>

      {erreur && (
        <div className="message message-erreur" role="alert">
          {erreur}
        </div>
      )}

      <div className="note">
        <strong>Ce que fait le masquage.</strong> L&apos;avis disparaît de la page publique, mais
        reste lisible par son auteur — qui est prévenu du motif et peut le corriger. Un avis masqué
        n&apos;est ni supprimé ni modifié : la décision reste réversible.
      </div>

      <h2>En ligne ({publies.length})</h2>
      {publies.length === 0 ? (
        <div className="note">Aucun avis publié pour l&apos;instant.</div>
      ) : (
        <div className="avis-liste">
          {publies.map((a) => (
            <article className="avis" key={a.id}>
              <div className="avis-entete">
                <span className="etoiles" style={{ color: '#F5B301' }}>
                  {'★'.repeat(a.note)}
                </span>
                <span className="carte-detail">note {a.note}/5</span>
                <span className="carte-detail">
                  {new Date(a.creeLe).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <p className="avis-texte">{a.commentaire}</p>
              <form action={masquerAvis} style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input type="hidden" name="avisId" value={a.id} />
                <input
                  type="text"
                  name="motif"
                  placeholder="Motif (ex. propos injurieux)"
                  style={{ flex: '1 1 220px' }}
                />
                <button type="submit" className="bouton-mini bouton-danger-leger">
                  Masquer
                </button>
              </form>
            </article>
          ))}
        </div>
      )}

      <h2>Masqués ({masques.length})</h2>
      {masques.length === 0 ? (
        <div className="note">Aucun avis masqué.</div>
      ) : (
        <div className="avis-liste">
          {masques.map((a) => (
            <article className="avis" key={a.id} style={{ opacity: 0.7 }}>
              <div className="avis-entete">
                <span className="carte-detail">note {a.note}/5</span>
                <span className="carte-detail">statut : {a.statut}</span>
                {a.motifMasquage && <span className="carte-detail">motif : {a.motifMasquage}</span>}
              </div>
              <p className="avis-texte">{a.commentaire}</p>
              <form action={retablirAvis} style={{ marginTop: 10 }}>
                <input type="hidden" name="avisId" value={a.id} />
                <button type="submit" className="bouton-mini">
                  Remettre en ligne
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
