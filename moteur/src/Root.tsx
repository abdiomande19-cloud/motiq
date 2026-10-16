import { Composition } from 'remotion'
import { MotiqVideo } from './MotiqVideo'
import type { PlanVideo } from './types'

/**
 * Motiq — le moteur de rendu video (Remotion).
 *
 * Separe de l'application Next.js, et c'est volontaire : le cahier des charges
 * (10.1) impose que le rendu ne tourne NI dans le navigateur, NI sur Vercel.
 * Un rendu video consomme un processeur pendant des minutes ; le faire dans une
 * fonction serverless ferait exploser les limites et la facture.
 *
 * LA VIDEO EST UNE FONCTION DES DONNEES. Tout ce qui s'affiche vient des
 * proprietes passees au rendu (scenes, couleurs, police, template). Il n'y a
 * aucune valeur en dur dans le dessin : c'est ce qui permet de rendre n'importe
 * quel projet sans toucher au code.
 */

/** Format vertical 9:16 — TikTok, Reels, Shorts (cahier des charges 6.1). */
const LARGEUR = 1080
const HAUTEUR = 1920
const IMAGES_PAR_SECONDE = 30

const EXEMPLE: PlanVideo = {
  titre: 'Motiq',
  scenes: [
    { ordre: 1, texte: 'Une idée suffit.', dureeSecondes: 3 },
    { ordre: 2, texte: 'Motiq écrit le script.', dureeSecondes: 3 },
    { ordre: 3, texte: 'Et rend la vidéo.', dureeSecondes: 3 },
  ],
  template: 'Punch',
  apparence: { couleurs: ['#7C5CFF', '#0B0B12', '#FFFFFF'], police: 'Inter', musique: null },
  filigrane: false,
}

export const MotiqRoot: React.FC = () => {
  return (
    <Composition
      id="Motiq"
      component={MotiqVideo}
      // Valeur de repli : elle sera remplacee juste en dessous par la duree
      // reelle du projet. On ne peut pas la calculer ici, car ce composant est
      // evalue avant que les donnees du client soient connues.
      durationInFrames={Math.round(
        EXEMPLE.scenes.reduce((somme, s) => somme + s.dureeSecondes, 0) * IMAGES_PAR_SECONDE,
      )}
      fps={IMAGES_PAR_SECONDE}
      width={LARGEUR}
      height={HAUTEUR}
      defaultProps={EXEMPLE}
      /**
       * LA DUREE SUIT LE PROJET, PAS UNE CONSTANTE.
       *
       * Sans ce calcul, la duree resterait figee sur celle de l'exemple (9 s) :
       * un projet de 20 s sortirait TRONQUE a 9 s, et personne ne s'en
       * apercevrait avant de visionner. C'est exactement le genre de defaut
       * qu'on ne voit qu'apres avoir livre.
       *
       * Le total est recalcule a partir des scenes recues, jamais repris d'un
       * champ « dureeTotale » : si les deux divergeaient, c'est la somme des
       * scenes qui dit la verite, puisque ce sont elles qui sont dessinees.
       */
      calculateMetadata={({ props }) => {
        const total = (props.scenes ?? []).reduce(
          (somme, s) => somme + Number(s.dureeSecondes ?? 0),
          0,
        )
        return { durationInFrames: Math.max(1, Math.round(total * IMAGES_PAR_SECONDE)) }
      }}
    />
  )
}
