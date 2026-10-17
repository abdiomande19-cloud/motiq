/**
 * Motiq — deploiement sur Vercel.
 *
 * REGLE ABSOLUE : ON DEPLOIE EN PREVIEW, JAMAIS EN PRODUCTION SANS ACCORD.
 * Un deploiement en production est un point de non-retour : il rend le site
 * public et vivant. Le script s'arrete donc a la preview, et attend que la
 * personne ait regarde le resultat.
 *
 * CE QUI EST FAIT, DANS L'ORDRE
 *   1. le jeton est lu depuis outils/.vercel-token (jamais affiche) ;
 *   2. les variables d'environnement sont POUSSEES vers Vercel — sans elles,
 *      le site deploye planterait : pas de base, pas de paiement ;
 *   3. le projet est cree ou relie ;
 *   4. la preview est construite et son adresse est affichee.
 *
 * POURQUOI POUSSER LES VARIABLES PAR L'API ET NON A LA MAIN
 * Il y en a huit. Recopiees a la main dans un formulaire web, il y en a
 * toujours une d'oubliee ou de traversee, et l'erreur n'apparait qu'une fois
 * le site en ligne. Ici, elles sont lues dans .env.local — la source qui
 * fonctionne deja en local.
 */

const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const RACINE = path.join(__dirname, '..')
const APP = path.join(RACINE, 'app')
const FICHIER_JETON = path.join(__dirname, '.vercel-token')
const FICHIER_ENV = path.join(APP, '.env.local')
/**
 * Nom du projet Vercel.
 *
 * Il vient du DOSSIER, pas d'une option : depuis la CLI 64, « --name » est
 * obsolete et silencieusement ignore — le deploiement part sous le nom du
 * repertoire (« app »), et les variables poussees dans « motiq » ne servent a
 * rien. D'ou un site deploye qui plante en 500 : il tournait sans aucune
 * variable d'environnement.
 *
 * On accepte donc le nom en argument, pour pouvoir viser explicitement le
 * projet ou vivent les variables.
 */
const NOM_PROJET = process.argv[2] || 'app'

