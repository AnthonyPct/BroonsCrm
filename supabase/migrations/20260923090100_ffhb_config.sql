-- Rattachement des équipes du club à leur poule FFHB, et des matchs du
-- planning aux rencontres de la fédération.

-- ---------------------------------------------------------------------------
-- Configuration par équipe
-- ---------------------------------------------------------------------------
-- `teams` est déjà scopé par saison et re-saisi chaque été : la config FFHB
-- suit naturellement le même cycle, ce qui correspond au « code de poule à
-- re-saisir chaque saison » de la roadmap.
--
-- `ffhb_equipe_id` est l'id INTERNE de l'équipe côté FFHB — celui que portent
-- `equipe1Id` / `equipe2Id` sur une rencontre, et `equipe_options[].id` dans
-- le sélecteur de poule. Surtout pas `ext_equipeId`, qui n'apparaît nulle part
-- ailleurs et ne joindrait rien.
--
-- Pourquoi un identifiant explicite plutôt qu'un rapprochement sur le nom :
-- le CRM nomme par catégorie (« U15 M »), la FFHB par club (« Pays de broons »,
-- avec une casse au petit bonheur), et une entente peut ne contenir aucun mot
-- du nom du club. Aucune normalisation ne franchit ce fossé, et un faux
-- positif est silencieux — on remplirait une journée avec les matchs d'une
-- autre équipe, ce qui ne se verrait que le samedi. Le flou garde un rôle
-- d'ergonomie (présélection dans la liste via l'id de structure du club),
-- jamais de stockage.
alter table public.teams
  add column if not exists ffhb_poule_id       uuid references public.ffhb_poules(id) on delete set null,
  add column if not exists ffhb_equipe_id      text,
  add column if not exists ffhb_equipe_libelle text;

comment on column public.teams.ffhb_equipe_id is
  'Id interne FFHB de l''équipe (equipe_options[].id), joint sur ffhb_rencontres.equipe1_id/equipe2_id.';
comment on column public.teams.ffhb_equipe_libelle is
  'Snapshot du libellé FFHB au moment du rattachement : sert à l''affichage et à détecter un renommage côté fédération.';

-- Les deux ensemble ou aucun : une poule sans équipe ne permettrait pas de
-- savoir lesquelles de ses rencontres sont les nôtres.
alter table public.teams
  drop constraint if exists teams_ffhb_config_check;
alter table public.teams
  add constraint teams_ffhb_config_check
  check ((ffhb_poule_id is null) = (ffhb_equipe_id is null));

create index if not exists teams_ffhb_poule_idx
  on public.teams (ffhb_poule_id) where ffhb_poule_id is not null;

-- ---------------------------------------------------------------------------
-- Lien planning ↔ rencontre
-- ---------------------------------------------------------------------------
-- Pas de clé étrangère vers `ffhb_rencontres` : le cache est volatile par
-- conception (purgeable, re-synchronisable, vidable par une rupture de
-- contrat). Un `on delete cascade` effacerait des matchs planifiés avec leurs
-- désignations ; un `on delete restrict` bloquerait la purge de saison. On
-- stocke donc l'identifiant du système externe, comme pour les paiements
-- HelloAsso — pas une référence relationnelle.
alter table public.matchday_matches
  add column if not exists ffhb_ext_rencontre_id text,
  add column if not exists ffhb_official_at      timestamptz;

comment on column public.matchday_matches.ffhb_ext_rencontre_id is
  'Rencontre FFHB dont ce match est issu. NULL = saisi à la main (amical, coupe, plateau).';
comment on column public.matchday_matches.ffhb_official_at is
  'Horaire déclaré à la fédération. Purement informatif : scheduled_at reste calculé par le CRM.';

-- Index unique PARTIEL et GLOBAL, pas scopé à la journée : il protège aussi du
-- cas réel « importé dans le mauvais samedi, puis corrigé ». Les matchs
-- manuels valent NULL et ne sont pas contraints — rien n'empêche trois
-- amicaux dans la même journée.
create unique index if not exists matchday_matches_ffhb_uniq
  on public.matchday_matches (ffhb_ext_rencontre_id)
  where ffhb_ext_rencontre_id is not null;

-- Pas de colonne `source` : `ffhb_ext_rencontre_id is not null` dit déjà
-- « importé ». Deux sources de vérité finiraient par diverger.
