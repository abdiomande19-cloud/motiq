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
    etat: 'en_cours',
    detail:
      'Socle applicatif livré (démarre en local, écrans intégrés, couche de données branchée). Reste : Supabase — comptes, tables, RLS, stockage.',
  },
  {
    num: 3,
    titre: 'Front-end PWA',
    etat: 'en_cours',
    detail: 'Coquille de navigation et galerie en place. Reste : PWA installable, écrans reliés aux données.',
  },
  {
    num: 4,
    titre: 'Moteur motion design',
    etat: 'bloque',
    detail: 'Attend : clé Anthropic (script et scènes), service de transcription, worker de rendu Remotion.',
  },
  {
    num: 5,
    titre: 'Abonnements',
    etat: 'bloque',
    detail: 'Attend : clés Stripe (secrète, publique, webhook) et identification des prix Pro et Business.',
  },
  {
    num: 6,
    titre: 'Finition et soumission',
    etat: 'bloque',
    detail: 'Après les phases précédentes. Test du parcours complet sur mobile et ordinateur.',
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
