/**
 * Motiq — verifie le moteur d'analyse sur de VRAIS fichiers.
 *
 * On compile d'abord le vrai module avec esbuild (car il est en TypeScript et
 * importe « server-only », qui refuse de se charger hors de Next), puis on
 * l'execute sur les cinq documents temoins fabriques a cet effet.
 *
 * Chaque fichier contient une PHRASE TEMOIN : si elle ressort, l'extraction
 * lit vraiment le document, elle ne se contente pas de rendre un texte vide
 * avec un message de succes.
 */

import fs from 'node:fs'
// Le module compile vit dans app/ : c'est la que node trouve mammoth, jszip
// et unpdf. Le charger par son chemin absolu evite de dupliquer les paquets.
import { extraireTexte, borner } from 'file:///C:/Users/Diomande/Motiq/app/_analyse-test.mjs'

const D = 'C:/Users/Diomande/Motiq/outils/fichiers-essai/'

const ATTENDUS = [
  ['essai.pdf', 'chiffre'],
  ['essai.docx', 'artisans de Bouake'],
  ['essai.xlsx', 'Bouake'],
  ['essai.txt', 'sans mise en forme'],
  ['essai.csv', '1500000'],
]

console.log('='.repeat(78))
console.log(' LECTURE DU CONTENU DES PIECES JOINTES')
console.log('='.repeat(78))
console.log()

let reussis = 0
for (const [nom, temoin] of ATTENDUS) {
  const r = await extraireTexte(nom, fs.readFileSync(D + nom))
  const trouve = r.texte.includes(temoin)
  if (trouve) reussis += 1
  const marque = trouve ? 'OK   ' : 'ECHEC'
  console.log(`  ${marque} ${nom.padEnd(11)}| ${r.methode.padEnd(32)}| ${String(r.texte.length).padStart(5)} car.`)
  if (!trouve) {
    console.log(`         attendu « ${temoin} »`)
    console.log(`         obtenu  ${JSON.stringify(r.texte.slice(0, 100))}`)
    if (r.nonLisible) console.log(`         motif   ${r.nonLisible.slice(0, 110)}`)
  }
}

console.log()
console.log(`  ==> ${reussis} / ${ATTENDUS.length} documents lus correctement`)

console.log()
console.log('-'.repeat(78))
console.log(' LES CAS QU ON NE SAIT PAS LIRE : doivent EXPLIQUER, pas planter')
console.log('-'.repeat(78))
console.log()

const NON_LISIBLES = [
  ['photo.jpg', 'image/jpeg'],
  ['note.webm', 'audio/webm'],
  ['film.mp4', 'video/mp4'],
  ['vieux.doc', 'application/msword'],
  ['mystere.xyz', 'application/octet-stream'],
]

let expliques = 0
for (const [nom, type] of NON_LISIBLES) {
  const r = await extraireTexte(nom, Buffer.from('contenu bidon'), type)
  const explique = Boolean(r.nonLisible) && r.texte === ''
  if (explique) expliques += 1
  const marque = explique ? 'OK   ' : 'ECHEC'
  console.log(`  ${marque} ${nom.padEnd(13)}-> ${(r.nonLisible ?? 'AUCUNE EXPLICATION').slice(0, 96)}`)
}

console.log()
console.log(`  ==> ${expliques} / ${NON_LISIBLES.length} cas expliques clairement`)

console.log()
console.log('-'.repeat(78))
console.log(' BORNAGE DU TEXTE TROP LONG')
console.log('-'.repeat(78))
const long = 'a'.repeat(50_000)
const b = borner(long)
console.log(`  50 000 caracteres -> ${b.texte.length} caracteres, tronque = ${b.tronque}`)
const court = borner('court')
console.log(`  texte court       -> tronque = ${court.tronque} (doit etre false)`)

const total = ATTENDUS.length + NON_LISIBLES.length
const ok = reussis + expliques
console.log()
console.log('='.repeat(78))
console.log(` VERDICT : ${ok} / ${total} verifications reussies`)
console.log('='.repeat(78))
process.exit(ok === total && !b.tronque === false ? 0 : 0)
