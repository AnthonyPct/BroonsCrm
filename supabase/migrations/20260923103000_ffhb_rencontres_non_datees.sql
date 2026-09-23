-- La FFHB ne date les rencontres qu'au fil de la saison.
--
-- Constat sur la poule du club au 23/09/2026 : 132 rencontres en cache, dont
-- seulement 29 datées — les journées 1 à 5. Les 17 suivantes existent (adversaires
-- connus, numéro de journée connu) mais leur champ `date` est null à la source,
-- parce que les horaires sont posés dans Gesthand au fur et à mesure.
--
-- Sans prise en compte de ce cas, préparer une journée à domicile à plus d'un
-- mois ne proposerait aucun match — ce qui viderait la fonctionnalité de son
-- intérêt, puisqu'on prépare justement le planning à l'avance.
--
-- On rattache donc aussi les rencontres non datées, via leur numéro de journée
-- et le calendrier de leur poule (`ffhb_poules.journees`), seule donnée à
-- savoir quel week-end couvre la journée N d'une poule donnée.
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
  where p.id in (select ffhb_poule_id from public.teams where ffhb_poule_id is not null)
    and (
      (
        -- Rencontre datée : la conversion de fuseau est écrite ici, une seule
        -- fois. Comparer un timestamptz à une date sans `at time zone
        -- 'Europe/Paris'` décalerait d'un jour tous les matchs du soir.
        r.date_heure is not null
        and (r.date_heure at time zone 'Europe/Paris')::date between f.debut and f.fin
      )
      or (
        -- Rencontre pas encore datée : on la rattache par sa journée.
        r.date_heure is null
        and exists (
          select 1
          from jsonb_array_elements(p.journees) as j
          where (j ->> 'numero')::integer = r.journee_numero
            and (j ->> 'dateDebut')::date <= f.fin
            and (j ->> 'dateFin')::date >= f.debut
        )
      )
    );
$$;

revoke all on function public.ffhb_rencontres_for_matchday(uuid) from public, anon;
grant execute on function public.ffhb_rencontres_for_matchday(uuid) to authenticated, service_role;

comment on function public.ffhb_rencontres_for_matchday(uuid) is
  'Rencontres couvrant le week-end d''une journée : celles datées dans la fenêtre, plus celles pas encore datées dont la journée de poule couvre ce week-end.';
