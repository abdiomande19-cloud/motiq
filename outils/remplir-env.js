/**
 * Motiq — remplissage guide du fichier .env.local.
 *
 * Pourquoi ce script : le Bloc-notes a fait perdre du temps (mauvaise ligne,
 * mauvais enregistrement, fenetres multiples). Ici, l'utilisateur repond a des
 * questions, et chaque reponse est ecrite a la bonne place. Appuyer sur Entree
 * laisse la valeur existante inchangee.
 *
 * Le script n'affiche JAMAIS une valeur : seulement « rempli » et une longueur.
 *
 * Lance par : outils/3-remplir-les-cles.bat
 */

const fs = require('node:fs')
const path = require('node:path')
const readline = require('node:readline/promises')
const { stdin, stdout } = require('node:process')

const FICHIER = path.join(__dirname, '..', 'app', '.env.local')

const QUESTIONS = [
  {
    cle: 'NEXT_PUBLIC_SUPABASE_URL',
    titre: "URL du projet",
    ou: "Supabase > ton projet > bouton « Connect » (en haut) > l'adresse qui ressemble a https://xxxxx.supabase.co",
  },
  {
    cle: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    titre: 'Cle PUBLIQUE',
    ou: 'Supabase > ton projet > Settings > API Keys > la cle qui commence par sb_publishable_  (sans danger)',
  },
  {
    cle: 'SUPABASE_SECRET_KEY',
    titre: 'Cle SECRETE',
    ou: 'Meme page, la cle qui commence par sb_secret_  (A NE JAMAIS montrer a personne)',
  },
  {
    cle: 'SUPABASE_ACCESS_TOKEN',
    titre: "Jeton d'acces personnel",
    ou: 'supabase.com > ton avatar en haut a droite > Access tokens > Generate new token > nom : motiq-cli',
  },
]

/** Lit le fichier et renvoie { lignes, valeurs } (les commentaires sont ignores). */
function analyser(texte) {
  const lignes = texte.split(/\r?\n/)
  const valeurs = {}
  for (const ligne of lignes) {
    const d = ligne.trim()
    if (!d || d.startsWith('#') || !d.includes('=')) continue
    const i = d.indexOf('=')
    valeurs[d.slice(0, i).trim()] = d.slice(i + 1).trim()
  }
  return { lignes, valeurs }
}

/** Remplace la valeur d'une cle, en conservant les commentaires. */
function ecrireValeur(lignes, cle, valeur) {
  return lignes.map((ligne) => {
    const d = ligne.trim()
    if (!d || d.startsWith('#') || !d.includes('=')) return ligne
    const i = d.indexOf('=')
    return d.slice(0, i).trim() === cle ? `${cle}=${valeur}` : ligne
  })
}

async function principal() {
  if (!fs.existsSync(FICHIER)) {
    console.error('Fichier introuvable :', FICHIER)
    process.exit(1)
  }

  console.log('')
  console.log('================================================================')
  console.log('   MOTIQ  -  Remplissage des cles Supabase')
  console.log('================================================================')
  console.log('')
  console.log('   4 questions. Pour chacune :')
  console.log('     - colle la valeur puis appuie sur ENTREE')
  console.log('     - ou appuie directement sur ENTREE pour passer')
  console.log('')
  console.log('   Rien n est affiche a l ecran : ta valeur reste privee.')
  console.log('')
  console.log('----------------------------------------------------------------')

  const rl = readline.createInterface({ input: stdin, output: stdout })
  let lignes = fs.readFileSync(FICHIER, 'utf8').split(/\r?\n/)
  let remplis = 0

  for (const q of QUESTIONS) {
    const actuel = analyser(lignes.join('\n')).valeurs[q.cle] || ''
    console.log('')
    console.log(`>>> ${q.titre}`)
    console.log(`    Ou la trouver : ${q.ou}`)
    if (actuel) console.log(`    (une valeur est deja presente, ${actuel.length} caracteres — Entree la garde)`)

    const reponse = (await rl.question('    Colle la valeur puis ENTREE : ')).trim()
    if (reponse) {
      lignes = ecrireValeur(lignes, q.cle, reponse)
      remplis += 1
      console.log(`    -> enregistre (${reponse.length} caracteres)`)
    } else {
      console.log('    -> passe')
    }
  }

  rl.close()

  // Ecriture atomique : fichier temporaire puis remplacement.
  const contenu = lignes.join('\n')
  const temp = `${FICHIER}.tmp`
  fs.writeFileSync(temp, contenu, 'utf8')
  fs.renameSync(temp, FICHIER)

  console.log('')
  console.log('----------------------------------------------------------------')
  console.log(`   ${remplis} valeur(s) enregistree(s).`)
  console.log('')
  console.log('   Etat final du fichier (aucune valeur affichee) :')
  const finales = analyser(fs.readFileSync(FICHIER, 'utf8')).valeurs
  for (const q of QUESTIONS) {
    const v = finales[q.cle] || ''
    console.log(`     ${q.cle.padEnd(38)} ${v ? 'REMPLIE (' + v.length + ')' : 'vide'}`)
  }
  console.log('')
  console.log('   Tu peux fermer cette fenetre et revenir dans l application.')
  console.log('================================================================')
}

principal().catch((err) => {
  console.error('Erreur :', err && err.message ? err.message : err)
  process.exit(1)
})
