/**
 * Motiq — ouvrir le site au public et reparer l'alias de production.
 *
 * DEUX OPERATIONS, ET LA SECONDE EST CELLE QUI COMPTE VRAIMENT.
 *
 * 1. DESACTIVER LA PROTECTION VERCEL. Par defaut, Vercel exige une connexion
 *    a son propre compte pour voir un deploiement : un client qui clique le
 *    lien tombe sur un ecran de connexion Vercel, pas sur la boutique. Le site
 *    n'est donc pas « en ligne » au sens ou on l'entend.
 *
 * 2. PROMOUVOIR LE BON DEPLOIEMENT EN PRODUCTION. Le tout premier deploiement
 *    a ete etiquete « production » automatiquement — mais il est parti AVANT
 *    que les variables d'environnement existent, et il plante en HTTP 500.
 *    L'adresse de production pointe donc sur une version cassee, alors qu'une
 *    version saine existe, en preview. Il faut deplacer l'alias.
 *
 * On verifie ensuite a la main : 200 = le site repond, 302 = encore protege,
 * 500 = il plante. Un message de succes de l'API ne prouve rien.
 */

const fs = require('node:fs')
const path = require('node:path')

const FICHIER_JETON = path.join(__dirname, '.vercel-token')
const EQUIPE = 'team_yR7Ljb3LEsx3TfftvfamTr0K'
const PROJET = 'app'

/** Le deploiement sain, celui qui a recu les variables d'environnement. */
const BON_DEPLOIEMENT = process.argv[2] || 'app-5a7vklhjr-agentic-78c3.vercel.app'

const jeton = fs.readFileSync(FICHIER_JETON, 'utf8').trim()

async function api(chemin, options = {}) {
  const r = await fetch(`https://api.vercel.com${chemin}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${jeton}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  const t = await r.text()
  let corps = null
  try {
    corps = t ? JSON.parse(t) : null
  } catch {
    corps = t
  }
  return { code: r.status, corps }
}

async function principal() {
  console.log('')
  console.log('='.repeat(66))
  console.log('   MOTIQ  -  Ouverture au public + alias de production')
  console.log('='.repeat(66))

  // ------------------------------------------------------------ 1. projet
  const projet = (await api(`/v9/projects/${PROJET}?teamId=${EQUIPE}`)).corps
  if (!projet?.id) {
    console.error('   !! projet introuvable')
    process.exit(1)
  }
  console.log(`\n   projet : ${projet.name} (${projet.id})`)

  const dom = (projet.alias ?? []).map((a) => a.domain).join(', ')
  console.log(`   domaines actuels : ${dom || '—'}`)

  // ------------------------------------------------- 2. lever la protection
  console.log('\n1) LEVER LA PROTECTION VERCEL')
  const maj = await api(`/v9/projects/${projet.id}?teamId=${EQUIPE}`, {
    method: 'PATCH',
    body: JSON.stringify({ ssoProtection: null, passwordProtection: null }),
  })

  if (maj.code >= 400) {
    console.log(`   !! refus (HTTP ${maj.code}) : ${JSON.stringify(maj.corps).slice(0, 200)}`)
  } else {
    const sso = maj.corps?.ssoProtection
    console.log(`   ssoProtection      : ${sso ? JSON.stringify(sso) : 'desactivee'}`)
    console.log(`   passwordProtection : ${maj.corps?.passwordProtection ? 'active' : 'desactivee'}`)
  }

  // ------------------------------------- 3. promouvoir le bon deploiement
  console.log('\n2) ALIAS DE PRODUCTION')
  console.log(`   deploiement sain : ${BON_DEPLOIEMENT}`)

  const promo = await api(`/v10/projects/${projet.id}/promote/${BON_DEPLOIEMENT}?teamId=${EQUIPE}`, {
    method: 'POST',
  })

  if (promo.code >= 400) {
    console.log(`   !! promotion refusee (HTTP ${promo.code})`)
    console.log(`      ${JSON.stringify(promo.corps).slice(0, 250)}`)
  } else {
    console.log('   promotion acceptee')
    const domaines = (promo.corps?.alias ?? []).map((a) => a.domain)
    if (domaines.length) console.log(`   domaines : ${domaines.join(', ')}`)
  }

  // ------------------------------------------------------- 4. verification
  console.log('\n3) VERIFICATION REELLE')
  const aVerifier = [
    `https://${BON_DEPLOIEMENT}/`,
    `https://${PROJET}-chi-eosin-29.vercel.app/`,
  ]

  for (const url of aVerifier) {
    try {
      const r = await fetch(url, { redirect: 'manual' })
      const etat =
        r.status === 200
          ? 'OK — page servie'
          : r.status === 302 || r.status === 307
            ? 'PROTEGE — redirection Vercel'
            : r.status === 500
              ? 'PLANTE — erreur serveur'
              : `statut ${r.status}`
      console.log(`   ${r.status}  ${etat}`)
      console.log(`         ${url}`)
    } catch (erreur) {
      console.log(`   !! ${url} : ${erreur.message}`)
    }
  }

  console.log('')
  console.log('='.repeat(66))
}

principal().catch((e) => {
  console.error('\nErreur :', e?.message ?? e)
  process.exit(1)
})
