-- ============================================================================
-- MOTIQ — MIGRATION 0006 : decompte du quota, reserve au serveur
--
-- POURQUOI CETTE FONCTION EXISTE
-- La migration 0005 interdit a un utilisateur de modifier son propre quota :
-- sans cela, il pourrait s'offrir des rendus illimites. Mais alors, comment
-- decrementer le quota quand un rendu est demande ?
--
-- Reponse : par une fonction que SEUL LE SERVEUR peut appeler. La cle secrete
-- (role `service_role`) y a acces ; les roles `authenticated` et `anon` en sont
-- explicitement exclus.
--
-- POURQUOI EN SQL ET PAS EN JAVASCRIPT
-- Un « je lis, je soustrais, j'ecris » cote application perd des mises a jour
-- quand deux requetes arrivent en meme temps : deux rendus lances ensemble
-- ne consommeraient qu'un seul credit. Ici, la soustraction est atomique.
--
-- Les quotas exacts par plan restent « a valider » (maquette de phase 1) : la
-- valeur vit dans la ligne du profil, et sera fixee lors de la souscription.
-- Aucun chiffre n'est invente ici.
-- ============================================================================

create or replace function public.decrementer_quota(p_user_id uuid, p_nombre int default 1)
returns public.profiles
language sql
volatile
as $$
  update public.profiles
     set quota_restant = greatest(0, quota_restant - greatest(0, p_nombre)),
         maj_le = now()
   where id = p_user_id
  returning *;
$$;

comment on function public.decrementer_quota(uuid, int) is
  'Decremente le quota d''un utilisateur, de facon atomique. Reservee au serveur (service_role).';

-- Verrouillage : personne d'autre que le serveur ne peut l'appeler.
revoke all on function public.decrementer_quota(uuid, int) from public;
revoke all on function public.decrementer_quota(uuid, int) from anon;
revoke all on function public.decrementer_quota(uuid, int) from authenticated;
grant execute on function public.decrementer_quota(uuid, int) to service_role;
