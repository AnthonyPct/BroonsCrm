-- État de santé de la synchro FFHB, pour l'écran Intégrations.
--
-- La péremption est calculée ici et non dans le composant : la règle de pureté
-- de React interdit `Date.now()` pendant le rendu (résultat instable d'un rendu
-- à l'autre), et « maintenant » a de toute façon plus de sens côté base, qui
-- est la source des horodatages comparés.
--
-- Une synchro muette depuis 48 h est le signal d'une panne silencieuse (cron
-- arrêté, secret changé) — à distinguer de « la ligue n'a rien publié ».
create or replace function public.ffhb_sync_health()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'last_synced_at', max(last_synced_at),
    'stale', coalesce(max(last_synced_at) < now() - interval '48 hours', true),
    'en_echec', count(*) filter (where last_sync_status not in ('ok', 'never')),
    'poules', count(*)
  )
  from public.ffhb_poules;
$$;

comment on function public.ffhb_sync_health() is
  'Fraîcheur et état des synchronisations FFHB. `stale` vaut true si rien n''a tourné depuis 48 h.';
