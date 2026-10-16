'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { deposerPieces, type EtatAction } from './actions-pieces'

/**
 * Motiq — tout ce qu'un utilisateur peut apporter, sur un seul ecran.
 *
 * Un seul endroit pour : du texte, des fichiers (images, videos, PDF, Word,
 * Excel), une note vocale, et une photo prise sur le moment. Se separate en
 * quatre formulaires aurait paru plus « range » sur le papier et aurait oblige
 * l'utilisateur a deviner ou deposer quoi.
 *
 * TOUT SE PASSE DANS LE NAVIGATEUR, SAUF L'ANALYSE.
 * L'enregistrement vocal et la camera utilisent des API du navigateur
 * (MediaRecorder, getUserMedia) : aucun aller-retour reseau, donc aucune
 * donnee qui circule avant que l'utilisateur ne valide. La lecture du contenu
 * des documents, elle, se fait sur le serveur.
 */

const ACCEPTE = [
  'image/*',
  'video/*',
  'audio/*',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
  '.csv',
  '.md',
  '.rtf',
].join(',')

export default function EntreePieces({ projetId }: { projetId: string }) {
  const [etat, envoyer, enCours] = useActionState(deposerPieces, {} as EtatAction)
  const [choisis, setChoisis] = useState<File[]>([])
  const champFichiers = useRef<HTMLInputElement>(null)

  // --- note vocale ---------------------------------------------------------
  const [enregistre, setEnregistre] = useState(false)
  const [secondes, setSecondes] = useState(0)
  const [noteVocale, setNoteVocale] = useState<File | null>(null)
  const [transcription, setTranscription] = useState('')
  const [erreurMicro, setErreurMicro] = useState('')
  const enregistreur = useRef<MediaRecorder | null>(null)
  const morceaux = useRef<Blob[]>([])

  // --- camera --------------------------------------------------------------
  const [camera, setCamera] = useState(false)
  const [erreurCamera, setErreurCamera] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const flux = useRef<MediaStream | null>(null)
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!enregistre) return
    const minuteur = setInterval(() => setSecondes((s) => s + 1), 1000)
    return () => clearInterval(minuteur)
  }, [enregistre])

  // On relache TOUJOURS la camera quand on quitte l'ecran : laisser un flux
  // ouvert garde la diode allumee et bloque l'appareil pour les autres.
  useEffect(() => {
    return () => {
      flux.current?.getTracks().forEach((p) => p.stop())
    }
  }, [])

  async function demarrerEnregistrement() {
    setErreurMicro('')
    setTranscription('')
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(media)
      morceaux.current = []

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) morceaux.current.push(e.data)
      }
      rec.onstop = () => {
        // Chrome produit du audio/webm : ce format doit figurer dans les types
        // acceptes au depot, sinon l'enregistrement reussi serait refuse.
        const blob = new Blob(morceaux.current, { type: 'audio/webm' })
        setNoteVocale(new File([blob], `note-vocale-${Date.now()}.webm`, { type: 'audio/webm' }))
        media.getTracks().forEach((p) => p.stop())
      }

      rec.start()
      enregistreur.current = rec
      setSecondes(0)
      setEnregistre(true)
    } catch {
      setErreurMicro(
        'Le microphone n’a pas pu être ouvert. Autorise le micro dans ton navigateur, ou dépose un fichier audio.',
      )
    }
  }

  function arreterEnregistrement() {
    enregistreur.current?.stop()
    setEnregistre(false)
  }

  async function ouvrirCamera() {
    setErreurCamera('')
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      flux.current = media
      setCamera(true)
      // Le flux doit etre attache APRES le rendu de la balise video.
      setTimeout(() => {
        if (video.current) video.current.srcObject = media
      }, 50)
    } catch {
      setErreurCamera(
        'La caméra n’a pas pu être ouverte. Autorise-la dans ton navigateur, ou dépose une photo existante.',
      )
    }
  }

  function fermerCamera() {
    flux.current?.getTracks().forEach((p) => p.stop())
    flux.current = null
    setCamera(false)
  }

  function prendrePhoto() {
    const element = video.current
    if (!element) return
    const toile = document.createElement('canvas')
    toile.width = element.videoWidth || 1080
    toile.height = element.videoHeight || 1920
    toile.getContext('2d')?.drawImage(element, 0, 0, toile.width, toile.height)
    toile.toBlob(
      (blob) => {
        if (blob) {
          setPhoto(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }))
          fermerCamera()
        }
      },
      'image/jpeg',
      0.92,
    )
  }

  const aEnvoyer = [...choisis, ...(noteVocale ? [noteVocale] : []), ...(photo ? [photo] : [])]

  return (
    <>
      <form action={envoyer} className="formulaire">
        <input type="hidden" name="projetId" value={projetId} />

        {/* 1. Les fichiers : plusieurs d'un coup. */}
        <label>
          <span>
            Tes fichiers — images, vidéos, PDF, Word, Excel, texte. Plusieurs à la fois.
          </span>
          <input
            ref={champFichiers}
            type="file"
            name="pieces"
            accept={ACCEPTE}
            multiple
            onChange={(e) => setChoisis(Array.from(e.target.files ?? []))}
          />
        </label>

        {/* 2. La note vocale. */}
        <div className="carte-detail">
          <strong>Note vocale.</strong> Enregistre ta voix : Motiq la transcrit et en fait un
          script.
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            {!enregistre ? (
              <button type="button" className="bouton-secondaire" onClick={demarrerEnregistrement}>
                🎙 Enregistrer
              </button>
            ) : (
              <button type="button" className="bouton-principal" onClick={arreterEnregistrement}>
                ⏹ Arrêter ({secondes} s)
              </button>
            )}
            {noteVocale && (
              <span className="message-succes" style={{ padding: '4px 10px', borderRadius: 8 }}>
                Note vocale prête ({Math.round(noteVocale.size / 1024)} Ko)
              </span>
            )}
          </div>
          {erreurMicro && (
            <p className="message message-erreur" role="alert">
              {erreurMicro}
            </p>
          )}
          {transcription && (
            <p className="carte-detail">
              <strong>Transcription :</strong> {transcription}
            </p>
          )}
        </div>

        {/* 3. La camera. */}
        <div className="carte-detail">
          <strong>Photo sur le moment.</strong> Montre un objet ou un document avec ta caméra.
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            {!camera ? (
              <button type="button" className="bouton-secondaire" onClick={ouvrirCamera}>
                📷 Ouvrir la caméra
              </button>
            ) : (
              <>
                <button type="button" className="bouton-principal" onClick={prendrePhoto}>
                  Prendre la photo
                </button>
                <button type="button" className="bouton-secondaire" onClick={fermerCamera}>
                  Fermer
                </button>
              </>
            )}
            {photo && (
              <span className="message-succes" style={{ padding: '4px 10px', borderRadius: 8 }}>
                Photo prête ({Math.round(photo.size / 1024)} Ko)
              </span>
            )}
          </div>
          {erreurCamera && (
            <p className="message message-erreur" role="alert">
              {erreurCamera}
            </p>
          )}
          {camera && (
            <video
              ref={video}
              autoPlay
              playsInline
              muted
              style={{ marginTop: 10, width: '100%', maxWidth: 320, borderRadius: 12 }}
            />
          )}
        </div>

        <button type="submit" className="bouton-principal" disabled={enCours || aEnvoyer.length === 0}>
          {enCours ? 'Motiq lit tes pièces…' : `Envoyer ${aEnvoyer.length || ''} pièce(s)`}
        </button>

        {aEnvoyer.length > 0 && (
          <p className="carte-detail">
            À envoyer : {aEnvoyer.map((f) => f.name).join(', ')}
          </p>
        )}

        {etat.erreur && (
          <p className="message message-erreur" role="alert" style={{ whiteSpace: 'pre-wrap' }}>
            {etat.erreur}
          </p>
        )}
        {etat.succes && (
          <p className="message message-succes" role="status">
            {etat.succes}
          </p>
        )}
        {etat.rapport && etat.rapport.length > 0 && (
          <div className="note">
            <strong>Ce que Motiq a compris :</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {etat.rapport.map((ligne, i) => (
                <li key={i} style={{ fontSize: 14 }}>
                  {ligne}
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </>
  )
}
