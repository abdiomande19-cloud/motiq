import type { Scene } from './types'

/** Ce que le moteur recoit pour dessiner une video. */
export interface PlanVideo {
  titre: string
  scenes: Scene[]
  /** Nom du template : Punch, Slide, Pulse, Clair, Audace, Narration, Affiche, Energie. */
  template: string
  apparence: {
    /** 2 ou 3 couleurs : fond, accent, texte. */
    couleurs: string[]
    police: string
    musique: string | null
  }
  /** Filigrane Motiq — impose au plan gratuit (cahier des charges 11). */
  filigrane: boolean
}

export interface Scene {
  ordre: number
  texte: string
  dureeSecondes: number
}
