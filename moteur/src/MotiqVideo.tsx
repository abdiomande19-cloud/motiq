import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion'
import type { PlanVideo, Scene } from './types'

/**
 * Motiq — le dessin d'une video.
 *
 * TOUT VIENT DES PROPRIETES. Aucune couleur, aucun texte, aucune duree n'est
 * ecrite ici : le moteur ne connait que la forme, jamais le contenu. C'est ce
 * qui permet de rendre n'importe quel projet sans modifier ce fichier.
 *
 * LE TEMPLATE CHANGE LE MOUVEMENT, PAS LE CONTENU. Les huit templates du
 * catalogue se distinguent par leur facon d'entrer et de sortir : une coupe,
 * un glissement, un zoom, un fondu. Le meme script rend donc huit videos
 * differentes.
 */

interface Animation {
  /** Comment la scene entre. */
  entree: 'zoom' | 'glissement' | 'fondu' | 'montee' | 'rotation'
  /** Comment elle sort. */
  sortie: 'fondu' | 'glissement' | 'zoom'
  /** Position du texte. */
  position: 'centre' | 'bas' | 'haut'
  /** Graisse de la police. */
  graisse: number
  /** Interlettrage. */
  espacement: number
}

const ANIMATIONS: Record<string, Animation> = {
  Punch: { entree: 'zoom', sortie: 'fondu', position: 'centre', graisse: 900, espacement: -2 },
  Slide: { entree: 'glissement', sortie: 'glissement', position: 'centre', graisse: 800, espacement: -1 },
  Pulse: { entree: 'fondu', sortie: 'fondu', position: 'centre', graisse: 700, espacement: 0 },
  Clair: { entree: 'fondu', sortie: 'fondu', position: 'centre', graisse: 500, espacement: 0 },
  Audace: { entree: 'zoom', sortie: 'zoom', position: 'centre', graisse: 900, espacement: -3 },
  Narration: { entree: 'montee', sortie: 'fondu', position: 'bas', graisse: 600, espacement: 0 },
  Affiche: { entree: 'fondu', sortie: 'fondu', position: 'haut', graisse: 800, espacement: 2 },
  Energie: { entree: 'rotation', sortie: 'zoom', position: 'centre', graisse: 900, espacement: -2 },
}

const DEFAUT: Animation = ANIMATIONS.Punch

export const MotiqVideo: React.FC<PlanVideo> = ({ scenes, apparence, template, filigrane }) => {
  const accent = apparence.couleurs[0] ?? '#7C5CFF'
  const fond = apparence.couleurs[1] ?? '#0B0B12'
  const encre = apparence.couleurs[2] ?? '#FFFFFF'

  // Le `from` de chaque scene est CUMULE : la scene 3 commence apres la 1 et
  // la 2. Les calculer independamment les ferait toutes demarrer ensemble.
  let curseur = 0

  return (
    <AbsoluteFill style={{ backgroundColor: fond, fontFamily: apparence.police }}>
      {/* Halo d'accent : donne de la profondeur sans image. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 35%, ${accent}33, transparent 62%)`,
        }}
      />

      {scenes.map((scene) => {
        const dureeImages = Math.round(scene.dureeSecondes * 30)
        const depuis = curseur
        curseur += dureeImages
        return (
          <Sequence key={scene.ordre} from={depuis} durationInFrames={dureeImages}>
            <SceneDessinee
              scene={scene}
              animation={ANIMATIONS[template] ?? DEFAUT}
              accent={accent}
              encre={encre}
              dureeImages={dureeImages}
            />
          </Sequence>
        )
      })}

      {filigrane && <Filigrane accent={accent} encre={encre} />}
    </AbsoluteFill>
  )
}

const SceneDessinee: React.FC<{
  scene: Scene
  animation: Animation
  accent: string
  encre: string
  dureeImages: number
}> = ({ scene, animation, accent, encre, dureeImages }) => {
  const image = useCurrentFrame()
  const { fps } = useVideoConfig()

  const entree = Math.min(dureeImages * 0.28, fps * 0.8)
  const sortie = Math.min(dureeImages * 0.22, fps * 0.6)

  // Progression 0 -> 1 sur l'entree, puis 1 -> 0 sur la sortie.
  const arrivee = interpolate(image, [0, entree], [0, 1], { extrapolateRight: 'clamp' })
  const depart = interpolate(image, [dureeImages - sortie, dureeImages], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const presence = arrivee * depart

  const style: React.CSSProperties = {
    justifyContent:
      animation.position === 'haut' ? 'flex-start' : animation.position === 'bas' ? 'flex-end' : 'center',
    alignItems: 'center',
    padding: animation.position === 'centre' ? '0 96px' : '180px 96px',
    textAlign: 'center',
  }

  switch (animation.entree) {
    case 'zoom':
      style.transform = `scale(${interpolate(presence, [0, 1], [1.35, 1])})`
      style.opacity = presence
      break
    case 'glissement':
      style.transform = `translateX(${interpolate(presence, [0, 1], [220, 0])}px)`
      style.opacity = presence
      break
    case 'montee':
      style.transform = `translateY(${interpolate(presence, [0, 1], [140, 0])}px)`
      style.opacity = presence
      break
    case 'rotation':
      style.transform = `rotate(${interpolate(presence, [0, 1], [-9, 0])}deg) scale(${interpolate(
        presence,
        [0, 1],
        [1.2, 1],
      )})`
      style.opacity = presence
      break
    default:
      style.opacity = presence
  }

  // Le texte grandit legerement pendant toute la scene : sans ce mouvement
  // continu, une scene de 5 secondes parait figee, comme un diaporama.
  const respiration = interpolate(image, [0, dureeImages], [1, 1.04])

  return (
    <AbsoluteFill style={style}>
      <div
        style={{
          fontSize: 92,
          lineHeight: 1.12,
          fontWeight: animation.graisse,
          letterSpacing: animation.espacement,
          color: encre,
          textShadow: `0 0 60px ${accent}55`,
          transform: `scale(${respiration})`,
          maxWidth: 900,
        }}
      >
        {scene.texte}
      </div>
    </AbsoluteFill>
  )
}

const Filigrane: React.FC<{ accent: string; encre: string }> = ({ accent, encre }) => (
  <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 64 }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity: 0.85,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: accent }} />
      <span style={{ fontSize: 34, fontWeight: 600, color: encre, letterSpacing: 1 }}>Motiq</span>
    </div>
  </AbsoluteFill>
)
