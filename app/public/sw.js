/*
 * Motiq — service worker.
 *
 * REGLE DE SECURITE, avant tout le reste : on ne met JAMAIS en cache une page
 * privee. Sinon, après une déconnexion, l'utilisateur suivant sur la même
 * machine pourrait voir la page « Mes projets » restée dans le cache. Les
 * chemins /projets et /connexion sont donc servis exclusivement par le réseau.
 *
 * Stratégies :
 *   - /projets, /connexion        -> réseau uniquement, aucun cache
 *   - fichiers statiques          -> cache d'abord (rapide, immuable)
 *   - le reste (pages publiques)  -> réseau d'abord, cache en secours
 */

const VERSION = 'motiq-v1'

/** Pages publiques préchargées à l'installation. */
const COQUILLE = ['/', '/ecrans', '/etat', '/manifest.webmanifest',
                  '/icone-192.png', '/icone-512.png']

/** Ne doit jamais entrer dans le cache. */
const PRIVE = ['/projets', '/connexion']

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(COQUILLE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request
  if (requete.method !== 'GET') return

  const url = new URL(requete.url)
  if (url.origin !== self.location.origin) return

  if (PRIVE.some((chemin) => url.pathname.startsWith(chemin))) {
    return // le réseau seul décide : rien n'est mis en cache
  }

  const statique =
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:css|js|mjs|png|jpg|jpeg|svg|webp|woff2?|ico)$/.test(url.pathname)

  if (statique) {
    evenement.respondWith(
      caches.match(requete).then(
        (enCache) =>
          enCache ||
          fetch(requete).then((reponse) => {
            const copie = reponse.clone()
            caches.open(VERSION).then((cache) => cache.put(requete, copie))
            return reponse
          }),
      ),
    )
    return
  }

  evenement.respondWith(
    fetch(requete)
      .then((reponse) => {
        const copie = reponse.clone()
        caches.open(VERSION).then((cache) => cache.put(requete, copie))
        return reponse
      })
      .catch(() => caches.match(requete)),
  )
})