/** Les variables a pousser. Les publiques sont lisibles par le navigateur. */
const VARIABLES = [
  { cle: 'NEXT_PUBLIC_SUPABASE_URL', type: 'plain', cibles: ['production', 'preview', 'development'] },
  { cle: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', type: 'plain', cibles: ['production', 'preview', 'development'] },
  { cle: 'SUPABASE_SECRET_KEY', type: 'encrypted', cibles: ['production', 'preview', 'development'] },
  { cle: 'PAYSTACK_PUBLIC_KEY', type: 'plain', cibles: ['production', 'preview', 'development'] },
  { cle: 'PAYSTACK_SECRET_KEY', type: 'encrypted', cibles: ['production', 'preview', 'development'] },
  { cle: 'PAYSTACK_PLAN_PRO', type: 'encrypted', cibles: ['production', 'preview', 'development'] },
  { cle: 'PAYSTACK_PLAN_BUSINESS', type: 'encrypted', cibles: ['production', 'preview', 'development'] },
  { cle: 'SUPABASE_ACCESS_TOKEN', type: 'encrypted', cibles: ['production', 'preview', 'development'] },
]

function lireEnv(chemin) {
  const valeurs = {}
  for (const ligne of fs.readFileSync(chemin, 'utf8').split(/\r?\n/)) {
    const d = ligne.trim()
    if (!d || d.startsWith('#') || !d.includes('=')) continue
    const i = d.indexOf('=')
    valeurs[d.slice(0, i).trim()] = d.slice(i + 1).trim()
  }
  return valeurs
}

async function api(jeton, chemin, options = {}) {
  const reponse = await fetch(`https://api.vercel.com${chemin}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${jeton}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  const texte = await reponse.text()
  let corps = null
  try {
    corps = texte ? JSON.parse(texte) : null
  } catch {
    corps = texte
  }
  return { code: reponse.status, corps }
}

async function principal() {
  console.log('')
  console.log('='.repeat(66))
  console.log('   MOTIQ  -  Deploiement sur Vercel (PREVIEW)')
  console.log('='.repeat(66))

  if (!fs.existsSync(FICHIER_JETON)) {
    console.error('\n   !! Aucun jeton. Lance d abord outils/9-jeton-vercel.bat')
    process.exit(1)
  }
  const jeton = fs.readFileSync(FICHIER_JETON, 'utf8').trim()
  console.log(`\n   jeton : ${jeton.length} caracteres (valeur masquee)`)

  // ---------------------------------------------------- 0. compte et equipe
  // Le jeton appartient a une EQUIPE, pas a un compte personnel. Sans le
  // teamId, toutes les operations visent le compte perso et echouent avec un
  // « not found » trompeur : le projet existe, mais pas la ou on le cherche.
  const moi = await api(jeton, '/v2/user')
  if (moi.code >= 400) {
    console.error(`   !! jeton refuse (HTTP ${moi.code})`)
    process.exit(1)
  }
  const equipeId = moi.corps?.user?.defaultTeamId ?? null
  console.log(`   compte : ${moi.corps?.user?.username ?? moi.corps?.user?.email ?? 'inconnu'}`)
  console.log(`   equipe : ${equipeId ?? 'aucune (compte personnel)'}`)

  const suffixe = equipeId ? `?teamId=${equipeId}` : ''
  const et = (chemin) => `${chemin}${chemin.includes('?') ? '&' : '?'}${equipeId ? `teamId=${equipeId}` : ''}`

  const env = lireEnv(FICHIER_ENV)

  // ------------------------------------------------------------- 1. projet
  console.log('\n1) PROJET VERCEL')
  let projet = (await api(jeton, et(`/v9/projects/${NOM_PROJET}`))).corps
  if (!projet || projet.error) {
    const creation = await api(jeton, et('/v11/projects'), {
      method: 'POST',
      body: JSON.stringify({ name: NOM_PROJET, framework: 'nextjs' }),
    })
    projet = creation.corps
    if (!projet?.id) {
      console.error('   !! creation impossible :', JSON.stringify(projet).slice(0, 300))
      process.exit(1)
    }
    console.log(`   cree : ${projet.name}`)
  } else {
    console.log(`   deja existant : ${projet.name}`)
  }

  // -------------------------------------------------------- 2. variables
  console.log('\n2) VARIABLES D ENVIRONNEMENT')
  const existantes = (await api(jeton, et(`/v9/projects/${projet.id}/env`))).corps?.envs ?? []
  let poussees = 0
  let manquantes = 0

  for (const v of VARIABLES) {
    const valeur = env[v.cle]
    if (!valeur) {
      console.log(`   -  ${v.cle.padEnd(38)} absente de .env.local, ignoree`)
      manquantes += 1
      continue
    }

    // On remplace : une valeur PERIMEE dans Vercel est plus dangereuse qu'une
    // absence. Le site tournerait avec un ancien secret sans que rien ne le
    // signale, et on chercherait longtemps.
    for (const ancienne of existantes.filter((e) => e.key === v.cle)) {
      await api(jeton, et(`/v9/projects/${projet.id}/env/${ancienne.id}`), { method: 'DELETE' })
    }

    const r = await api(jeton, et(`/v10/projects/${projet.id}/env`), {
      method: 'POST',
      body: JSON.stringify({
        key: v.cle,
        value: valeur,
        type: v.type,
        target: v.cibles,
      }),
    })
    if (r.code >= 400) {
      console.log(`   !! ${v.cle.padEnd(38)} refusee (HTTP ${r.code})`)
    } else {
      console.log(`   ok ${v.cle.padEnd(38)} ${v.type}`)
      poussees += 1
    }
  }
  console.log(`   ${poussees} variable(s) poussee(s), ${manquantes} manquante(s) en local.`)

  if (manquantes > 0) {
    console.log('\n   ATTENTION : certaines variables manquent. Le site deploye')
    console.log('   pourrait ne pas fonctionner completement.')
  }

  // -------------------------------------------------------- 3. deploiement
  console.log('\n3) CONSTRUCTION DE LA PREVIEW')
  console.log('   (compte 1 a 3 minutes)')

  // On appelle le JAVASCRIPT de la CLI, pas le fichier « vercel.cmd ».
  //
  // execFileSync refuse de lancer un .cmd sous Windows depuis Node 26 : la
  // protection contre une faille (contournement de shell par des .bat/.cmd)
  // fait echouer l'appel avec EINVAL, AVANT meme d'atteindre Vercel, et sans
  // le moindre message. On contourne proprement en executant le point d'entree
  // JavaScript avec l'interpreteur courant : aucune couche de shell.
  const vercelCli = path.join(
    process.env.LOCALAPPDATA ?? '',
    'hermes',
    'tools',
    'node-26.7.0-win32-x64',
    'node_modules',
    'vercel',
    'dist',
    'vc.js',
  )

  let sortie = ''
  try {
    sortie = execFileSync(
      process.execPath,
      [vercelCli, 'deploy', '--yes', '--token', jeton, '--scope', equipeId ?? '', ...(equipeId ? [] : [])].filter(Boolean),
      { cwd: APP, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600_000 },
    )
  } catch (erreur) {
    sortie = `${erreur.stdout ?? ''}\n${erreur.stderr ?? ''}`
    console.error('\n   !! Le deploiement a echoue.')
    if (erreur.code) console.error(`   code : ${erreur.code}`)
    console.error(sortie.split('\n').slice(-25).join('\n') || '(aucune sortie)')
    process.exit(1)
  }

  const adresse = (sortie.match(/https:\/\/[a-z0-9-]+\.vercel\.app/gi) ?? []).pop()

  console.log('')
  console.log('='.repeat(66))
  if (adresse) {
    console.log('   PREVIEW EN LIGNE')
    console.log('='.repeat(66))
    console.log('')
    console.log(`   ${adresse}`)
    console.log('')
    console.log('   CE N EST PAS ENCORE LA PRODUCTION.')
    console.log('   Regarde le site, verifie que tout fonctionne, puis decide.')
  } else {
    console.log('   Deploiement termine, mais adresse introuvable dans la sortie.')
    console.log('='.repeat(66))
    console.log(sortie.split('\n').slice(-20).join('\n'))
  }
  console.log('')
}

principal().catch((erreur) => {
  console.error('\nErreur :', erreur && erreur.message ? erreur.message : erreur)
  process.exit(1)
})
