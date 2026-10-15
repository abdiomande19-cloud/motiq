import type { Metadata } from 'next'

/**
 * Page d'état du socle : ce qui est fait, ce qui reste, ce qui bloque.
 *
 * Elle est écrite à la main parce qu'elle raconte un état VERIFIÉ, pas une
 * mesure automatique. Chaque phase renvoie au chapitre 14 du cahier des charges.
 */

export const metadata: Metadata = {
  title: 'Motiq — état du socle',
}

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
    titre: 'Finition et installation',
    etat: 'en_cours',
    detail:
      'Reste : application installable (PWA), reprise visuelle des écrans validés de la phase 1 (accueil visiteur, création guidée, aperçu, export, kit de marque, abonnement, réglages) et essai du parcours complet.',
  },
  {
    num: 6,
    titre: 'Moteur motion design',
    etat: 'bloque',
    detail: 'Attend : clé Anthropic (script et scènes), service de transcription, worker de rendu Remotion.',
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

export default function PageEtat() {
  return (
    <>
      <h1>État du socle</h1>
      <p className="sous-titre">
        Avancement réel, dans l&apos;ordre du chapitre 14 du cahier des charges. Une phase n&apos;est
        marquée « fait » que si ses critères d&apos;acceptation ont été vérifiés par une exécution.
      </p>

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
