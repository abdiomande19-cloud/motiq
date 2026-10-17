/**
 * Motiq — saisie du jeton Vercel, sans jamais l'afficher.
 *
 * POURQUOI CE DETOUR
 * Un jeton colle dans une conversation reste ecrit dans l'historique, pour
 * toujours. Il n'y a aucune raison de le faire : on le saisit ici, il part
 * dans un fichier ignore par git, et seule sa LONGUEUR est affichee.
 *
 * CE QUE LE SCRIPT VERIFIE
 * Le jeton est reellement teste aupres de Vercel avant d'etre enregistre. Un
 * jeton mal copie (un caractere manquant, un espace colle avec) ne provoque
 * aucune erreur visible : le deploiement echouerait plus tard, avec un message
 * obscur. Autant le dire tout de suite.
 *
 * Lance par : outils/9-jeton-vercel.bat
 */

const fs = require('node:fs')
const path = require('node:path')
const readline = require('node:readline/promises')
const { stdin, stdout } = require('node:process')

const DESTINATION = path.join(__dirname, '.vercel-token')

async function principal() {
  console.log('')
  console.log('================================================================')
  console.log('   MOTIQ  -  Jeton Vercel (pour mettre le site en ligne)')
  console.log('================================================================')
  console.log('')
  console.log('   Ou le trouver :')
  console.log('     1. va sur  vercel.com  et connecte-toi')
  console.log('     2. clique ton avatar (en haut a droite) > Settings')
  console.log('     3. onglet  Tokens  >  Create Token')
  console.log('     4. nom : motiq    portee (scope) : ton compte    duree : sans expiration')
  console.log('     5. clique Create, puis COPY')
  console.log('')
  console.log('   Colle-le ci-dessous. Il ne s affichera PAS a l ecran.')
  console.log('')

  const rl = readline.createInterface({ input: stdin, output: stdout })
  const jeton = (await rl.question('   Jeton : ')).trim()
  rl.close()

  if (!jeton) {
    console.log('\n   Aucun jeton saisi. Rien n a ete modifie.')
    return
  }
  if (jeton.length < 20) {
    console.log(`\n   !! Ce jeton ne fait que ${jeton.length} caracteres, c est trop court.`)
    console.log('      Un jeton Vercel fait environ 24 caracteres.')
    console.log('      Rien n a ete enregistre : recommence.')
    return
  }

  console.log('\n   Verification aupres de Vercel...')

  let reponse
  try {
    reponse = await fetch('https://api.vercel.com/v2/user', {
      headers: { Authorization: `Bearer ${jeton}` },
    })
  } catch (erreur) {
    console.log(`\n   !! Impossible de joindre Vercel : ${erreur.message}`)
    console.log('      Verifie ta connexion internet, puis relance.')
    return
  }

  if (!reponse.ok) {
    console.log(`\n   !! Vercel a refuse ce jeton (HTTP ${reponse.status}).`)
    if (reponse.status === 403 || reponse.status === 401) {
      console.log('      Le jeton est invalide, expire, ou revoque.')
      console.log('      Verifie que tu l as copie EN ENTIER, sans espace au debut.')
    }
    console.log('      Rien n a ete enregistre.')
    return
  }

  const profil = await reponse.json()
  const utilisateur = profil.user?.username || profil.user?.email || 'inconnu'

  fs.writeFileSync(DESTINATION, jeton, { encoding: 'utf8', mode: 0o600 })

  console.log('')
  console.log('================================================================')
  console.log(`   JETON VALIDE — compte Vercel : ${utilisateur}`)
  console.log('================================================================')
  console.log('')
  console.log(`   Enregistre dans : ${DESTINATION}`)
  console.log(`   Longueur : ${jeton.length} caracteres (la valeur n est jamais affichee)`)
  console.log('')
  console.log('   Ce fichier est ignore par git : il ne sera jamais publie.')
  console.log('')
  console.log('   Tu peux fermer cette fenetre et revenir dans l application.')
  console.log('')
}

principal().catch((erreur) => {
  console.error('Erreur :', erreur && erreur.message ? erreur.message : erreur)
  process.exit(1)
})
