import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { creerClientServeur } from '@/lib/supabase/server'
import { obtenirDepotPourJeton } from '@/lib/data'
import { formaterPrix, PERIODE, quotaDuPlan, TARIFS } from '@/lib/tarifs'
import { demarrerAbonnement } from './actions'

export const metadata: Metadata = {
  title: 'Motiq — abonnement',
}

/** Page privee : rendue a la demande, avec la session de l'utilisateur. */
export const dynamic = 'force-dynamic'

/**
 * Motiq — choisir un plan.
 *
 * Les prix et les quotas viennent de lib/tarifs.ts : ils ne sont pas recopies
 * ici. Un tarif modifie a un seul endroit se propage partout.
 */
export default async function PageAbonnement({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; ok?: string }>
}) {
  const { erreur, ok } = await searchParams

  const supabase = await creerClientServeur()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/connexion?suite=' + encodeURIComponent('/abonnement'))

  const depot = obtenirDepotPourJeton(session.access_token)
  const profil = await depot.obtenirProfil(session.user.id)
  const abonnement = await depot.obtenirAbonnement(session.user.id)

  const modeTest = (process.env.PAYSTACK_SECRET_KEY ?? '').startsWith('sk_test_')

  const offres = [
    {
      plan: 'gratuit' as const,
      avantages: ['Quelques vidéos par mois', 'Qualité standard', 'Filigrane Motiq'],
      exclus: ['Kit de marque', 'Export sans filigrane', 'Rendu prioritaire'],
    },
    {
      plan: 'pro' as const,
      avantages: [
        'Exports HD sans filigrane',
        'Kit de marque (logo, couleurs, police)',
        `${TARIFS.pro.quotaMensuel} rendus par mois`,
        'Bibliothèque de projets',
      ],
      exclus: ['Rendu prioritaire'],
      populaire: true,
    },
    {
      plan: 'business' as const,
      avantages: [
        'Haute qualité',
        'Rendu prioritaire',
        `${TARIFS.business.quotaMensuel} rendus par mois`,
      ],
      exclus: ['Espace équipe (version 2)'],
    },
  ]

  return (
    <>
      <h1>Abonnement</h1>
      <p className="sous-titre">
        Ton plan actuel : <strong>{profil ? TARIFS[profil.plan].nom : 'inconnu'}</strong>
        {profil ? ` — ${profil.quotaRestant} rendu(s) restant(s) sur ${quotaDuPlan(profil.plan)}` : ''}
      </p>

      {erreur && (
        <div className="message message-erreur" role="alert">
          <strong>Le paiement n&apos;a pas pu démarrer.</strong> {erreur}
        </div>
      )}

      {ok && (
        <div className="message message-succes" role="status">
          <strong>{ok}</strong>
        </div>
      )}

      {modeTest && (
        <div className="note">
          <strong>Mode test.</strong> Les clés en place sont des clés de test Paystack :{' '}
          <em>aucun franc réel ne circule</em>. Pour vérifier le circuit complet, utilise une carte
          de test — par exemple <code>4084 0840 8408 4081</code>, date future, CVV <code>408</code>,
          code <code>123456</code>.
        </div>
      )}

      <div className="cartes">
        {offres.map((offre) => {
          const tarif = TARIFS[offre.plan]
          const actuel = profil?.plan === offre.plan

          return (
            <div key={offre.plan} className={`carte${offre.populaire ? ' carte-mise-en-avant' : ''}`}>
              <div className="carte-titre">{tarif.nom}</div>
              <div className="carte-prix">
                {tarif.prix === 0 ? (
                  <strong>Toujours gratuit</strong>
                ) : (
                  <>
                    <strong>{formaterPrix(tarif.prix)}</strong>
                    <span className="carte-detail">{PERIODE}</span>
                  </>
                )}
              </div>
              <div className="carte-detail">{quotaDuPlan(offre.plan)} rendus par mois</div>

              <ul>
                {offre.avantages.map((a) => (
                  <li key={a}>{a}</li>
                ))}
                {offre.exclus.map((e) => (
                  <li key={e} className="exclu">
                    {e} — non inclus
                  </li>
                ))}
              </ul>

              {offre.plan === 'gratuit' ? (
                <p className="carte-detail">{actuel ? 'Ton plan actuel' : 'Inclus à l’inscription'}</p>
              ) : actuel ? (
                <p className="carte-detail">
                  <strong>Ton plan actuel.</strong>{' '}
                  {abonnement?.reference ? `Référence ${abonnement.reference.slice(0, 18)}…` : ''}
                </p>
              ) : (
                <form action={demarrerAbonnement}>
                  <input type="hidden" name="plan" value={offre.plan} />
                  <button type="submit" className={offre.populaire ? 'bouton-principal' : 'bouton-secondaire'}>
                    Choisir {tarif.nom}
                  </button>
                </form>
              )}
            </div>
          )
        })}
      </div>

      <div className="note">
        <strong>Ce que fait le bouton :</strong> il te conduit à la page de paiement Paystack, puis
        te ramène ici. <strong>Le plan ne change qu&apos;après vérification du paiement auprès de
        Paystack</strong> — jamais sur la foi de la page de retour, dont l&apos;adresse peut être
        modifiée à la main.
      </div>

      <p>
        <a href="/projets">← Retour à mes projets</a>
      </p>
    </>
  )
}
