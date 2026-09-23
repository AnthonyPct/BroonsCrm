-- Cache local des données de compétition FFHB.
--
-- Le site de la fédération n'expose aucune API : on scrape ses pages depuis
-- l'Edge Function `ffhb-sync`, qui est la SEULE à écrire ici. Le CRM et le
-- site public ne lisent que ce cache, jamais ffhandball.fr en direct.
--
-- Corollaire : aucune de ces tables ne pilote quoi que ce soit. Elles
-- *proposent*. Rien n'écrit jamais dans `matchday_matches` sans un clic humain.

-- ---------------------------------------------------------------------------
-- Équipements (gymnases)
-- ---------------------------------------------------------------------------
-- Volontairement hors saison et sans clé technique : un gymnase est un objet
-- du monde réel, stable d'une année sur l'autre, et l'id externe EST sa clé
-- naturelle. Le scoper par saison obligerait à re-scraper pour rien.
--
-- Attention à l'id retenu : une rencontre porte `equipementId` (id interne,
-- ex. 1162) tandis que la page de la salle expose aussi `ext_equipementId`
-- (1328). C'est le premier qui relie les deux, donc c'est lui la clé.
create table if not exists public.ffhb_equipements (
  equipement_id      text primary key,
  ext_equipement_id  text,
  libelle            text,
  rue                text,
  code_postal        text,
  ville              text,
  latitude           numeric(9,6),
  longitude          numeric(9,6),
  raw                jsonb,
  synced_at          timestamptz not null default now()
);

comment on table public.ffhb_equipements is
  'Salles des rencontres FFHB. Clé = l''id d''équipement porté par la rencontre.';

-- ---------------------------------------------------------------------------
-- Poules suivies
-- ---------------------------------------------------------------------------
-- Table dédiée plutôt que des colonnes sur `teams` : la synchro itère sur des
-- poules (deux équipes peuvent partager la même), l'état de synchro n'a nulle
-- part où vivre sur `teams`, et rencontres et classement ont besoin d'une clé
-- étrangère stable qu'un renommage d'équipe ne casse pas.
create table if not exists public.ffhb_poules (
  id                  uuid primary key default gen_random_uuid(),
  season_id           uuid not null references public.seasons(id) on delete cascade,
  ext_poule_id        text not null,
  ext_saison_id       text not null,
  ext_competition_id  text not null,
  competition_type    text not null,
  competition_slug    text not null,
  label               text not null default '',
  source_url          text not null,
  -- `poules[].journees` de la FFHB : ~22 objets {journee_numero, date_debut,
  -- date_fin}. Jamais requêté en SQL — il sert à trouver la journée couvrant
  -- un samedi donné, ce qui évite de balayer les 22 pages d'une poule.
  journees            jsonb not null default '[]'::jsonb,
  journee_count       integer not null default 0,
  current_journee     integer,
  last_synced_at      timestamptz,
  last_sync_status    text not null default 'never',
  last_sync_error     text,
  last_ext_updated_at timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint ffhb_poules_season_ext_key unique (season_id, ext_poule_id),
  constraint ffhb_poules_status_check check (
    last_sync_status in ('never','ok','partial','error','contract_error','suspicious')
  )
);

create index if not exists ffhb_poules_season_idx on public.ffhb_poules (season_id);

-- ---------------------------------------------------------------------------
-- Rencontres
-- ---------------------------------------------------------------------------
-- `ext_rencontre_id` est unique au niveau FÉDÉRAL, pas seulement dans la poule
-- (vérifié sur deux poules : 36 ids distincts, aucune intersection, même
-- séquence). D'où l'unicité simple, qui rend l'upsert trivial et permet de
-- rattacher un match du planning sans connaître sa poule.
create table if not exists public.ffhb_rencontres (
  id                 uuid primary key default gen_random_uuid(),
  poule_id           uuid not null references public.ffhb_poules(id) on delete cascade,
  ext_rencontre_id   text not null unique,
  journee_numero     integer not null,
  -- La source donne le fuseau. Toute comparaison avec `matchdays.date` doit
  -- passer par `at time zone 'Europe/Paris'` : sans ça, un match à 21h00
  -- tombe le lendemain.
  date_heure         timestamptz,
  equipe1_id         text,
  equipe2_id         text,
  equipe1_libelle    text not null,
  equipe2_libelle    text not null,
  score1             integer,
  score2             integer,
  score1_mt          integer,
  score2_mt          integer,
  -- Lien logique vers ffhb_equipements, sans clé étrangère : une rencontre
  -- peut arriver avant que sa salle ait été résolue.
  equipement_id      text,
  fdm_code           text,
  arbitre1           text,
  arbitre2           text,
  ext_updated_at     timestamptz,
  -- L'objet brut, pour rejouer un mapping sans re-scraper quand le format
  -- change. Même raison que `raw` côté HelloAsso ; ~900 lignes par saison.
  raw                jsonb not null default '{}'::jsonb,
  synced_at          timestamptz not null default now()
);

