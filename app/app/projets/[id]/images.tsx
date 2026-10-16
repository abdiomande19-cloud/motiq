/**
 * Motiq — images du projet (composant client).
 *
 * Les images sont stockees dans le bucket prive : chaque vignette s'affiche
 * donc par un lien signe fabrique cote serveur, jamais par une adresse
 * publique. Un autre compte ne peut ni les voir ni les retirer.
 */

'use client'

import { useActionState } from 'react'
import {
  deposerImage,
  retirerImageSimple,
  type EtatAction,
} from './actions'

export interface ImageProjet {
  id: string
  nom: string
  poids: string
  /** Lien signe, valable une heure. Null si le fichier n'a pas pu etre signe. */
  lien: string | null
}

interface Props {
  projetId: string
  images: ImageProjet[]
}

export default function ImagesProjet({ projetId, images }: Props) {
  const [etat, envoyer, enCours] = useActionState(deposerImage, {} as EtatAction)

  return (
    <>
      <form action={envoyer} className="formulaire">
        <input type="hidden" name="projetId" value={projetId} />
        <label>
          <span>Ajouter une image (PNG, JPEG, WebP ou SVG — 2 Mo max)</span>
          <input
            type="file"
            name="image"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
          />
        </label>
        <button type="submit" className="bouton-secondaire" disabled={enCours}>
          {enCours ? 'Dépôt...' : 'Envoyer l\u2019image'}
        </button>

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

      {images.length === 0 ? (
        <div className="note">
          Aucune image pour l&apos;instant. Elles serviront au moteur de rendu pour illustrer tes
          scènes — la génération vidéo, elle, attend encore son moteur.
        </div>
      ) : (
        <>
          <p className="carte-detail">
            {images.length} image(s). Chaque vignette passe par un lien signé d&apos;une heure :
            personne d&apos;autre ne peut y accéder.
          </p>
          <div className="images-grille">
            {images.map((image) => (
              <div key={image.id} className="vignette">
                {image.lien ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image.lien} alt={image.nom} />
                ) : (
                  <span className="carte-detail">aperçu indisponible</span>
                )}
                <div className="vignette-nom" title={image.nom}>
                  {image.nom}
                </div>
                <div className="carte-detail">{image.poids}</div>
                <form action={retirerImageSimple}>
                  <input type="hidden" name="projetId" value={projetId} />
                  <input type="hidden" name="assetId" value={image.id} />
                  <button type="submit" className="bouton-mini bouton-danger-leger">
                    Retirer
                  </button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
