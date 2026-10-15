/**
 * Motiq — editeur de scenes (composant client).
 *
 * L'utilisateur decoupe son script en scenes : ajouter, retirer, remonter,
 * descendre, changer les textes et les durees. La duree totale est affichee en
 * direct — mais c'est le SERVEUR qui la recalcule et la valide : si le
 * navigateur etait modifie, la base refuserait quand meme.
 */

'use client'

import { useActionState, useState } from 'react'
import type { Scene } from '@/lib/data'
import { enregistrerScript, type EtatAction } from './actions'

const DUREE_MIN = 15
const DUREE_MAX = 60

interface Props {
  projetId: string
  titreInitial: string
  scenesInitiales: Scene[]
}

const SCENE_VIDE = (ordre: number): Scene => ({
  ordre,
  texte: '',
  dureeSecondes: 5,
})

export default function EditeurScenes({ projetId, titreInitial, scenesInitiales }: Props) {
  const [titre, setTitre] = useState(titreInitial)
  const [scenes, setScenes] = useState<Scene[]>(
    scenesInitiales.length > 0 ? scenesInitiales : [SCENE_VIDE(1)],
  )
  const [etat, envoyer, enCours] = useActionState(enregistrerScript, {} as EtatAction)

  const total =
    Math.round(scenes.reduce((somme, s) => somme + (Number(s.dureeSecondes) || 0), 0) * 10) / 10
  const totalValide = total >= DUREE_MIN && total <= DUREE_MAX

  function renuméroter(liste: Scene[]): Scene[] {
    return liste.map((s, i) => ({ ...s, ordre: i + 1 }))
  }

  function modifier(index: number, champ: 'texte' | 'dureeSecondes', valeur: string) {
    setScenes((precedent) =>
      precedent.map((s, i) =>
        i === index
          ? { ...s, [champ]: champ === 'dureeSecondes' ? Number(valeur) : valeur }
          : s,
      ),
    )
  }

  function ajouter() {
    setScenes((precedent) => renuméroter([...precedent, SCENE_VIDE(precedent.length + 1)]))
  }

  function retirer(index: number) {
    setScenes((precedent) => {
      const suite = precedent.filter((_, i) => i !== index)
      return renuméroter(suite.length > 0 ? suite : [SCENE_VIDE(1)])
    })
  }

  function deplacer(index: number, sens: -1 | 1) {
    setScenes((precedent) => {
      const cible = index + sens
      if (cible < 0 || cible >= precedent.length) return precedent
      const copie = [...precedent]
      ;[copie[index], copie[cible]] = [copie[cible], copie[index]]
      return renuméroter(copie)
    })
  }

  return (
    <form action={envoyer} className="formulaire">
      <input type="hidden" name="projetId" value={projetId} />
      {/* Le serveur relit ce JSON et recalcule tout : il n'est pas cru sur le total. */}
      <input type="hidden" name="scenes" value={JSON.stringify(scenes)} />

      <label>
        <span>Titre de la video</span>
        <input
          type="text"
          name="titreScript"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Le titre qui apparaitra"
        />
      </label>

      <div className={totalValide ? 'compteur compteur-ok' : 'compteur compteur-ko'}>
        <strong>{total} s</strong> — le cahier des charges impose entre {DUREE_MIN} et {DUREE_MAX} s
        {!totalValide && (
          <span>
            {total < DUREE_MIN
              ? ` : il manque ${Math.round((DUREE_MIN - total) * 10) / 10} s`
              : ` : il y a ${Math.round((total - DUREE_MAX) * 10) / 10} s en trop`}
          </span>
        )}
      </div>

      <div className="scenes">
        {scenes.map((scene, index) => (
          <div key={index} className="scene">
            <div className="scene-entete">
              <span className="scene-numero">Scene {index + 1}</span>
              <div className="scene-outils">
                <button
                  type="button"
                  className="bouton-mini"
                  onClick={() => deplacer(index, -1)}
                  disabled={index === 0}
                  aria-label="Monter la scene"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="bouton-mini"
                  onClick={() => deplacer(index, 1)}
                  disabled={index === scenes.length - 1}
                  aria-label="Descendre la scene"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="bouton-mini bouton-danger-leger"
                  onClick={() => retirer(index)}
                  aria-label="Retirer la scene"
                >
                  Retirer
                </button>
              </div>
            </div>

            <textarea
              value={scene.texte}
              onChange={(e) => modifier(index, 'texte', e.target.value)}
              rows={2}
              placeholder="Le texte affiche a l'ecran, et lu en sous-titre"
            />

            <label className="scene-duree">
              <span>Duree</span>
              <input
                type="number"
                min={1}
                max={30}
                step={0.5}
                value={scene.dureeSecondes}
                onChange={(e) => modifier(index, 'dureeSecondes', e.target.value)}
              />
              <span>secondes</span>
            </label>
          </div>
        ))}
      </div>

      <div className="carte-actions">
        <button type="button" className="bouton-secondaire" onClick={ajouter}>
          + Ajouter une scene
        </button>
        <button type="submit" className="bouton-principal" disabled={enCours}>
          {enCours ? 'Enregistrement...' : 'Enregistrer le script'}
        </button>
      </div>

      {etat.erreur && (
        <p className="message message-erreur" role="alert">
          {etat.erreur}
        </p>
      )}
      {etat.succes && (
        <p className="message message-succes" role="status">
          {etat.succes}
        </p>
      )}
    </form>
  )
}
