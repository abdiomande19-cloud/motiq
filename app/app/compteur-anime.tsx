'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Motiq — un nombre qui compte progressivement.
 *
 * TROIS REGLES, ET AUCUNE N'EST DECORATIVE
 *
 * 1. LE CHIFFRE FINAL EST CELUI DE LA BASE. L'animation part de 0 et s'arrete
 *    exactement sur la valeur recue. Elle ne « tombe » jamais sur un nombre
 *    rond plus flatteur : afficher 1 000 quand il y en a 2 serait un mensonge
 *    que n'importe qui peut verifier.
 *
 * 2. L'ANIMATION NE DEMARRE QUE SI LE BLOC EST VISIBLE. Un compteur qui s'anime
 *    pendant que le visiteur est encore en haut de la page a deja fini quand il
 *    arrive : il ne verrait qu'un nombre fige, et l'effet n'aurait servi a rien.
 *
 * 3. ELLE RESPECTE « PREFERS-REDUCED-MOTION ». Certaines personnes reglent leur
 *    systeme pour supprimer les animations : un compteur qui defile peut
 *    provoquer un malaise. On affiche alors la valeur directement.
 */

/** Groupe les milliers avec une espace, sans dependre de la locale du moteur. */
function grouper(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

interface Props {
  valeur: number
  /** Duree de l'animation, en millisecondes. */
  duree?: number
  suffixe?: string
}

export default function CompteurAnime({ valeur, duree = 1500, suffixe = '' }: Props) {
  const [affiche, setAffiche] = useState(0)
  const ancre = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ancre.current
    if (!element) return

    // Sans IntersectionObserver (navigateur ancien), on affiche tout de suite :
    // mieux vaut un nombre fixe qu'un zero qui ne bouge jamais.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observateur = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          setVisible(true)
          observateur.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    observateur.observe(element)
    return () => observateur.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return

    const reduit =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    // Valeur nulle ou animation refusee : on affiche la vraie valeur, sans effet.
    if (reduit || valeur <= 0) {
      setAffiche(valeur)
      return
    }

    let depart: number | null = null
    let image = 0

    const etape = (instant: number) => {
      if (depart === null) depart = instant
      const avancement = Math.min((instant - depart) / duree, 1)
      // Ralentissement en fin de course : le nombre ralentit en approchant de
      // sa valeur, ce qui donne l'impression de « se poser » dessus.
      const adouci = 1 - Math.pow(1 - avancement, 3)
      setAffiche(Math.round(valeur * adouci))
      if (avancement < 1) image = requestAnimationFrame(etape)
    }

    image = requestAnimationFrame(etape)
    return () => cancelAnimationFrame(image)
  }, [visible, valeur, duree])

  return (
    <span ref={ancre} aria-label={`${valeur}${suffixe}`}>
      {grouper(affiche)}
      {suffixe}
    </span>
  )
}
