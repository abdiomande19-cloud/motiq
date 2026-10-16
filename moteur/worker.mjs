/**
 * Motiq — le worker de rendu.
 *
 * POURQUOI UN PROGRAMME SEPARE, ET PAS DANS L'APPLICATION
 * Un rendu de 9 secondes prend 39 secondes de processeur sur cette machine.
 * Une video de 60 secondes en demanderait quatre minutes. Lance dans une
 * fonction sans serveur (Vercel), ce travail depasserait le temps maximal
 * autorise et serait tue en cours de route — apres avoir consomme le quota
 * du client. Le cahier des charges (10.1) l'impose donc : le rendu tourne sur
 * un service dedie.
 *
 * CE QU'IL FAIT
 *   1. il cherche les demandes de rendu en attente dans la base ;
 *   2. il charge le projet : scenes, template, apparence, plan du client ;
 *   3. il fabrique la video avec Remotion ;
 *   4. il depose le MP4 dans le stockage prive, sous le dossier du client ;
 *   5. il met a jour la demande : termine, ou echec AVEC LE MOTIF.
 *
 * UN ECHEC DOIT TOUJOURS ETRE ECRIT. Une demande qui reste indefiniment « en
 * cours » est pire qu'une demande en echec : le client attend sans savoir.
 *
 * Usage : node worker.mjs            (traite la file une fois)
 *         node worker.mjs --boucle   (surveille en continu)
 */

import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const SORTIE = path.join(ICI, 'sortie')
const BOUCLE = process.argv.includes('--boucle')

// ---------------------------------------------------------------- reglages
function lireEnv() {
  const chemin = path.join(ICI, '..', 'app', '.env.local')
  const contenu = fs.readFileSync(chemin, 'utf8')
  const valeurs = {}
  for (const ligne of contenu.split(/\r?\n/)) {
    const d = ligne.trim()
    if (!d || d.startsWith('#') || !d.includes('=')) continue
    const i = d.indexOf('=')
    valeurs[d.slice(0, i).trim()] = d.slice(i + 1).trim()
  }
  return valeurs
}

const env = lireEnv()
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const CLE = env.SUPABASE_SECRET_KEY

if (!URL || !CLE) {
  console.error('!! NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY absente de app/.env.local')
  process.exit(1)
}

const entetes = {
  apikey: CLE,
  Authorization: `Bearer ${CLE}`,
  'Content-Type': 'application/json',
}

async function api(chemin, options = {}) {
  const reponse = await fetch(`${URL}${chemin}`, { ...options, headers: { ...entetes, ...(options.headers ?? {}) } })
  const texte = await reponse.text()
  let corps = null
  try {
    corps = texte ? JSON.parse(texte) : null
  } catch {
    corps = texte
  }
  return { code: reponse.status, corps }
}

// ------------------------------------------------------------------ rendu
let bundleUrl = null

async function preparerBundle() {
  if (bundleUrl) return bundleUrl
  console.log('  [bundle] regroupement du projet video...')
  const debut = Date.now()
  bundleUrl = await bundle({ entryPoint: path.join(ICI, 'src', 'index.ts') })
  console.log(`  [bundle] pret en ${((Date.now() - debut) / 1000).toFixed(1)} s`)
  return bundleUrl
}

