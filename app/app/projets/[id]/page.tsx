import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { creerClientServeur } from '@/lib/supabase/server'
import { obtenirDepotPourJeton } from '@/lib/data'
import { lienSigne } from '@/lib/fichiers'
import EditeurScenes from './editeur-scenes'
import ChoixTemplate from './choix-template'
import ApparenceProjet from './apparence'
import BoutonGeneration from './bouton-generation'

export const metadata: Metadata = {
  title: 'Motiq — un projet',
}

export const dynamic = 'force-dynamic'

const LIBELLE_STATUT: Record<string, string> = {
  brouillon: 'Brouillon',
  script_valide: 'Script validé',
  en_generation: 'En génération',
  pret: 'Prêt',
  echec: 'Échec',
}

const LIBELLE_RENDU: Record<string, string> = {
  en_attente: '⏳ en attente',
  en_cours: '🔄 en cours',
  termine: '✅ terminé',
  echec: '⛔ échec',
}

/** Next 16 : `params` est asynchrone et doit etre attendu. */
export default async function PageProjet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await creerClientServeur()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/connexion')

  const depot = obtenirDepotPourJeton(session.access_token)

  const [projet, templates] = await Promise.all([
    depot.obtenirProjet(session.user.id, id),
    depot.listerTemplates(),
  ])

  // Si le projet appartient a quelqu'un d'autre, RLS ne le rend PAS : pour nous
  // il n'existe pas. On ne revele pas son existence.
  if (!projet) notFound()

  const [assets, rendus, kit] = await Promise.all([
    depot.listerAssets(session.user.id, id),
    depot.listerRendus(session.user.id, id),
    depot.obtenirKitMarque(session.user.id),
  ])

  // La musique est dans un bucket prive : on fabrique un lien signe pour la lire.
  const lienMusique = await lienSigne(projet.apparence?.musique ?? null)

  const script = projet.script
  const scenesTotal = script?.scenes.length ?? 0
  const duree = script?.dureeTotaleSecondes ?? 0
  const pret = Boolean(script && projet.templateId)

  return (
    <>
      <p className="fil">
        <Link href="/projets">← Mes projets</Link>
      </p>

      <div className="entete-page">
        <div>
          <h1>{projet.titre}</h1>
          <p className="sous-titre">
            {LIBELLE_STATUT[projet.statut] ?? projet.statut} · entrée « {projet.entreeSource} » ·
            créé le {new Date(projet.creeLe).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>

      {projet.idee && (
        <div className="note">
          <strong>Ton idée de départ :</strong> {projet.idee}
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Étape</th>
            <th>État réel, lu dans la base</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Script</td>
            <td>
              {script
                ? `${scenesTotal} scène(s), ${duree} s — titre : « ${script.titre} »`
                : 'pas encore écrit'}
            </td>
          </tr>
          <tr>
            <td>Template</td>
            <td>
              {projet.templateId
                ? (templates.find((t) => t.id === projet.templateId)?.nom ?? projet.templateId)
                : 'pas encore choisi'}
            </td>
          </tr>
          <tr>
            <td>Médias</td>
            <td>{assets.length} fichier(s)</td>
          </tr>
        </tbody>
      </table>

      <h2>1. Le script, scène par scène</h2>
      <p className="sous-titre">
        Découpe ta vidéo en scènes. La durée totale doit tenir entre 15 et 60 secondes — la règle
        est vérifiée <strong>par le serveur</strong>, pas seulement affichée ici.
      </p>
      <EditeurScenes
        projetId={projet.id}
        titreInitial={script?.titre ?? projet.titre}
        scenesInitiales={script?.scenes ?? []}
      />

      <h2>2. Le template</h2>
      <p className="sous-titre">
        {templates.length} templates disponibles, lus dans la table <code>templates</code> de la
        base. Format de sortie : vertical 9:16.
      </p>
      <ChoixTemplate
        projetId={projet.id}
        templates={templates}
        templateActuel={projet.templateId}
      />

      <h2>3. L&apos;apparence</h2>
      <p className="sous-titre">
        Couleurs, police et musique. Par défaut, on te propose celles de ton{' '}
        <Link href="/kit-marque">kit de marque</Link> ; tu peux les changer pour ce projet
        seulement.
      </p>
      <ApparenceProjet
        projetId={projet.id}
        apparence={projet.apparence}
        couleursDuKit={kit?.couleurs ?? []}
        texteApercu={script?.scenes[0]?.texte || projet.titre}
        lienMusique={lienMusique}
      />

      <h2>4. La génération</h2>
      <p className="sous-titre">
        Cette étape enregistre une demande réelle dans la table <code>render_jobs</code>.{' '}
        <strong>Le worker de rendu n&apos;est pas encore branché</strong> — il attend la phase 5
        (clé Anthropic + moteur de rendu). La demande restera donc « en attente » : c&apos;est
        écrit tel quel, rien n&apos;est simulé.
      </p>
      <BoutonGeneration
        projetId={projet.id}
        pret={pret}
        raison={
          !script
            ? "Écris et enregistre d'abord le script."
            : !projet.templateId
              ? "Choisis d'abord un template."
              : ''
        }
      />

      <h2>Les demandes de rendu de ce projet</h2>
      {rendus.length === 0 ? (
        <div className="note">
          Aucune demande de rendu pour l&apos;instant. C&apos;est normal tant que le script et le
          template ne sont pas choisis.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Demandé le</th>
              <th>Statut</th>
              <th>Progression</th>
              <th>Erreur</th>
            </tr>
          </thead>
          <tbody>
            {rendus.map((rendu) => (
              <tr key={rendu.id}>
                <td>{new Date(rendu.creeLe).toLocaleString('fr-FR')}</td>
                <td>{LIBELLE_RENDU[rendu.statut] ?? rendu.statut}</td>
                <td>{rendu.progression} %</td>
                <td>{rendu.erreur ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
