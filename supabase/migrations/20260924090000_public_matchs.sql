-- Page publique « Matchs » : prochains matchs et résultats de la saison.
--
-- Le site public ne lit aucune table : tout passe par une RPC `security
-- definer` qui ne renvoie que des colonnes publiables. Les arbitres FFHB ne
-- sortent pas, et les membres du club n'apparaissent que sous la forme
-- « Prénom N. », comme dans `get_public_matchdays`.
--
-- Deux sources, réunies en une seule liste :
--   1. les rencontres FFHB des équipes reliées à une poule, enrichies du
--      planning de salle quand la rencontre a été importée dans une journée ;
--   2. les matchs saisis à la main dans le CRM (amicaux, coupe, tournois), ou
--      dont la rencontre a disparu du cache.
--
-- Le découpage « à venir / résultats » est fait côté application
-- (src/lib/matchs.ts) : la fonction renvoie toute la saison, le volume reste
-- de quelques centaines de lignes.
create or replace function public.get_public_matchs()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with saison as (
    select id from public.seasons where is_current
  ),
  equipes as (
    select t.id, t.name, t.is_youth, t.sort_order, t.ffhb_poule_id, t.ffhb_equipe_id
    from public.teams t
    join saison s on s.id = t.season_id
  ),
  ffhb as (
    select
      'ffhb-' || r.ext_rencontre_id as key,
      -- Le planning fait foi s'il existe : c'est lui qui fixe le jour et
      -- l'heure réels à la salle du Chalet.
      coalesce(
        md.date,
        ml.date,
        (r.date_heure at time zone 'Europe/Paris')::date,
        (
          select (j ->> 'dateDebut')::date
          from public.ffhb_poules p, jsonb_array_elements(p.journees) j
          where p.id = r.poule_id and (j ->> 'numero')::integer = r.journee_numero
          limit 1
        )
      ) as day,
      coalesce(
        to_char(coalesce(mm.scheduled_at, ml.scheduled_at), 'HH24hMI'),
        to_char(r.date_heure at time zone 'Europe/Paris', 'HH24hMI')
      ) as time,
      md.id is null and ml.id is null and r.date_heure is null as date_tbc,
      e.id as team_id,
      (e.ffhb_equipe_id = r.equipe1_id) as home,
      case when e.ffhb_equipe_id = r.equipe1_id then r.equipe2_libelle else r.equipe1_libelle end as opponent,
      case when e.ffhb_equipe_id = r.equipe1_id then r.score1 else r.score2 end as score_for,
      case when e.ffhb_equipe_id = r.equipe1_id then r.score2 else r.score1 end as score_against,
      eq.equipement_id as venue_id,
      eq.libelle as venue_libelle,
      eq.rue as venue_rue,
      eq.code_postal as venue_cp,
      eq.ville as venue_ville,
      eq.latitude as venue_lat,
      eq.longitude as venue_lng,
      r.fdm_code,
      coalesce(mm.id, ml.id) as match_id,
      coalesce(md.id, ml.matchday_id) as matchday_id
    from public.ffhb_rencontres r
    join equipes e
      on e.ffhb_poule_id = r.poule_id
     and e.ffhb_equipe_id in (r.equipe1_id, r.equipe2_id)
    left join public.ffhb_equipements eq on eq.equipement_id = r.equipement_id
    left join public.matchday_matches mm on mm.ffhb_ext_rencontre_id = r.ext_rencontre_id
    left join public.matchdays md on md.id = mm.matchday_id
    -- Match saisi à la main avant l'import FFHB (même équipe, même jour) :
    -- c'est le même match, il apporte son planning à la rencontre.
    left join lateral (
      select mm2.id, mm2.matchday_id, mm2.scheduled_at, md2.date
      from public.matchday_matches mm2
      join public.matchdays md2 on md2.id = mm2.matchday_id
      where mm.id is null
        and mm2.ffhb_ext_rencontre_id is null
        and mm2.team_id = e.id
        and md2.date = (r.date_heure at time zone 'Europe/Paris')::date
      order by mm2.sort_order
      limit 1
    ) ml on true
  ),
  manuels as (
    select
      'crm-' || mm.id as key,
      md.date as day,
      to_char(mm.scheduled_at, 'HH24hMI') as time,
      false as date_tbc,
      e.id as team_id,
      true as home,
      mm.opponent,
      null::integer as score_for,
      null::integer as score_against,
      null::text as venue_id,
      null::text as venue_libelle,
      null::text as venue_rue,
      null::text as venue_cp,
      null::text as venue_ville,
      null::numeric as venue_lat,
      null::numeric as venue_lng,
      null::text as fdm_code,
      mm.id as match_id,
      md.id as matchday_id
    from public.matchday_matches mm
    join public.matchdays md on md.id = mm.matchday_id
    join saison s on s.id = md.season_id
    join equipes e on e.id = mm.team_id
    where (
        mm.ffhb_ext_rencontre_id is null
        or not exists (
          select 1 from public.ffhb_rencontres r
          where r.ext_rencontre_id = mm.ffhb_ext_rencontre_id
        )
      )
      -- Déjà absorbé par sa rencontre FFHB (voir `ml` ci-dessus).
      and not exists (
        select 1 from ffhb f where f.match_id = mm.id
      )
  ),
  tous as (
    select * from ffhb
    union all
    select * from manuels
  )
  select jsonb_build_object(
    'teams', (
      select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name)
        order by e.sort_order, e.name), '[]'::jsonb)
      from equipes e
      where exists (select 1 from tous m where m.team_id = e.id)
    ),
    'matches', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'key', m.key,
        'day', m.day,
        'time', m.time,
        'date_tbc', m.date_tbc,
        'team_id', m.team_id,
        'team', e.name,
        'is_youth', e.is_youth,
        'home', m.home,
        'opponent', m.opponent,
        'played', m.score_for is not null and m.score_against is not null,
        'score_for', m.score_for,
        'score_against', m.score_against,
        'venue', case when m.venue_id is null then null else jsonb_build_object(
          'libelle', m.venue_libelle,
          'rue', m.venue_rue,
          'code_postal', m.venue_cp,
          'ville', m.venue_ville,
          'lat', m.venue_lat,
          'lng', m.venue_lng
        ) end,
        -- La feuille de match n'a de sens qu'une fois le match joué.
        'fdm_code', case when m.score_for is not null then m.fdm_code end,
        'planning', case when m.matchday_id is null then null else jsonb_build_object(
          'hall_manager', (
            select mb.first_name || ' ' || left(mb.last_name, 1) || '.'
            from public.matchdays md
            join public.members mb on mb.id = md.hall_manager_id
            where md.id = m.matchday_id
          ),
          'assignments', (
            select coalesce(jsonb_object_agg(
              ma.role, mb.first_name || ' ' || left(mb.last_name, 1) || '.'
            ), '{}'::jsonb)
            from public.match_assignments ma
            join public.members mb on mb.id = ma.member_id
            where ma.match_id = m.match_id
          )
        ) end
      ) order by m.day, m.time nulls last, e.sort_order), '[]'::jsonb)
      from tous m
      join equipes e on e.id = m.team_id
      where m.day is not null
    )
  );
$$;

revoke all on function public.get_public_matchs() from public, anon;
grant execute on function public.get_public_matchs() to anon, authenticated, service_role;

comment on function public.get_public_matchs() is
  'Matchs de la saison pour le site public : rencontres FFHB des équipes reliées + matchs saisis dans le CRM, avec score, salle et planning de salle.';

-- Les matchs à l'extérieur se cherchent par equipe2_id : sans index, chaque
-- appel balaierait tout le cache.
create index if not exists ffhb_rencontres_equipe2_idx
  on public.ffhb_rencontres (equipe2_id);