/** Fabrique le MP4 d'une demande de rendu. */
async function rendre(demande) {
  // 1. Le projet.
  const projet = (await api(`/rest/v1/projects?select=*&id=eq.${demande.projet_id}`)).corps?.[0]
  if (!projet) throw new Error(`projet introuvable (${demande.projet_id})`)

  const script = projet.script ?? {}
  const scenes = (script.scenes ?? []).filter((s) => s && String(s.texte ?? '').trim())
  if (scenes.length === 0) {
    throw new Error(
      'Ce projet n’a aucune scène avec du texte. Écris ton script dans l’application avant de demander la génération.',
    )
  }

  // 2. Le client : son plan decide du filigrane (cahier des charges 11).
  const profil = (await api(`/rest/v1/profiles?select=plan&id=eq.${projet.user_id}`)).corps?.[0]
  const filigrane = (profil?.plan ?? 'gratuit') === 'gratuit'

  // 3. L'apparence : couleurs, police. On retombe sur un jeu lisible si le
  //    client n'a rien choisi — une video avec des couleurs par defaut est
  //    mieux qu'une video qui plante.
  const apparence = projet.apparence ?? {}
  const couleurs =
    Array.isArray(apparence.couleurs) && apparence.couleurs.length >= 3
      ? apparence.couleurs
      : ['#7C5CFF', '#0B0B12', '#FFFFFF']

  const totalImages = Math.round(
    scenes.reduce((s, x) => s + Number(x.dureeSecondes ?? 0), 0) * 30,
  )

  console.log(
    `  [rendu] ${scenes.length} scène(s), ${totalImages} images (${(totalImages / 30).toFixed(1)} s), ` +
      `template ${projet.template_id ?? 'Punch'}, filigrane ${filigrane ? 'oui' : 'non'}`,
  )

  const servirUrl = await preparerBundle()

  // 4. La composition, reglee sur les durees REELLES de ce projet.
  const composition = await selectComposition({
    serveUrl: servirUrl,
    id: 'Motiq',
    inputProps: {
      titre: projet.titre,
      scenes,
      template: projet.template_id ?? 'Punch',
      apparence: {
        couleurs,
        police: apparence.police ?? 'Inter',
        musique: apparence.musique ?? null,
      },
      filigrane,
    },
  })

  const fichier = path.join(SORTIE, `${demande.id}.mp4`)
  fs.mkdirSync(SORTIE, { recursive: true })
  const debut = Date.now()

  await renderMedia({
    composition,
    serveUrl: servirUrl,
    codec: 'h264',
    outputLocation: fichier,
    inputProps: {
      titre: projet.titre,
      scenes,
      template: projet.template_id ?? 'Punch',
      apparence: {
        couleurs,
        police: apparence.police ?? 'Inter',
        musique: apparence.musique ?? null,
      },
      filigrane,
    },
  })

  const octets = fs.statSync(fichier).size
  console.log(`  [rendu] ${(octets / 1024).toFixed(0)} Ko en ${((Date.now() - debut) / 1000).toFixed(1)} s`)

  return { fichier, octets, projet, scenes, filigrane }
}

/** Depose le MP4 dans le stockage, sous le dossier du client. */
async function deposer(demande, resultat) {
  const chemin = `${resultat.projet.user_id}/rendus/${demande.id}.mp4`
  const contenu = fs.readFileSync(resultat.fichier)

  const reponse = await fetch(`${URL}/storage/v1/object/medias/${chemin}`, {
    method: 'POST',
    headers: {
      apikey: CLE,
      Authorization: `Bearer ${CLE}`,
      'Content-Type': 'video/mp4',
      'x-upsert': 'true',
    },
    body: contenu,
  })

  if (!reponse.ok) {
    throw new Error(`dépôt du fichier refusé (HTTP ${reponse.status}) : ${(await reponse.text()).slice(0, 160)}`)
  }
  return chemin
}

// ------------------------------------------------------------- une demande
async function traiter(demande) {
  console.log(`\n--- demande ${demande.id.slice(0, 8)}...`)

  /**
   * PRISE DE LA DEMANDE, ET CETTE FOIS DE FACON ATOMIQUE.
   *
   * Le filtre `statut=eq.en_attente` fait partie de la MISE A JOUR, pas de la
   * lecture. C'est la difference essentielle : si deux workers tournent en
   * meme temps — deux fenetres ouvertes, ou une tache planifiee qui demarre
   * alors que la precedente n'est pas finie — un seul obtient la ligne.
   *
   * Sans ce filtre, les deux liraient « en attente », les deux se mettraient
   * au travail, et la meme video serait fabriquee DEUX FOIS : deux minutes de
   * processeur gaspillees, et deux fichiers identiques.
   *
   * La reponse vide est la preuve que quelqu'un d'autre est passe avant.
   */
  const { corps: pris } = await api(
    `/rest/v1/render_jobs?id=eq.${demande.id}&statut=eq.en_attente`,
    {
      method: 'PATCH',
      body: JSON.stringify({ statut: 'en_cours', progression: 5, maj_le: new Date().toISOString() }),
      headers: { Prefer: 'return=representation' },
    },
  )

  if (!Array.isArray(pris) || pris.length === 0) {
    console.log('  deja prise par un autre worker — on la laisse.')
    return false
  }

  try {
    const resultat = await rendre(demande)
    const chemin = await deposer(demande, resultat)

    await api(`/rest/v1/render_jobs?id=eq.${demande.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        statut: 'termine',
        progression: 100,
        url_mp4: chemin,
        erreur: null,
        maj_le: new Date().toISOString(),
      }),
      headers: { Prefer: 'return=minimal' },
    })

    // Le projet passe a « prêt » : le client voit que sa video est disponible.
    await api(`/rest/v1/projects?id=eq.${demande.projet_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ statut: 'pret', maj_le: new Date().toISOString() }),
      headers: { Prefer: 'return=minimal' },
    })

    fs.unlinkSync(resultat.fichier)
    console.log(`  [ok] déposé : ${chemin}`)
    return true
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : String(erreur)
    console.error(`  [echec] ${message}`)

    // Un echec DOIT etre ecrit, avec son motif : une demande qui reste
    // indefiniment « en cours » laisse le client attendre sans rien savoir.
    await api(`/rest/v1/render_jobs?id=eq.${demande.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        statut: 'echec',
        erreur: message.slice(0, 500),
        maj_le: new Date().toISOString(),
      }),
      headers: { Prefer: 'return=minimal' },
    })
    await api(`/rest/v1/projects?id=eq.${demande.projet_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ statut: 'echec', maj_le: new Date().toISOString() }),
      headers: { Prefer: 'return=minimal' },
    })
    return false
  }
}

