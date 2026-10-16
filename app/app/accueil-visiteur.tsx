import Link from 'next/link'
import { depot } from '@/lib/data'
import { formaterPrix, PERIODE, TARIFS } from '@/lib/tarifs'
import Apercu from './projets/[id]/apercu'

/**
 * Motiq — accueil visiteur (ecran 01 de la phase 1).
 *
 * Le texte reprend la maquette VALIDEE. Les tarifs affiches viennent de
 * lib/tarifs.ts, source unique : 4 900 F/mois pour Pro, 9 900 F/mois pour
 * Business, montants fixes par le donneur d'ordre. La maquette les annoncait
 * « a definir » ; c'est remplace, et l'application ne peut plus diverger des
 * maquettes sur ce point.
 *
 * La preuve technique du socle (lecture de la base, etat des phases) vit sur
 * /etat : ce n'est pas ce qu'un visiteur vient chercher.
 */

const ETAPES = [
  {
    titre: '1. Vous donnez la matière',
    texte: 'Texte, images ou note vocale. Aucun prompt à rédiger.',
  },
  {
    titre: '2. Motiq découpe',
    texte: 'Script en scènes, à valider ou corriger avant le rendu.',
  },
  {
    titre: '3. Vous ajustez et exportez',
    texte: 'Éditeur visuel, aperçu, puis MP4 pour TikTok, Reels ou Shorts.',
  },
]

/**
 * Scene de demonstration : c'est une maquette de texte, clairement annoncee
 * comme telle. Elle ne vient PAS de la base — aucun visiteur ne doit croire
 * qu'il regarde les donnees de quelqu'un.
 */
const SCENES_DEMO = [
  { ordre: 1, texte: 'Une idée suffit.', dureeSecondes: 3 },
  { ordre: 2, texte: 'Motiq écrit le script.', dureeSecondes: 3 },
  { ordre: 3, texte: 'Et rend la vidéo.', dureeSecondes: 3 },
]

interface Plan {
  nom: string
  badge: string
  prix: string
  precision: string
  avantages: string[]
  exclus: string[]
  action: string
  misEnAvant?: boolean
}

const PLANS: Plan[] = [
  {
    nom: 'Gratuit',
    badge: 'Toujours gratuit',
    prix: formaterPrix(TARIFS.gratuit.prix),
    precision: PERIODE,
    avantages: ['Quelques vidéos par mois', 'Qualité standard', 'Filigrane Motiq'],
    exclus: ['Kit de marque', 'Export sans filigrane'],
    action: 'Créer un compte',
  },
  {
    nom: 'Pro',
    badge: 'Populaire',
    prix: formaterPrix(TARIFS.pro.prix),
    precision: PERIODE,
    avantages: [
      'Exports HD sans filigrane',
      'Kit de marque (logo, couleurs, police)',
      'Plus de rendus par mois',
      'Bibliothèque de projets',
    ],
    exclus: ['Rendu prioritaire'],
    action: 'Choisir Pro',
    misEnAvant: true,
  },
  {
    nom: 'Business',
    badge: 'Meilleure qualité',
    prix: formaterPrix(TARIFS.business.prix),
    precision: PERIODE,
    avantages: ['Haute qualité', 'Rendu prioritaire', 'Quotas les plus élevés'],
    exclus: ['Espace équipe (version 2)'],
    action: 'Choisir Business',
  },
]

