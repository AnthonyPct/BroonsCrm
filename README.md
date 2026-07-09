# CRM Licences — HBC Pays de Broons

Site web du club + CRM interne de gestion des licences. Remplace l'Excel + AppScript historique : les tarifs (3 parts Fédé/Ligue/Club), la réduction −5 % avant le 10/08, la réconciliation HelloAsso et le reste à charge sont calculés automatiquement. L'admin ne saisit que les exceptions (chèque, espèces, Pass'Sport, ANCV, CAF, licence offerte).

## Stack

- **Next.js 16** (App Router, TypeScript) + Tailwind CSS v4 + shadcn/ui + Recharts
- **Supabase** (projet `HBC Broons` — `htfcpujcypraqdlacgow`, région `eu-west-1`) : Postgres + Auth + Edge Functions
- Déploiement cible : **Vercel** + domaine Hostinger

## Démarrage local

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Variables d'environnement (`.env.local`, non commité) :

```
NEXT_PUBLIC_SUPABASE_URL=https://htfcpujcypraqdlacgow.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clé publishable Supabase>
BACKFILL_SECRET=<même valeur que le secret Edge Function>
```

## Fonctionnel

| Écran | Rôle |
|---|---|
| `/` et `/licence` | Site public : accueil club + tutoriel « prendre sa licence » |
| `/crm/login` | Connexion (compte admin partagé, Supabase Auth) |
| `/crm/dashboard` | KPIs : dû ligue/fédé, à récupérer, encaissé par moyen + graphiques |
| `/crm/licencies` | Liste filtrable + Kanban par statut (`À saisir → En attente → Payée → Qualifiée`) |
| `/crm/licencies/[id]` | Fiche : tarif 3 parts, réduction, paiements, reste à charge, case qualification |
| `/crm/reconciliation` | Commandes HelloAsso + file d'arbitrage (cas parent-payeur) |
| `/crm/parametres/tarifs` | Grille tarifaire éditable + règle de réduction |
| `/crm/parametres/integrations` | Statut HelloAsso, URL du webhook, rattrapage manuel |
| `/crm/saison` | Import extract Gesthand / Excel (xlsx, csv) avec catégorie auto |

**Règles métier clés**

- Catégorie/tarif déterminés par **l'année de naissance** (bornes dans `tariff_grid`), override manuel possible.
- **Réduction** : −5 % sur la part Ligue si `registered_at ≤ discount_deadline` (10/08). Calculée dans la vue SQL `license_financials` — une seule source de vérité.
- **Statut paiement** : `Payée` dès que encaissé ≥ dû − 10 € (tolérance), sinon `Partielle`/`Impayée`.
- **Rapprochement HelloAsso** : nom+prénom normalisés (sans accents/casse), y compris le porteur de licence dans les items de commande (cas parent-payeur) ; secours par email ; sinon file d'arbitrage manuelle.
- **Qualification** : bascule manuelle (Gesthand reste la source de vérité).

## Intégration HelloAsso

Deux Edge Functions Supabase (déployées) :

- `helloasso-webhook` — reçoit les notifications temps réel (`?secret=<WEBHOOK_SECRET>` dans l'URL). Idempotente (upsert par id HelloAsso).
- `helloasso-backfill` — rattrapage complet via l'API v5 (OAuth2 `client_credentials`, pagination `continuationToken`). Déclenchée par le bouton du CRM (header `x-backfill-secret`).

**Mise en service (une fois)** — voir aussi l'écran Intégrations du CRM :

1. Régénérer les clés API HelloAsso (les anciennes étaient exposées dans l'AppScript) : Mon compte → Intégrations et API.
2. Dans Supabase → Edge Functions → Secrets, définir :
   `HELLOASSO_CLIENT_ID`, `HELLOASSO_CLIENT_SECRET`, `HELLOASSO_ORG_SLUG`, `WEBHOOK_SECRET`, `BACKFILL_SECRET`.
3. Dans HelloAsso → Notifications (webhook), coller :
   `https://htfcpujcypraqdlacgow.supabase.co/functions/v1/helloasso-webhook?secret=<WEBHOOK_SECRET>`
4. Renseigner le slug de l'asso dans CRM → Paramètres → Intégrations, puis « Rattrapage HelloAsso ».

> Tant que les secrets Edge Functions ne sont pas définis, des valeurs par défaut générées (préfixes `hbc_wh_` / `hbc_bf_`, voir `.env.local` et gestionnaire de secrets) sont utilisées — les définir explicitement en production est recommandé.

## Base de données

Schéma dans les migrations Supabase (`initial_schema`, `seed_season_2026_2027`, `security_hardening`) : `seasons`, `members`, `tariff_grid`, `licenses`, `payments`, `helloasso_orders`, `helloasso_payments`, `app_settings`, vue `license_financials`, fonctions de rapprochement (`try_match_ha_order`, `apply_ha_match`).

- **RLS activé partout** — accès réservé au rôle `authenticated` (compte admin unique partagé) ; les Edge Functions utilisent la service key. La politique `USING (true)` est volontaire : un seul rôle admin.
- **RGPD** : purge annuelle → `delete from members;` (cascade licences/paiements) en début de saison, ou garder les membres et ne purger que paiements/commandes.

### Données de démo

La base contient un jeu de démo marqué `TEST-RECETTE` (5 licenciés + commandes HelloAsso simulées + Zoé Testeur + 2 imports). Pour repartir à zéro :

```sql
delete from members where notes = 'TEST-RECETTE' or last_name in ('Testeur', 'Importé');
delete from helloasso_payments where ha_payment_id like '9000%';
delete from helloasso_orders where ha_order_id like '8000%';
```

## Tests

- `pnpm build` + `pnpm lint`
- Recette E2E : `pnpm start -p 3100 &` puis `node recette.e2e.mjs` (31 vérifications : auth, KPIs, filtres, kanban, tarif auto, réduction, tolérance, paiements, qualification, arbitrage, imports…)

## Déploiement

Voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) (Vercel + DNS Hostinger, ~10 min).
