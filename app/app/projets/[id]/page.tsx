import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { creerClientServeur } from '@/lib/supabase/server'
import { obtenirDepotPourJeton } from '@/lib/data'
import { lienSigne } from '@/lib/fichiers'
import EditeurScenes from './editeur-scenes'
import ChoixTemplate from './choix-template'
import ApparenceProjet from './apparence'
import ImagesProjet from './images'
import EntreePieces from './entree'
import Apercu from './apercu'
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

  // Chaque image aussi : le bucket est prive, donc une adresse signee par image.
  const images = await Promise.all(
    assets.map(async (asset) => ({
      id: asset.id,
      nom: asset.chemin.split('/').pop() ?? 'image',
      poids: asset.tailleOctets ? `${Math.max(1, Math.round(asset.tailleOctets / 1024))} Ko` : '—',
      lien: await lienSigne(asset.chemin),
    })),
  )

  // Les videos terminees : un lien signe par rendu, valable une heure.
  // Le stockage est prive — sans lien signe, le navigateur recevrait un refus,
  // et l'utilisateur croirait sa video perdue.
  const liensVideo = new Map<string, string>()
  await Promise.all(
    rendus
      .filter((r) => r.statut === 'termine')
      .map(async (r) => {
        const url = await depot.lienVideo(session.user.id, r.id)
        if (url) liensVideo.set(r.id, url)
      }),
  )

  const script = projet.script
  const scenesTotal = script?.scenes.length ?? 0
  const duree = script?.dureeTotaleSecondes ?? 0
  const pret = Boolean(script && projet.templateId)

  // Guide « prochaine etape ».
  //
  // Constat d'usage reel : un projet cree restait a l'etat de brouillon, vide,
  // parce que rien n'indiquait quoi faire ensuite. Ce bloc repond a la seule
  // question qui compte a l'arrivee sur la page.
  const etapes = [
    {
      fait: Boolean(script),
      texte: 'Écris ton script, scène par scène',
      ancre: '#etape-1',
      requise: true,
    },
    {
      fait: Boolean(projet.templateId),
      texte: 'Choisis un template',
      ancre: '#etape-2',
      requise: true,
    },
    {
      fait: Boolean(projet.apparence),
      texte: 'Ajuste les couleurs, la police et la musique',
      ancre: '#etape-3',
      requise: false,
    },
    {
      fait: images.length > 0,
      texte: 'Ajoute tes images',
      ancre: '#etape-4',
      requise: projet.entreeSource === 'images',
    },
    {
      fait: rendus.length > 0,
      texte: 'Lance la génération',
      ancre: '#etape-6',
      requise: false,
    },
  ]
  const suivante = etapes.find((e) => e.requise && !e.fait) ?? etapes.find((e) => !e.fait)
  const faits = etapes.filter((e) => e.fait).length

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

      <div className={suivante ? 'note note-action' : 'note note-fini'}>
        {suivante ? (
          <>
            <strong>Prochaine étape :</strong> {suivante.texte} —{' '}
            <a href={suivante.ancre}>y aller tout de suite ↓</a>
            <div className="carte-detail">
              {faits} étape(s) sur {etapes.length} déjà faite(s) pour ce projet.
            </div>
          </>
        ) : (
          <>
            <strong>Tout est renseigné pour ce projet.</strong> Il ne manque que le moteur de
            rendu : la demande partira quand il sera branché.
          </>
        )}
      </div>

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

      <h2 id="etape-1">1. Le script, scène par scène</h2>
      <p className="sous-titre">
        Découpe ta vidéo en scènes. La durée totale doit tenir entre 15 et 60 secondes — la règle
        est vérifiée <strong>par le serveur</strong>, pas seulement affichée ici.
      </p>
      <EditeurScenes
        projetId={projet.id}
        titreInitial={script?.titre ?? projet.titre}
        scenesInitiales={script?.scenes ?? []}
      />

      <h2 id="etape-2">2. Le template</h2>
      <p className="sous-titre">
        {templates.length} templates disponibles, lus dans la table <code>templates</code> de la
        base. Format de sortie : vertical 9:16.
      </p>
      <ChoixTemplate
        projetId={projet.id}
        templates={templates}
        templateActuel={projet.templateId}
      />

      <h2 id="etape-3">3. L&apos;apparence</h2>
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

      <h2 id="etape-4">4. Les images</h2>
      <p className="sous-titre">
        Ajoute des visuels qui accompagneront tes scènes. Ils sont déposés dans le{' '}
        <strong>stockage privé</strong> : personne d&apos;autre que toi ne peut les voir.
      </p>
      <ImagesProjet projetId={projet.id} images={images} />

      <h2>4 bis. Tout ce que tu peux apporter</h2>
      <p className="sous-titre">
        Fichiers multiples (images, vidéos, <strong>PDF, Word, Excel</strong>, texte), note vocale et
        photo prise sur le moment. <strong>Motiq lit le contenu des documents</strong> pour comprendre
        ta demande — il ne se contente pas de les stocker.
      </p>
      <EntreePieces projetId={projet.id} />

      <h2 id="etape-5">5. L&apos;aperçu</h2>
      <p className="sous-titre">
        Regarde et écoute le rythme de ta vidéo avant de la lancer : le vrai texte de tes scènes,
        tes couleurs, ta police, et la transition de ton template.
      </p>
      <Apercu
        scenes={script?.scenes ?? []}
        apparence={projet.apparence}
        template={templates.find((t) => t.id === projet.templateId) ?? null}
        couleurParDefaut={kit?.couleurs ?? []}
      />

      <h2 id="etape-6">6. La génération</h2>
      <p className="sous-titre">
        Cette étape enregistre une demande dans la table <code>render_jobs</code>, puis le moteur de
        rendu fabrique la vidéo sur un service dédié et la dépose dans ton espace privé. Compte une
        à deux minutes pour une vidéo courte&nbsp;: le rendu encode réellement chaque image en
        1080&nbsp;×&nbsp;1920.
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
              <th>Vidéo</th>
              <th>Erreur</th>
            </tr>
          </thead>
          <tbody>
            {rendus.map((rendu) => (
              <tr key={rendu.id}>
                <td>{new Date(rendu.creeLe).toLocaleString('fr-FR')}</td>
                <td>{LIBELLE_RENDU[rendu.statut] ?? rendu.statut}</td>
                <td>{rendu.progression} %</td>
                <td>
                  {liensVideo.has(rendu.id) ? (
                    <a href={liensVideo.get(rendu.id)} className="bouton-mini" download>
                      Télécharger
                    </a>
                  ) : rendu.statut === 'termine' ? (
                    <span className="carte-detail">lien indisponible</span>
                  ) : (
                    <span className="carte-detail">—</span>
                  )}
                </td>
                <td>{rendu.erreur ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
