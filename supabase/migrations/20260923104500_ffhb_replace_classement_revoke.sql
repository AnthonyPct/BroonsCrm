-- Voir 20260923090200_ffhb_functions.sql : revoke execute ... from authenticated
-- `ffhb_replace_classement` efface puis réécrit le classement d'une poule.
-- Seule l'Edge Function de synchro a besoin de l'appeler.
revoke execute on function public.ffhb_replace_classement(uuid, jsonb) from authenticated;
