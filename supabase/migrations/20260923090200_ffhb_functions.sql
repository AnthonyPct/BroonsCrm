-- Fonctions de service de l'intégration FFHB.

-- Remplace le classement d'une poule en une transaction.
--
-- Le garde-fou est dans la fonction, pas dans l'appelant : un tableau vide ne
-- vide jamais le classement en base. Un composant Smartfire renommé côté FFHB
-- ne doit pas effacer ce qui s'affiche sur le site public — il doit laisser la
-- dernière version connue et lever une alerte ailleurs.
create or replace function public.ffhb_replace_classement(
  p_poule_id uuid,
  p_rows     jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    return 0;
  end if;

  delete from public.ffhb_classement where poule_id = p_poule_id;

  insert into public.ffhb_classement (
    poule_id, rang, equipe_id, equipe_libelle,
    points, joues, gagnes, nuls, perdus, buts_pour, buts_contre
  )
  select
    p_poule_id,
    (row ->> 'rang')::integer,
    row ->> 'equipeId',
    coalesce(row ->> 'equipeLibelle', ''),
    (row ->> 'points')::integer,
    (row ->> 'joues')::integer,
    (row ->> 'gagnes')::integer,
    (row ->> 'nuls')::integer,
    (row ->> 'perdus')::integer,
    (row ->> 'butsPour')::integer,
    (row ->> 'butsContre')::integer
  from jsonb_array_elements(p_rows) as row;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.ffhb_replace_classement(uuid, jsonb) from public, anon;
grant execute on function public.ffhb_replace_classement(uuid, jsonb) to service_role;

comment on function public.ffhb_replace_classement(uuid, jsonb) is
  'Remplace le classement d''une poule en bloc. Un tableau vide est ignoré : on ne remplace jamais de la donnée par du vide.';


-- Rencontres du week-end d'une journée, pour le pré-remplissage du planning.
--
-- La conversion de fuseau vit ici, écrite une seule fois : comparer un
-- timestamptz à une date sans `at time zone 'Europe/Paris'` décalerait d'un
-- jour tous les matchs du soir.
create or replace function public.ffhb_rencontres_for_matchday(
  p_matchday_id uuid
)
returns setof public.ffhb_rencontres
language sql
stable
security definer
set search_path = public
as $$
  with jour as (
    select m.date as d, m.season_id
    from public.matchdays m
    where m.id = p_matchday_id
  ),
  fenetre as (
    select
      case extract(isodow from d)
        when 6 then d               -- samedi
        when 7 then d - 1           -- dimanche
        else d - 3                  -- en semaine : ±3 jours
      end as debut,
      case extract(isodow from d)
        when 6 then d + 1
        when 7 then d
        else d + 3
      end as fin,
      season_id
    from jour
  )
  select r.*
  from public.ffhb_rencontres r
  join public.ffhb_poules p on p.id = r.poule_id
  join fenetre f on p.season_id = f.season_id
  where r.date_heure is not null
    and (r.date_heure at time zone 'Europe/Paris')::date between f.debut and f.fin
    and p.id in (select ffhb_poule_id from public.teams where ffhb_poule_id is not null);
$$;

revoke all on function public.ffhb_rencontres_for_matchday(uuid) from public, anon;
grant execute on function public.ffhb_rencontres_for_matchday(uuid) to authenticated, service_role;

comment on function public.ffhb_rencontres_for_matchday(uuid) is
  'Rencontres en cache couvrant le week-end d''une journée, pour les poules effectivement reliées à une équipe.';

-- Correctif appliqué après passage du database linter (voir migration
-- 20260923104500) : Supabase accorde par défaut EXECUTE sur les fonctions du
-- schéma `public` aux rôles `anon` ET `authenticated`. Le revoke ci-dessus ne
-- visait que `public, anon` — n'importe quel utilisateur connecté pouvait donc
-- vider un classement.
revoke execute on function public.ffhb_replace_classement(uuid, jsonb) from authenticated;
