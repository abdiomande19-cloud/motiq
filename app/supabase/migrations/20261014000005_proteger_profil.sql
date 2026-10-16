-- ============================================================================
-- MOTIQ — MIGRATION 0005 : empecher un utilisateur de s'offrir un plan
--
-- LA FAILLE (trouvee en ecrivant la page des reglages, pas en production)
-- La politique RLS de `profiles` autorise chacun a modifier SA PROPRE ligne :
--
--     create policy profiles_update_sien on public.profiles
--       for update to authenticated using (auth.uid() = id)
--
-- C'est necessaire pour qu'un utilisateur puisse corriger son nom. Mais une
-- politique RLS filtre des LIGNES, pas des COLONNES. Avec son simple jeton,
-- depuis la console du navigateur, n'importe qui pouvait donc executer :
--
--     PATCH /rest/v1/profiles?id=eq.<son id>  { "plan": "business" }
--
-- ...et s'offrir le plan payant. Le quota etait modifiable de la meme facon.
--
-- LA CORRECTION : un declencheur qui refuse toute modification des colonnes
-- sensibles quand la requete vient d'un utilisateur (roles `authenticated`
-- ou `anon`). Le serveur, lui, garde le droit de le faire : c'est lui qui
-- gerera les abonnements a la phase des paiements.
--
-- Les colonnes libres (nom) restent modifiables normalement.
-- ============================================================================

create or replace function public.proteger_colonnes_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  brut text;
  role_courant text;
begin
  -- Le role vient des revendications du jeton. En l'absence de jeton (connexion
  -- directe a la base, tache d'administration), on prend l'utilisateur courant.
  brut := current_setting('request.jwt.claims', true);
  if brut is null or brut = '' then
    role_courant := current_user;
  else
    begin
      role_courant := brut::jsonb ->> 'role';
    exception when others then
      role_courant := current_user;
    end;
  end if;
  role_courant := coalesce(role_courant, current_user);

  -- Seuls les utilisateurs finaux sont brides.
  if role_courant in ('authenticated', 'anon') then
    if new.plan is distinct from old.plan then
      raise exception
        'Le plan ne peut pas etre modifie depuis l''application.'
        using errcode = 'insufficient_privilege';
    end if;

    if new.quota_restant is distinct from old.quota_restant then
      raise exception
        'Le quota ne peut pas etre modifie depuis l''application.'
        using errcode = 'insufficient_privilege';
    end if;

    if new.email is distinct from old.email then
      raise exception
        'L''adresse email se change par un envoi de confirmation, pas directement.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.proteger_colonnes_profil() is
  'Interdit a un utilisateur de modifier son plan, son quota ou son email. Les lignes sont filtrees par RLS ; les colonnes sensibles le sont ici.';

drop trigger if exists trg_proteger_profil on public.profiles;
create trigger trg_proteger_profil before update on public.profiles
  for each row execute function public.proteger_colonnes_profil();
