/**
 * Motiq — apercu anime du projet (composant client).
 *
 * CE QUE C'EST : une simulation fidele du rythme et du rendu — le VRAI texte
 * de tes scenes, TES couleurs, TA police, et la transition de TON template.
 *
 * CE QUE CE N'EST PAS : la video finale. Le rendu MP4 demande un moteur qui
 * n'est pas encore branche. C'est ecrit dans l'interface, pas cache.
 *
 * Les transitions reprennent les parametres des templates du catalogue :
 *   coupe (instantane), fondu (apparition), glissement, zoom.
 * `prefers-reduced-motion` est respecte : l'animation est desactivee si le
 * systeme le demande (comme dans les maquettes de la phase 1).
 */

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Apparence, Scene, Template } from '@/lib/data'

interface Props {
  scenes: Scene[]
  apparence: Apparence | null
  template: Template | null
  couleurParDefaut?: string[]
}

const COULEURS_DEFAUT = ['#22d3c5', '#ff7a59']

export default function Apercu({ scenes, apparence, template, couleurParDefaut = [] }: Props) {
  const couleurs = apparence?.couleurs ?? (couleurParDefaut.length >= 2 ? couleurParDefaut : COULEURS_DEFAUT)
  const police = apparence?.police ?? 'Inter'

  const transition =
    (template?.parametres as { transition?: string } | null)?.transition ?? 'fondu'

  const total = useMemo(
    () => Math.round(scenes.reduce((s, sc) => s + sc.dureeSecondes, 0) * 10) / 10,
    [scenes],
  )

  const [lecture, setLecture] = useState(false)
  const [index, setIndex] = useState(0)
  const [ecoule, setEcoule] = useState(0)
  const [anime, setAnime] = useState(true)
  const minuteur = useRef<ReturnType<typeof setInterval> | null>(null)

  // Temps deja joue par les scenes precedentes. Sans cela, la barre de
  // progression repartirait de zero a chaque scene.
  const dejaEcoule = useMemo(
    () => scenes.slice(0, index).reduce((somme, sc) => somme + sc.dureeSecondes, 0),
    [scenes, index],
  )
  const tempsCourant = Math.round((dejaEcoule + ecoule) * 10) / 10

  // Respect du reglage systeme : pas d'animation si l'utilisateur la refuse.
  useEffect(() => {
    const requete = window.matchMedia('(prefers-reduced-motion: reduce)')
    setAnime(!requete.matches)
    const surChangement = (e: MediaQueryListEvent) => setAnime(!e.matches)
    requete.addEventListener('change', surChangement)
    return () => requete.removeEventListener('change', surChangement)
  }, [])

  // Avancement du temps, 20 fois par seconde : assez fluide, peu gourmand.
  useEffect(() => {
    if (!lecture || scenes.length === 0) {
      if (minuteur.current) clearInterval(minuteur.current)
      minuteur.current = null
      return
    }

    minuteur.current = setInterval(() => {
      setEcoule((precedent) => {
        const suivant = precedent + 0.05
        const duree = scenes[index]?.dureeSecondes ?? 1

        if (suivant >= duree) {
          if (index + 1 >= scenes.length) {
            // Fin de la derniere scene : on s'arrete sur la derniere image.
            setLecture(false)
            return duree
          }
          setIndex((i) => i + 1)
          return 0
        }
        return suivant
      })
    }, 50)

    return () => {
      if (minuteur.current) clearInterval(minuteur.current)
    }
  }, [lecture, index, scenes])

  function recommencer() {
    setIndex(0)
    setEcoule(0)
    setLecture(true)
  }

  if (scenes.length === 0) {
    return (
      <div className="note">
        Aucune scène pour l&apos;instant : écris ton script à l&apos;étape 1, et l&apos;aperçu
        s&apos;affichera ici.
      </div>
    )
  }

  const scene = scenes[Math.min(index, scenes.length - 1)]
  const progressionGlobale = total > 0 ? (tempsCourant / total) * 100 : 0

  return (
    <>
      <div className="apercu-cadre">
        <div
          className="apercu-ecran"
          style={{ background: couleurs[0] }}
          aria-live="polite"
        >
          <div
            key={anime ? `${index}-${lecture}` : 'statique'}
            className={anime ? `apercu-texte apercu-${transition}` : 'apercu-texte'}
            style={{ color: couleurs[1], fontFamily: `'${police}', sans-serif` }}
          >
            {scene?.texte || '…'}
          </div>
          <div className="apercu-couleurs">
            {couleurs.map((c) => (
              <span key={c} className="kit-pastille" style={{ background: c }} />
            ))}
          </div>
        </div>

        <div className="apercu-barre">
          <div className="apercu-progression" style={{ width: `${progressionGlobale}%` }} />
        </div>

        <div className="apercu-commandes">
          <button
            type="button"
            className="bouton-secondaire"
            onClick={() => setLecture((l) => !l)}
          >
            {lecture ? 'Pause' : 'Lire'}
          </button>
          <button type="button" className="bouton-mini" onClick={recommencer}>
            Recommencer
          </button>
          <button
            type="button"
            className="bouton-mini"
            onClick={() => {
              setLecture(false)
              setIndex((i) => Math.max(0, i - 1))
              setEcoule(0)
            }}
            disabled={index === 0}
          >
            ← Scène
          </button>
          <button
            type="button"
            className="bouton-mini"
            onClick={() => {
              setLecture(false)
              setIndex((i) => Math.min(scenes.length - 1, i + 1))
              setEcoule(0)
            }}
            disabled={index >= scenes.length - 1}
          >
            Scène →
          </button>

          <span className="carte-detail">
            Scène {index + 1} / {scenes.length} · {tempsCourant.toFixed(1)} s / {total} s
          </span>
        </div>

        <div className="carte-detail">
          Transition « {transition} » — reprise du template{' '}
          {template ? <strong>{template.nom}</strong> : 'non choisi'}.
        </div>
      </div>

      <div className="note">
        <strong>Ceci est un aperçu, pas le fichier final.</strong> Cette animation tourne dans ton
        navigateur : elle te montre le texte, les couleurs, la police et le rythme. Le vrai MP4 se
        fabrique à l&apos;étape 6 « La génération », et il te faudra compter une à deux minutes.
      </div>
    </>
  )
}