create index if not exists ffhb_rencontres_poule_journee_idx
  on public.ffhb_rencontres (poule_id, journee_numero);
create index if not exists ffhb_rencontres_poule_date_idx
  on public.ffhb_rencontres (poule_id, date_heure);
create index if not exists ffhb_rencontres_equipement_idx
  on public.ffhb_rencontres (equipement_id) where equipement_id is not null;
-- Le picker du planning cherche les rencontres d'une équipe sur un week-end.
create index if not exists ffhb_rencontres_equipe1_idx
  on public.ffhb_rencontres (equipe1_id) where equipe1_id is not null;

-- ---------------------------------------------------------------------------
-- Classement
-- ---------------------------------------------------------------------------
-- Remplacé en bloc par poule (voir ffhb_replace_classement) : un classement
-- est un tout cohérent, jamais partiel. Un upsert ligne à ligne laisserait des
-- fantômes au premier forfait général et rendrait les rangs incohérents.
create table if not exists public.ffhb_classement (
  id              uuid primary key default gen_random_uuid(),
  poule_id        uuid not null references public.ffhb_poules(id) on delete cascade,
  rang            integer not null,
  equipe_id       text,
  equipe_libelle  text not null,
  points          integer,
  joues           integer,
  gagnes          integer,
  nuls            integer,
  perdus          integer,
  buts_pour       integer,
  buts_contre     integer,
  synced_at       timestamptz not null default now(),
  constraint ffhb_classement_poule_rang_key unique (poule_id, rang)
);

create index if not exists ffhb_classement_poule_idx on public.ffhb_classement (poule_id);

-- ---------------------------------------------------------------------------
-- Journal des synchronisations
-- ---------------------------------------------------------------------------
-- Écart assumé par rapport à HelloAsso, qui se contente d'une date dans
-- `app_settings` : la source est du HTML scrapé, et « depuis quand ça ne
-- marche plus, et pourquoi » est LA question opérationnelle.
create table if not exists public.ffhb_sync_runs (
  id                   uuid primary key default gen_random_uuid(),
  started_at           timestamptz not null default now(),
  finished_at          timestamptz,
  mode                 text not null,
  scope                text,
  poule_id             uuid references public.ffhb_poules(id) on delete set null,
  status               text not null default 'running',
  http_requests        integer not null default 0,
  rencontres_upserted  integer not null default 0,
  equipements_resolved integer not null default 0,
  error                text
);

create index if not exists ffhb_sync_runs_started_idx
  on public.ffhb_sync_runs (started_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Même posture que le reste du schéma : un seul rôle applicatif
-- (`authenticated`, le compte partagé du bureau) ; l'Edge Function écrit avec
-- la service key et contourne donc ces politiques. Le site public ne lit pas
-- ces tables directement mais passe par des RPC `security definer`.
alter table public.ffhb_equipements enable row level security;
alter table public.ffhb_poules      enable row level security;
alter table public.ffhb_rencontres  enable row level security;
alter table public.ffhb_classement  enable row level security;
alter table public.ffhb_sync_runs   enable row level security;

drop policy if exists admin_all on public.ffhb_equipements;
create policy admin_all on public.ffhb_equipements
  for all to authenticated using (true) with check (true);

drop policy if exists admin_all on public.ffhb_poules;
create policy admin_all on public.ffhb_poules
  for all to authenticated using (true) with check (true);

drop policy if exists admin_all on public.ffhb_rencontres;
create policy admin_all on public.ffhb_rencontres
  for all to authenticated using (true) with check (true);

drop policy if exists admin_all on public.ffhb_classement;
create policy admin_all on public.ffhb_classement
  for all to authenticated using (true) with check (true);

drop policy if exists admin_all on public.ffhb_sync_runs;
create policy admin_all on public.ffhb_sync_runs
  for all to authenticated using (true) with check (true);
