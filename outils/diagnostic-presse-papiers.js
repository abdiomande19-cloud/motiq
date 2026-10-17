/**
 * Motiq — diagnostic du presse-papiers, SANS reveler son contenu.
 *
 * On ne sait pas pourquoi le jeton copie n'est pas reconnu. Plutot que de
 * demander a la personne de le recopier « pour voir », on mesure sa FORME :
 * longueur, prefixes, types de caracteres, empreinte. Cela suffit a savoir
 * ce qui a ete copie, et a adapter la reconnaissance — sans jamais exposer
 * un secret, meme dans un terminal.
 */

const { execFileSync } = require('node:child_process')
const crypto = require('node:crypto')

const brut = execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Get-Clipboard -Raw'], {
  encoding: 'utf8',
  timeout: 20_000,
})
const c = (brut ?? '').trim()

if (!c) {
  console.log('   presse-papiers VIDE')
  process.exit(0)
}

const classes = new Set()
for (const ch of c) {
  if (/[a-z]/.test(ch)) classes.add('minuscules')
  else if (/[A-Z]/.test(ch)) classes.add('MAJUSCULES')
  else if (/[0-9]/.test(ch)) classes.add('chiffres')
  else if (ch === '_') classes.add('_')
  else if (ch === '-') classes.add('-')
  else if (/\s/.test(ch)) classes.add('espace')
  else classes.add('autre')
}

console.log(`   longueur           : ${c.length}`)
console.log(`   lignes             : ${c.split(/\r?\n/).length}`)
console.log(`   types de caracteres: ${[...classes].join(', ')}`)
console.log(`   empreinte sha256   : ${crypto.createHash('sha256').update(c).digest('hex').slice(0, 16)}`)

// Les prefixes courants, compares par leur DEBUT seulement.
const prefixes = ['vercel', 'vca_', 'bearer', 'ghp_', 'gho_', 'sk_', 'sbp_', 'pk_', 'eyJ']
const bas = c.toLowerCase()
console.log(`   prefixe reconnu    : ${prefixes.find((p) => bas.startsWith(p)) ?? 'aucun'}`)
console.log(`   ressemble a un JWT : ${/^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\./.test(c) ? 'oui' : 'non'}`)
console.log(`   accepte [A-Za-z0-9]{20,80} : ${/^[A-Za-z0-9]{20,80}$/.test(c) ? 'oui' : 'non'}`)
