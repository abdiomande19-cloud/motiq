'use client'

import { useActionState, useState } from 'react'
import type { Avis, MonAvis } from '@/lib/data/types'
import { publierAvis, supprimerMonAvis, type EtatAvis } from './avis/actions'

/**
 * Motiq — la section des avis.
 *
 * Un visiteur non connecte LIT les avis. Un utilisateur connecte LIT et ECRIT.
 * S'il a deja ecrit, il retrouve son avis dans le formulaire pour le corriger
 * ou le supprimer : un avis qu'on ne peut plus retirer n'est pas un avis, c'est
 * un piege.
 */

function Etoiles({ note, taille = 20 }: { note: number; taille?: number }) {
  return (
    <span
      className="etoiles"
      style={{ fontSize: taille, letterSpacing: 2 }}
      role="img"
      aria-label={`${note} sur 5`}
    >
      <span style={{ color: '#F5B301' }}>{'★'.repeat(Math.round(note))}</span>
      <span style={{ opacity: 0.25 }}>{'★'.repeat(5 - Math.round(note))}</span>
    </span>
  )
}

export default function SectionAvis({
  avis,
  monAvis,
  connecte,
}: {
  avis: Avis[]
  monAvis: MonAvis | null
  connecte: boolean
}) {
  const [etat, envoyer, enCours] = useActionState(publierAvis, {} as EtatAvis)
  const [note, setNote] = useState(monAvis?.note ?? 0)
  const [survol, setSurvol] = useState(0)

  const masque = monAvis?.statut === 'masque'

  return (
    <section id="avis" className="section-avis">
      <div className="section-titre">
        <h2>Avis des utilisateurs</h2>
        <p className="sous-titre">
          {avis.length === 0
            ? 'Aucun avis publié pour l’instant. Motiq vient de démarrer — nous préférons te le dire plutôt que d’inventer des témoignages.'
            : `${avis.length} avis, publiés par leurs auteurs. Un seul avis par personne : la base l’impose, pas seulement le formulaire.`}
        </p>
      </div>

      {avis.length > 0 && (
        <div className="avis-liste">
          {avis.map((a) => (
            <article className="avis" key={a.id}>
              <div className="avis-entete">
                <strong>{a.auteur}</strong>
                <Etoiles note={a.note} />
                <span className="carte-detail">
                  {new Date(a.creeLe).toLocaleDateString('fr-FR')}
                </span>
                {a.estAMoi && <span className="carte-detail">— c’est le tien</span>}
              </div>
              <p className="avis-texte">{a.commentaire}</p>
            </article>
          ))}
        </div>
      )}

      {!connecte ? (
        <div className="note">
          <strong>Tu veux donner ton avis ?</strong> Connecte-toi : la base n’accepte un avis que
          d’une personne identifiée. C’est ce qui rend les notes difficiles à falsifier.
        </div>
      ) : (
        <form action={envoyer} className="formulaire formulaire-avis">
          {/* Pot de miel : invisible pour un humain, rempli par les robots. */}
          <label className="pot-de-miel" aria-hidden="true">
            <span>Site web</span>
            <input type="text" name="site_web" tabIndex={-1} autoComplete="off" />
          </label>

          <div className="note">
            {monAvis
              ? 'Tu as déjà publié un avis : tu peux le corriger ou le supprimer ci-dessous.'
              : 'Ton avis sera publié avec ton prénom seulement — jamais ton nom complet ni ton adresse.'}
            {masque && (
              <p className="message message-erreur" role="alert" style={{ marginTop: 8 }}>
                Ton avis a été masqué{monAvis?.motifMasquage ? ` (${monAvis.motifMasquage})` : ''}.
                Corrige-le et il sera republié.
              </p>
            )}
          </div>

          <div className="choix-note" onMouseLeave={() => setSurvol(0)}>
            <span>Ta note :</span>
            {[1, 2, 3, 4, 5].map((valeur) => (
              <button
                key={valeur}
                type="button"
                className="etoile-bouton"
                onMouseEnter={() => setSurvol(valeur)}
                onClick={() => setNote(valeur)}
                aria-label={`${valeur} étoile${valeur > 1 ? 's' : ''}`}
                style={{ color: valeur <= (survol || note) ? '#F5B301' : 'inherit', opacity: valeur <= (survol || note) ? 1 : 0.3 }}
              >
                ★
              </button>
            ))}
            <input type="hidden" name="note" value={note} />
            <span className="carte-detail">
              {note === 0 ? 'clique une étoile' : `${note} sur 5`}
            </span>
          </div>

          <label>
            <span>Ton commentaire (10 caractères minimum)</span>
            <textarea
              name="commentaire"
              rows={4}
              minLength={10}
              maxLength={2000}
              defaultValue={monAvis?.commentaire ?? ''}
              placeholder="Qu’est-ce qui t’a plu ? Qu’est-ce qui t’a manqué ?"
            />
          </label>

          <button type="submit" className="bouton-principal" disabled={enCours || note === 0}>
            {enCours ? 'Envoi…' : monAvis ? 'Mettre à jour mon avis' : 'Publier mon avis'}
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
      )}

      {connecte && monAvis && (
        <form action={supprimerMonAvis} style={{ marginTop: 12 }}>
          <input type="hidden" name="avisId" value={monAvis.id} />
          <button type="submit" className="bouton-mini bouton-danger-leger">
            Supprimer mon avis
          </button>
        </form>
      )}
    </section>
  )
}
