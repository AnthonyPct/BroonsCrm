# Déploiement — CRM Licences HBC

## 1. Vercel (~5 min)

Le repo GitHub est prêt. Sur [vercel.com](https://vercel.com) :

1. **Add New → Project** → importer le repo `hbc-broons-crm`.
2. Framework détecté automatiquement (Next.js). Ne rien changer.
3. **Environment Variables** :

| Nom | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://htfcpujcypraqdlacgow.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_HszGXEoAAgNRe0uDhpwIJw_KRLLc0ou` |
| `BACKFILL_SECRET` | la même valeur que le secret Edge Function (voir `.env.local`) |

4. **Deploy**. Chaque push sur `main` redéploie automatiquement.

> Alternative CLI : `npx vercel login` puis `npx vercel --prod` depuis le repo.

## 2. Domaine Hostinger (~5 min)

Dans Vercel → Project → Settings → **Domains** : ajouter `hbcpaysdebroons.fr` (et `www.`).

Dans Hostinger → Domaines → Zone DNS :

| Type | Nom | Valeur |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

Vercel provisionne le certificat HTTPS automatiquement (propagation DNS : quelques minutes à 24 h).

## 3. Supabase — secrets Edge Functions (une fois)

Dashboard Supabase → Edge Functions → **Secrets** :

```
HELLOASSO_CLIENT_ID=<clé API HelloAsso régénérée>
HELLOASSO_CLIENT_SECRET=<secret API HelloAsso régénéré>
HELLOASSO_ORG_SLUG=<slug de l'asso, ex: hbc-pays-de-broons>
WEBHOOK_SECRET=<valeur forte, reprise dans l'URL du webhook>
BACKFILL_SECRET=<valeur forte, reprise dans la variable Vercel>
```

⚠️ **Régénérer** les clés HelloAsso : les anciennes étaient en clair dans l'AppScript.

## 4. Webhook HelloAsso (une fois)

HelloAsso → Mon compte → Intégrations et API → **Notifications** :

```
https://htfcpujcypraqdlacgow.supabase.co/functions/v1/helloasso-webhook?secret=<WEBHOOK_SECRET>
```

Puis dans le CRM → Paramètres → Intégrations : renseigner le slug et lancer un « Rattrapage HelloAsso » pour importer l'historique.

## 5. Rattrapage quotidien automatique (optionnel)

Dans Supabase → SQL Editor, planifier le backfill chaque nuit à 4 h :

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'helloasso-backfill-nightly',
  '0 4 * * *',
  $$
  select net.http_post(
    url := 'https://htfcpujcypraqdlacgow.supabase.co/functions/v1/helloasso-backfill',
    headers := jsonb_build_object('x-backfill-secret', '<BACKFILL_SECRET>')
  );
  $$
);
```

## 6. Synchronisation FFHB

> ✅ **Déjà en place au 23/09/2026** : extensions `pg_cron`/`pg_net` installées et
> les deux tâches ci-dessous planifiées. Cette section sert de référence pour
> les reconstituer (changement de secret, nouvelle saison, autre projet).

L'Edge Function `ffhb-sync` lit les calendriers et classements sur ffhandball.fr
et les met en cache. Deux passages suffisent : un le matin pour le calendrier du
week-end à venir, un le dimanche soir pour les résultats.

Le créneau du dimanche est volontairement tardif : les pages de la fédération
sont servies par CloudFront avec un `max-age=3600`, donc une synchro lancée à
19 h peut relire une page figée à 18 h.

```sql
select cron.schedule(
  'ffhb-sync-daily',
  '30 4 * * *',
  $$
  select net.http_post(
    url := 'https://htfcpujcypraqdlacgow.supabase.co/functions/v1/ffhb-sync',
    headers := jsonb_build_object('x-ffhb-secret', '<FFHB_SECRET>', 'Content-Type', 'application/json'),
    body := '{"mode":"sync","scope":"window"}'::jsonb
  );
  $$
);

select cron.schedule(
  'ffhb-sync-sunday-night',
  '0 22 * * 0',
  $$
  select net.http_post(
    url := 'https://htfcpujcypraqdlacgow.supabase.co/functions/v1/ffhb-sync',
    headers := jsonb_build_object('x-ffhb-secret', '<FFHB_SECRET>', 'Content-Type', 'application/json'),
    body := '{"mode":"sync","scope":"window"}'::jsonb
  );
  $$
);
```

Côté application, `FFHB_SECRET` doit exister **dans Vercel** (le bouton
« Synchroniser maintenant » appelle la fonction depuis une server action) et,
idéalement, **dans les secrets Edge Functions** pour ne plus dépendre de la
valeur par défaut codée en dur.

Chaque équipe se relie ensuite à sa poule dans CRM → Paramètres → Équipes :
coller l'URL de la poule sur ffhandball.fr, puis confirmer l'équipe proposée.
À refaire chaque saison, les poules changeant d'identifiant.

## Checklist mise en production

- [ ] Projet Vercel déployé, variables d'env posées
- [ ] Domaine raccordé (DNS Hostinger)
- [ ] Secrets Edge Functions définis (dont clés HelloAsso régénérées)
- [ ] Webhook déclaré côté HelloAsso
- [ ] Rattrapage initial lancé (historique importé)
- [ ] Données de démo purgées (voir README)
- [ ] Mot de passe admin changé si souhaité (Supabase → Authentication → Users)
- [x] `FFHB_SECRET` posé dans Vercel et dans les secrets Edge Functions
- [x] Crons `ffhb-sync` planifiés (23/09/2026)
- [ ] Équipes reliées à leur poule (Séniors M faite ; 8 restantes)
- [ ] (Optionnel) Protection « leaked password » activée : Supabase → Auth → Settings
