/**
 * Motiq — ecrit une valeur dans .env.local, sans interaction.
 *
 * Remplace la valeur si la cle existe deja, l'ajoute sinon. Conserve les
 * commentaires. Ecriture atomique (fichier temporaire puis remplacement).
 *
 * Usage : node definir-env.js CLE "valeur"
 */

const fs = require('node:fs')
const path = require('node:path')

const FICHIER = path.join(__dirname, '..', 'app', '.env.local')
const cle = process.argv[2]
const valeur = process.argv[3]

if (!cle || valeur === undefined) {
  console.error('Usage : node definir-env.js CLE "valeur"')
  process.exit(1)
}

const lignes = fs.readFileSync(FICHIER, 'utf8').split(/\r?\n/)
let remplacee = false

const nouvelles = lignes.map((ligne) => {
  const d = ligne.trim()
  if (!d || d.startsWith('#') || !d.includes('=')) return ligne
  const i = d.indexOf('=')
  if (d.slice(0, i).trim() !== cle) return ligne
  remplacee = true
  return `${cle}=${valeur}`
})

if (!remplacee) nouvelles.push(`${cle}=${valeur}`)

const temp = `${FICHIER}.tmp`
fs.writeFileSync(temp, nouvelles.join('\n'), 'utf8')
fs.renameSync(temp, FICHIER)

console.log(`${cle} : ${remplacee ? 'remplacee' : 'ajoutee'} (${valeur.length} caracteres)`)
