import type { Metadata } from 'next'
import { depot } from '@/lib/data'

/**
 * Page d'état du socle : ce qui est fait, ce qui reste, ce qui bloque.
 *
 * Elle est écrite à la main parce qu'elle raconte un état VERIFIÉ, pas une
 * mesure automatique. Chaque phase renvoie au chapitre 14 du cahier des charges.
 * Le premier tableau, lui, est lu en direct dans la base : impossible de le
 * falsifier sans changer les données.
 */

export const metadata: Metadata = {
  title: 'Motiq — état du socle',
}

export const dynamic = 'force-dynamic'

/** Identifiant bien formé mais inexistant : la lecture doit rendre 0 ligne. */
const UTILISATEUR_INEXISTANT = '00000000-0000-0000-0000-000000000000'

const PHASES: { num: number; titre: string; etat: 'fait' | 'en_cours' | 'bloque'; detail: string }[] = [
  {
    num: 1,
    titre: 'Cadrage et maquettes',
    etat: 'fait',
    detail: '13 écrans validés par le client, design system liquid glass, index de navigation.',
  },
  {
    num: 2,
    titre: 'Fondations back-end',
    etat: 'fait',
    detail:
      'Supabase relié (projet motiq, Europe de l\'Ouest) : 8 tables, RLS active sur les 8 avec 18 politiques, bucket de stockage privé, 5 déclencheurs. Dépôt Supabase implémenté : les 24 méthodes du contrat. Vérifié : avec la clé publique, 0 ligne visible et écriture refusée.',
  },
  {
    num: 3,
    titre: 'Comptes et session',
    etat: 'fait',
    detail:
      'Inscription, connexion, déconnexion. Session par cookies httpOnly, rafraîchie à chaque requête. Routes privées protégées et redirection avec mémorisation de la page visée. Profil créé automatiquement à l\'inscription. Vérifié : entre deux comptes réels, aucun ne voit ni ne modifie les données de l\'autre (403 sur l\'usurpation).',
  },
  {
    num: 4,
    titre: 'Parcours projet',
    etat: 'fait',
    detail:
      'Bibliothèque de projets (créer, ouvrir, dupliquer, supprimer) et fiche projet complète : script découpé en scènes avec durées, choix parmi les 8 templates, demande de rendu. Les règles métier (durée de 15 à 60 s, au moins une scène, template existant) sont appliquées PAR LA BASE, pas seulement par l\u2019écran — vérifié en écrivant directement par l\u2019API, hors interface.',
  },
  {
    num: 5,
    titre: 'Personnalisation et installation',
    etat: 'fait',
    detail:
      'Application installable (manifeste, icônes 192/512 px dont maskable, service worker, bouton d\u2019installation). Kit de marque : logo, 2 ou 3 couleurs, police, avec aperçu réel. Apparence par projet : couleurs, police et musique, héritées du kit de marque et modifiables projet par projet. Le stockage est privé : logo et musique se lisent par un lien signé d\u2019une heure. Vérifié : un autre compte ne peut ni déposer ni lire dans ton dossier.',
  },
  {
    num: 6,
    titre: 'Moteur motion design',
    etat: 'bloque',
    detail:
      'Attend : une clé d\u2019IA pour écrire le script depuis une idée (décision du donneur d\u2019ordre : sans pour l\u2019instant, le service est payant), un service de transcription, et un moteur de rendu vidéo.',
  },
  {
    num: 7,
    titre: 'Abonnements',
    etat: 'bloque',
    detail: 'Attend : clés Stripe (secrète, publique, webhook) et identification des prix Pro et Business.',
  },
]

const LIBELLE: Record<'fait' | 'en_cours' | 'bloque', string> = {
  fait: '✅ fait',
  en_cours: '🟡 en cours',
  bloque: '⛔ bloqué',
}

export default async function PageEtat() {
  // Lu en direct dans la base : ce tableau ne peut pas être falsifié à la main.
  const [templates, projets, profil] = await Promise.all([
    depot.listerTemplates(),
    depot.listerProjets(UTILISATEUR_INEXISTANT),
    depot.obtenirProfil(UTILISATEUR_INEXISTANT),
  ])

  return (
    <>
      <h1>État du socle</h1>
      <p className="sous-titre">
        Avancement réel, dans l&apos;ordre du chapitre 14 du cahier des charges. Une phase n&apos;est
        marquée « fait » que si ses critères d&apos;acceptation ont été vérifiés par une exécution.
      </p>

      <h2>La couche de données répond</h2>
      <table>
        <thead>
          <tr>
            <th>Élément</th>
            <th>Valeur lue en direct dans la base</th>
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
            <td>{projets.length} — l&apos;utilisateur inexistant ne voit rien, c&apos;est voulu</td>
          </tr>
          <tr>
            <td>Profil de test</td>
            <td>{profil ? profil.email : 'aucun (normal : pas de session)'}</td>
          </tr>
        </tbody>
      </table>

      <h2>Les phases</h2>
      <table>
        <thead>
          <tr>
            <th>Phase</th>
            <th>Titre</th>
            <th>État</th>
          </tr>
        </thead>
        <tbody>
          {PHASES.map((phase) => (
            <tr key={phase.num}>
              <td>{phase.num}</td>
              <td>
                <strong>{phase.titre}</strong>
                <div className="carte-detail">{phase.detail}</div>
              </td>
              <td>{LIBELLE[phase.etat]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Ce qui bloque, et qui peut le débloquer</h2>
      <table>
        <thead>
          <tr>
            <th>Ce qu&apos;il faut</th>
            <th>Pour quelle phase</th>
            <th>Qui</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Jeton Supabase (jeton personnel)</td>
            <td>Phase 2</td>
            <td>Le donneur d&apos;ordre</td>
          </tr>
          <tr>
            <td>URL et clés du projet Supabase</td>
            <td>Phase 2</td>
            <td>Le donneur d&apos;ordre</td>
          </tr>
          <tr>
            <td>Clé Anthropic + service de transcription</td>
            <td>Phase 4</td>
            <td>Le donneur d&apos;ordre</td>
          </tr>
          <tr>
            <td>Worker de rendu Remotion (URL et jeton)</td>
            <td>Phase 4</td>
            <td>Décision d&apos;architecture à prendre</td>
          </tr>
          <tr>
            <td>Clés Stripe et prix des plans</td>
            <td>Phase 5</td>
            <td>Le donneur d&apos;ordre</td>
          </tr>
        </tbody>
      </table>

      <div className="note">
        <strong>Règle appliquée :</strong> aucune valeur inventée, aucune fonctionnalité simulée. Ce
        qui n&apos;est pas branché est écrit comme tel.
      </div>
    </>
  )
}
