import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { creerClientServeur } from '@/lib/supabase/server'
import { obtenirDepotPourJeton } from '@/lib/data'
import { lienSigne } from '@/lib/fichiers'
import FormulaireKit from './formulaire'

export const metadata: Metadata = {
  title: 'Motiq — kit de marque',
}

export const dynamic = 'force-dynamic'

export default async function PageKitMarque() {
  const supabase = await creerClientServeur()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/connexion')

  const depot = obtenirDepotPourJeton(session.access_token)
  const kit = await depot.obtenirKitMarque(session.user.id)

  // Le bucket est prive : on fabrique une adresse signee, valable une heure.
  // Un logo ne se lit donc jamais par une adresse devinable.
  const lien = await lienSigne(kit?.logo ?? null)

  return (
    <>
      <h1>Kit de marque</h1>
      <p className="sous-titre">
        Ton logo, tes couleurs et ta police. C&apos;est ce qui donnera à tes vidéos une
        identité reconnaissable, sans que tu aies à la refaire chaque fois.
      </p>

      <table>
        <thead>
          <tr>
            <th>Ce que dit la base</th>
            <th>Valeur lue sous ton identité</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Kit existant</td>
            <td>{kit ? 'oui' : 'aucun — il sera créé au premier enregistrement'}</td>
          </tr>
          <tr>
            <td>Couleurs</td>
            <td>
              {kit && kit.couleurs.length > 0 ? (
                <span className="kit-pastilles">
                  {kit.couleurs.map((c) => (
                    <span key={c} className="kit-pastille" style={{ background: c }} title={c} />
                  ))}
                  <code>{kit.couleurs.join(' ')}</code>
                </span>
              ) : (
                'aucune'
              )}
            </td>
          </tr>
          <tr>
            <td>Emplacement du logo</td>
            <td>
              {kit?.logo ? (
                <code>{kit.logo.split('/').slice(0, 2).join('/')}/…</code>
              ) : (
                'aucun logo déposé'
              )}
            </td>
          </tr>
          <tr>
            <td>Adresse de lecture</td>
            <td>
              {lien
                ? 'lien signé, valable 1 heure (bucket privé)'
                : 'aucune (pas de logo, ou lien refusé)'}
            </td>
          </tr>
        </tbody>
      </table>

      <FormulaireKit
        couleursInitiales={kit?.couleurs ?? []}
        policeInitiale={kit?.police ?? 'Inter'}
        lienLogo={lien}
      />

      <div className="note">
        <strong>Pourquoi ton logo n&apos;a pas d&apos;adresse publique :</strong> le stockage est
        privé. La politique du bucket exige que le chemin commence par ton identifiant — un autre
        compte ne peut donc ni lire ni déposer dans ton dossier, même s&apos;il connaissait le nom
        du fichier.
      </div>
    </>
  )
}
