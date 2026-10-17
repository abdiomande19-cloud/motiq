/**
 * Motiq — recuperer le jeton Vercel depuis le PRESSE-PAPIERS.
 *
 * POURQUOI CETTE METHODE
 * Coller un jeton dans une fenetre noire a echoue plusieurs fois : la fenetre
 * se cachait derriere le navigateur, l'Entree ne partait pas, on ne savait pas
 * si la valeur etait arrivee. Chaque echec etait silencieux.
 *
 * Ici : la personne clique « Copy » sur Vercel, et le jeton est lu directement
 * dans le presse-papiers. Un seul geste, aucun risque de mauvais collage.
 *
 * LA VALEUR N EST AFFICHEE NULLE PART — ni dans la console, ni dans la
 * conversation. Seuls le nom du compte Vercel et la longueur sont montres.
 *
 * Usage : node outils/jeton-depuis-presse-papiers.js
 */

const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const DESTINATION = path.join(__dirname, '.vercel-token')

function lirePressePapiers() {
  const sortie = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-Command', 'Get-Clipboard -Raw'],
    { encoding: 'utf8', timeout: 20_000 },
  )
  return (sortie ?? '').trim()
}

async function principal() {
  console.log('')
  console.log('='.repeat(66))
  console.log('   MOTIQ  -  Lecture du jeton dans le presse-papiers')
  console.log('='.repeat(66))

  const contenu = lirePressePapiers()

  if (!contenu) {
    console.log('\n   Le presse-papiers est vide.')
    console.log('   Sur Vercel, clique sur le bouton « Copy » du jeton, puis relance.')
    process.exit(1)
  }

  // Le presse-papiers peut contenir plusieurs lignes si on a copie large.
  //
  // ON NE FILTRE PAS SUR UNE FORME ATTENDUE. Ma premiere version exigeait
  // « lettres et chiffres uniquement » et a rejete un jeton de 60 caracteres
  // contenant des tirets bas — un format que je n'avais pas prevu. Un filtre
  // trop strict rejette des jetons VALIDES, et l'utilisateur tourne en rond
  // sans comprendre.
  //
  // C'est l'API Vercel qui juge : on essaie chaque ligne, et la premiere
  // acceptee est la bonne. Une forme, ca se devine ; une autorisation, non.
  const candidats = contenu
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 20 && l.length <= 500 && !/\s/.test(l))

  if (candidats.length === 0) {
    console.log(`\n   Rien de copiable dans le presse-papiers`)
    console.log(`   (${contenu.length} caracteres lus, aucune ligne utilisable).`)
    console.log('')
    console.log('   Verifie que tu as bien clique sur « Copy » du JETON,')
    console.log('   et non copie autre chose.')
    process.exit(1)
  }

  console.log(`\n   ${candidats.length} candidat(s) a tester (valeur masquee)`)

  let jeton = null
  let profil = null

  for (const candidat of candidats) {
    console.log(`   essai d un candidat de ${candidat.length} caracteres...`)
    let reponse
    try {
      reponse = await fetch('https://api.vercel.com/v2/user', {
        headers: { Authorization: `Bearer ${candidat}` },
      })
    } catch (erreur) {
      console.log(`   !! Vercel injoignable : ${erreur.message}`)
      process.exit(1)
    }
    if (reponse.ok) {
      jeton = candidat
      profil = await reponse.json()
      break
    }
    console.log(`      refuse (HTTP ${reponse.status})`)
  }

  if (!jeton || !profil) {
    console.log('\n   !! Aucun candidat accepte par Vercel.')
    console.log('   Ce qui est dans le presse-papiers n est pas un jeton Vercel valide.')
    console.log('')
    console.log('   Va sur https://vercel.com/account/tokens')
    console.log('   -> Create Token -> nom : motiq -> Create -> COPY')
    console.log('   puis relance ce script.')
    process.exit(1)
  }
  const utilisateur = profil.user?.username || profil.user?.email || 'inconnu'
  const equipe = profil.user?.defaultTeamId ? ` (equipe ${profil.user.defaultTeamId})` : ''

  fs.writeFileSync(DESTINATION, jeton, { encoding: 'utf8', mode: 0o600 })

  console.log('')
  console.log('='.repeat(66))
  console.log(`   JETON VALIDE — compte : ${utilisateur}${equipe}`)
  console.log('='.repeat(66))
  console.log('')
  console.log(`   Enregistre dans : ${DESTINATION}`)
  console.log(`   Longueur : ${jeton.length} caracteres (jamais affiche)`)
  console.log('   Ignore par git : il ne sera jamais publie.')
  console.log('')
}

principal().catch((erreur) => {
  console.error('\nErreur :', erreur && erreur.message ? erreur.message : erreur)
  process.exit(1)
})
