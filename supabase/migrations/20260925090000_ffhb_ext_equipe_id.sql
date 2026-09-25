-- La FFHB regénère les ids INTERNES de ses équipes en cours de saison.
--
-- Constaté le 24/09/2026 : toutes les équipes des poules du club ont changé
-- d'id interne (Séniors M 1764976 → 1815469), alors que leur `ext_equipeId`
-- restait identique (2118882). Les rencontres ne portant que l'id interne,
-- plus aucune ne se rattachait à nos équipes : import des journées vide,
-- page publique tronquée.
--
-- On stocke donc aussi l'id externe, stable, et la synchro (Edge Function
-- `ffhb-sync`, `reconcileTeams`) réaligne l'id interne à chaque passage.
-- Pas de backfill ici : la synchro retrouve l'id externe des équipes déjà
-- reliées, par leur ancien id interne ou par l'id de structure du club.
alter table public.teams
  add column if not exists ffhb_ext_equipe_id text;

comment on column public.teams.ffhb_ext_equipe_id is
  'Id FFHB stable de l''équipe (equipe_options[].ext_equipeId). Sert à réaligner ffhb_equipe_id quand la FFHB le regénère.';

comment on column public.teams.ffhb_equipe_id is
  'Id interne FFHB de l''équipe (equipe_options[].id), joint sur ffhb_rencontres.equipe1_id/equipe2_id. Peut changer en cours de saison : réaligné par la synchro via ffhb_ext_equipe_id.';