export default async function AccueilVisiteur() {
  // Lecture reelle : le nombre de styles affiche vient de la base, pas du code.
  const templates = await depot.listerTemplates()

  return (
    <>
      <section className="hero">
        <span className="badge-acc">MVP</span>
        <h1>
          Une idée.
          <br />
          Une photo.
          <br />
          <span className="degrade">Une vidéo prête à publier.</span>
        </h1>
        <p className="lead">
          Écrivez une phrase, importez des images ou enregistrez votre voix. Motiq écrit le script,
          découpe les scènes et rend une vidéo motion design verticale.
        </p>
        <div className="hero-actions">
          <Link href="/connexion" className="bouton-principal">
            Commencer gratuitement
          </Link>
          <a href="#tarifs" className="bouton-secondaire">
            Voir les tarifs
          </a>
        </div>
        <p className="carte-detail">
          15 à 60 secondes · format 9:16 · sous-titres animés · sans savoir écrire de prompt
        </p>
      </section>

      <section className="etapes-accueil">
        {ETAPES.map((etape) => (
          <div key={etape.titre} className="carte">
            <span className="carte-titre">{etape.titre}</span>
            <div className="carte-detail">{etape.texte}</div>
          </div>
        ))}
      </section>

      <div className="section-titre">
        <h2 id="apercu">Essaie l&apos;aperçu</h2>
        <span className="carte-detail">démonstration — aucune inscription nécessaire</span>
      </div>
      <p className="sous-titre">
        Voici ce que Motiq produit, et que tu pourras modifier : trois scènes, tes couleurs, ta
        police, et une transition. Cette démonstration utilise un texte d&apos;exemple, pas des
        données réelles.
      </p>
      <Apercu
        scenes={SCENES_DEMO}
        apparence={{ couleurs: ['#22d3c5', '#ff7a59'], police: 'Inter', musique: null }}
        template={{
          id: 'punch',
          nom: 'Punch',
          categorie: 'dynamique',
          format: '9:16',
          apercu: '',
          parametres: { transition: 'zoom' },
        }}
      />

      <div className="section-titre">
        <h2 id="tarifs">Tarifs</h2>
        <span className="carte-detail">quotas provisoires — à valider</span>
      </div>

      <div className="plans">
        {PLANS.map((plan) => (
          <div key={plan.nom} className={plan.misEnAvant ? 'plan plan-hi' : 'plan'}>
            <div className="plan-entete">
              <h3>{plan.nom}</h3>
              <span className={plan.misEnAvant ? 'badge-acc' : 'badge'}>{plan.badge}</span>
            </div>
            <div className="plan-prix">
              {plan.prix}
              <span className="carte-detail"> {plan.precision}</span>
            </div>
            <ul className="plan-liste">
              {plan.avantages.map((avantage) => (
                <li key={avantage}>{avantage}</li>
              ))}
              {plan.exclus.map((exclu) => (
                <li key={exclu} className="plan-exclu">
                  {exclu}
                </li>
              ))}
            </ul>
            <Link
              href="/connexion"
              className={plan.misEnAvant ? 'bouton-principal large' : 'bouton-secondaire large'}
            >
              {plan.action}
            </Link>
          </div>
        ))}
      </div>

      <div className="note">
        <strong>Pourquoi « à définir » et pas un prix :</strong> les tarifs de la maquette validée
        sont des emplacements. Fixer un prix demande de connaître le coût réel d&apos;un rendu et des
        appels d&apos;IA — et le paiement n&apos;est pas encore branché. Je préfère te laisser un
        emplacement vide qu&apos;un chiffre inventé.
      </div>

      <div className="section-titre">
        <h2>Ce qui est déjà là</h2>
      </div>
      <table>
        <thead>
          <tr>
            <th>Élément</th>
            <th>État vérifié</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Styles de vidéo</td>
            <td>
              <strong>{templates.length}</strong> disponibles — lus dans la base, prêts à
              l&apos;emploi
            </td>
          </tr>
          <tr>
            <td>Comptes</td>
            <td>Inscription et connexion, avec cloisonnement vérifié entre comptes</td>
          </tr>
          <tr>
            <td>Éditeur</td>
            <td>Script par scènes, couleurs, police, musique, images</td>
          </tr>
          <tr>
            <td>Installation</td>
            <td>Installable sur téléphone et ordinateur</td>
          </tr>
          <tr>
            <td>Génération vidéo</td>
            <td>
              Pas encore branchée — détail sur la <Link href="/etat">page état</Link>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="section-titre">
        <h2>Aller plus loin</h2>
      </div>
      <p className="sous-titre">
        Les 13 écrans validés en phase 1 sont servis tels quels :{' '}
        <Link href="/ecrans">voir la galerie</Link>. L&apos;avancement technique et ce qui reste à
        brancher : <Link href="/etat">page état</Link>.
      </p>
    </>
  )
}