async function tour() {
  const { corps: demandes } = await api(
    '/rest/v1/render_jobs?statut=eq.en_attente&select=id,projet_id&order=cree_le.asc&limit=5',
  )

  if (!Array.isArray(demandes) || demandes.length === 0) return 0

  console.log(`\n${demandes.length} demande(s) en attente.`)
  let faits = 0
  for (const demande of demandes) {
    if (await traiter(demande)) faits += 1
  }
  return faits
}

// ------------------------------------------------------------------ demarrage
/**
 * LE WORKER ECRIT SON PROPRE JOURNAL.
 *
 * On ne passe pas par une redirection du shell (« > worker.log ») : Windows
 * verrouille alors le fichier, et deux lancements se disputent l'acces — ce qui
 * arrive des qu'une execution precedente traine. Le journal est donc ecrit
 * directement par le programme, en ajout, et chaque ligne porte l'heure.
 *
 * C'est aussi ce qui permet a une tache planifiee de lancer le worker SANS
 * fenetre : sans redirection, aucun terminal n'est necessaire.
 */
const JOURNAL = path.join(ICI, 'worker.log')
const TAILLE_MAX_JOURNAL = 2_000_000 // 2 Mo

function ecrireJournal(ligne) {
  try {
    // On taille le journal avant qu'il ne remplisse le disque : un fichier
    // qui grossit a chaque rendu finirait par poser probleme des mois plus
    // tard, sans que personne ne fasse le lien.
    if (fs.existsSync(JOURNAL) && fs.statSync(JOURNAL).size > TAILLE_MAX_JOURNAL) {
      fs.writeFileSync(JOURNAL, '')
    }
    fs.appendFileSync(JOURNAL, ligne + '\n')
  } catch {
    // Un journal illisible ne doit JAMAIS empecher un rendu.
  }
}

for (const methode of ['log', 'error', 'warn']) {
  const origine = console[methode].bind(console)
  console[methode] = (...args) => {
    origine(...args)
    ecrireJournal(`[${new Date().toISOString()}] ${args.map(String).join(' ')}`)
  }
}

console.log('='.repeat(70))
console.log(' MOTIQ — WORKER DE RENDU')
console.log('='.repeat(70))
console.log(`  base : ${URL}`)

/**
 * UNE VEILLE NE DOIT JAMAIS MOURIR SUR UNE ERREUR PASSAGERE.
 *
 * Sans ces deux garde-fous, une coupure reseau d'une seconde — ou une seule
 * demande dont les donnees sont abimees — arrete le worker. La file continue
 * alors de se remplir, et personne ne s'en apercoit avant qu'un client se
 * plaigne : sa video reste « en attente » indefiniment.
 *
 * Une erreur est donc SIGNALEE, mais elle n'arrete rien.
 */
process.on('unhandledRejection', (raison) => {
  console.error('[rejet non traite]', raison)
})
process.on('uncaughtException', (erreur) => {
  console.error('[exception non traitee]', erreur?.message ?? erreur)
})

const faits = await tour().catch((e) => {
  console.error('[erreur] tour initial :', e.message)
  return 0
})
console.log(`\n  ${faits} video(s) fabriquee(s).`)

if (BOUCLE) {
  console.log('\n  Surveillance continue : nouvelle tentative toutes les 15 s.')
  console.log('  Laisse cette fenetre ouverte. Ctrl+C pour arreter.')
  setInterval(() => {
    tour().catch((e) => console.error('  [erreur]', e.message))
  }, 15000)
} else {
  process.exit(0)
}
