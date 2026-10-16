/**
 * Motiq — essai de rendu.
 *
 * But : prouver que le moteur FABRIQUE REELLEMENT un MP4 sur cette machine,
 * avant d'investir dans les huit templates et la file d'attente. Un essai qui
 * echoue coute une minute ; le meme probleme decouvert plus tard coute une
 * journee de travail sur du vide.
 */

import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const SORTIE = path.join(ICI, 'sortie')
fs.mkdirSync(SORTIE, { recursive: true })

console.log('='.repeat(70))
console.log(' ESSAI DE RENDU VIDEO')
console.log('='.repeat(70))

console.log('\n1) Regroupement du projet video (bundle)...')
const debut = Date.now()
const servirUrl = await bundle({
  entryPoint: path.join(ICI, 'src', 'index.ts'),
  onProgress: (pourcent) => {
    if (pourcent % 25 === 0) process.stdout.write(`     ${pourcent}% `)
  },
})
console.log(`\n     bundle pret en ${((Date.now() - debut) / 1000).toFixed(1)} s`)
console.log(`     servi depuis ${servirUrl.slice(0, 60)}...`)

console.log('\n2) Lecture de la composition...')
const composition = await selectComposition({
  serveUrl: servirUrl,
  id: 'Motiq',
})
console.log(`     ${composition.width}x${composition.height}, ${composition.fps} im/s,`)
console.log(`     ${composition.durationInFrames} images = ${composition.durationInFrames / composition.fps} s`)

console.log('\n3) Rendu (cela peut prendre une minute : Chrome doit demarrer)...')
const fichier = path.join(SORTIE, 'essai.mp4')
const debutRendu = Date.now()
await renderMedia({
  composition,
  serveUrl: servirUrl,
  codec: 'h264',
  outputLocation: fichier,
  onProgress: ({ progress }) => {
    const p = Math.round(progress * 100)
    if (p % 20 === 0) process.stdout.write(`     ${p}% `)
  },
})
const duree = (Date.now() - debutRendu) / 1000

console.log(`\n\n4) RESULTAT`)
if (fs.existsSync(fichier)) {
  const taille = fs.statSync(fichier).size
  console.log(`     fichier : ${fichier}`)
  console.log(`     taille  : ${(taille / 1024).toFixed(0)} Ko`)
  console.log(`     rendu en ${duree.toFixed(1)} s`)
  console.log('\n' + '='.repeat(70))
  console.log(' VERDICT : le moteur fabrique bien une video sur cette machine.')
  console.log('='.repeat(70))
} else {
  console.log(' !! aucun fichier produit')
  process.exit(1)
}
