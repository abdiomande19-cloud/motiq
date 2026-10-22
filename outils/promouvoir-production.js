/**
 * Motiq — deplacer l'alias de production vers le deploiement sain.
 *
 * POURQUOI CE SCRIPT EXISTE
 * Le tout premier deploiement a ete etiquete « production » automatiquement
 * par Vercel. Il est parti AVANT que les variables d'environnement existent :
 * il plante en HTTP 500. Pendant ce temps, une version saine attend en
 * preview. L'adresse que les clients retiendront pointe donc sur la version
 * cassee — exactement l'inverse de ce qu'il faut.
 *
 * CE QUE J'AI RATE LA PREMIERE FOIS
 * L'API de promotion attend l'IDENTIFIANT du deploiement (dpl_xxx), pas son
 * adresse. J'ai passe l'adresse : « Deployment not found ». Un 404 qui ne dit
 * pas qu'on s'est trompe de champ.
 */

const fs = require('node:fs')
const path = require('node:path')

const jeton = fs.readFileSync(path.join(__dirname, '.vercel-token'), 'utf8').trim()
const EQUIPE = 'team_yR7Ljb3LEsx3TfftvfamTr0K'
const PROJET = 'app'
const CIBLE = 'app-5a7vklhjr-agentic-78c3.vercel.app'

async function api(chemin, options = {}) {
  const r = await fetch(`https://api.vercel.com${chemin}`, {
    ...options,
    headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json', ...(options.headers ?? {}) },
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
  console.log('   MOTIQ  -  Alias de production')
  console.log('='.repeat(66))

  const projet = (await api(`/v9/projects/${PROJET}?teamId=${EQUIPE}`)).corps
  if (!projet?.id) {
    console.error('   !! projet introuvable')
    process.exit(1)
  }

  // ------------------------------------------------- 1. trouver l'identifiant
  const liste = (await api(`/v6/deployments?projectId=${projet.id}&teamId=${EQUIPE}&limit=10`)).corps
  const deploiements = liste?.deployments ?? []
  const cible = deploiements.find((d) => d.url === CIBLE)

  if (!cible) {
    console.error(`   !! ${CIBLE} introuvable parmi les deploiements`)
    for (const d of deploiements) console.log(`      ${d.url}  ${d.state}`)
    process.exit(1)
  }

  console.log(`\n   cible   : ${cible.url}`)
  // Le champ s'appelle « uid » dans cette version de l'API. J'avais lu « id »,
  // qui n'existe pas : la promotion envoyait « undefined » et Vercel repondait
  // « Deployment not found » — un 404 qui ne dit pas qu'on a lu le mauvais champ.
  const identifiant = cible.uid ?? cible.id
  console.log(`   id      : ${identifiant}`)
  console.log(`   etat    : ${cible.state}`)

  if (!identifiant) {
    console.error('   !! aucun identifiant de deploiement : promotion impossible')
    process.exit(1)
  }

  // ------------------------------------------------------- 2. promouvoir
  console.log('\n1) PROMOTION EN PRODUCTION')
  const promo = await api(`/v10/projects/${projet.id}/promote/${identifiant}?teamId=${EQUIPE}`, {
    method: 'POST',
  })

  if (promo.code >= 400) {
    console.log(`   !! refus (HTTP ${promo.code}) : ${JSON.stringify(promo.corps).slice(0, 200)}`)
  } else {
    console.log('   promotion acceptee')
    for (const a of promo.corps?.alias ?? []) console.log(`   domaine : ${a.domain ?? a}`)
  }

  // ---------------------------------------------- 3. verifier les adresses
  console.log('\n2) VERIFICATION (attente 25 s pour la propagation)')
  await new Promise((r) => setTimeout(r, 25_000))

  const urls = [
    `https://${PROJET}-chi-eosin-29.vercel.app/`,
    `https://${PROJET}.vercel.app/`,
    `https://${CIBLE}/`,
  ]
  for (const url of urls) {
    try {
      const r = await fetch(url, { redirect: 'manual' })
      const sens =
        r.status === 200
          ? 'OK — page servie'
          : r.status === 302 || r.status === 307 || r.status === 308
            ? 'redirection'
            : r.status === 500
              ? 'PLANTE'
              : `statut ${r.status}`
      console.log(`   ${String(r.status).padEnd(4)} ${sens.padEnd(18)} ${url}`)
    } catch (e) {
      console.log(`   !!   ${url} : ${e.message}`)
    }
  }

  console.log('')
  console.log('='.repeat(66))
}

principal().catch((e) => {
  console.error('Erreur :', e?.message ?? e)
  process.exit(1)
})
