# Plan d'implémentation — CRM Licences HBC Pays de Broons

## Contexte

Remplacer l'outil Excel + AppScript de gestion des licences par un site web (public + CRM interne) qui cache toute la complexité : calcul des tarifs en 3 parts (Fédé/Ligue/Club), réduction −5 % sur la part Ligue avant le 10/08, réconciliation automatique HelloAsso, saisie simplifiée des autres moyens de paiement, suivi de qualification manuel, dashboard financier. Un seul rôle admin (compte partagé). Brief produit complet : v3 (voir message d'origine).

## Stack

| Couche | Choix |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript, déployé sur Vercel |
| UI | Tailwind CSS v4 + shadcn/ui, Recharts pour les graphiques |
| Backend | Supabase projet **HBC Broons** (`htfcpujcypraqdlacgow`, eu-west-1, RGPD ok) |
| Auth | Supabase Auth (email/password, compte admin unique) via `@supabase/ssr` |
| Jobs | Edge Functions Deno : `helloasso-webhook` (temps réel) + `helloasso-backfill` (rattrapage, cron pg_cron → pg_net) |
| Secrets | Secrets Edge Functions Supabase (client_id/secret HelloAsso) — jamais dans le code |
| Imports | Parsing XLSX/CSV côté client (SheetJS) |

> Note maquettes : le MCP claude_design nécessite un consentement interactif (`/design consent`) non disponible pendant la session autonome → design implémenté directement depuis le brief (shadcn/ui, identité club navy/ambre). Réconciliation avec les maquettes possible a posteriori.

## Schéma de données (Postgres / Supabase)

- `seasons` — id, label, start_date, end_date, **discount_deadline** (10/08), is_current
- `members` — identité (nom, prénom, ddn, sexe, email, téléphone, adresse, ville, cp), is_board, notes
- `tariff_grid` — season_id, category (label), birth_year_min/max (nullable pour Dirigeant), part_ffhb, part_lbhb, part_hbc, sort_order
- `licenses` — member_id, season_id, tariff_id (catégorie appliquée, auto par année de naissance + override), status enum `a_saisir → attente_paiement → payee → qualifiee`, is_mutation, registered_at (date de prise → déclenche la réduction), discount_rate appliqué, qualified_at, notes
- `payments` — license_id, source enum `{helloasso, passsport, cheque, espece, ancv, caf, offert}`, amount, paid_at, reference, helloasso_payment_id (unique, pour idempotence webhook/backfill)
- `helloasso_orders` — cache brut : ha_order_id unique, payer (nom/prénom/email), items jsonb, montant, raw jsonb, match_status enum `{matched, pending, ignored}`, matched_license_id
- `helloasso_payments` — échéances : ha_payment_id unique, ha_order_id, amount, status, date, raw jsonb
- `app_settings` — clé/valeur (slug HelloAsso, statut webhook, last_backfill_at…)
- Vue `license_financials` — dû (3 parts avec réduction), encaissé (somme payments), reste à charge, statut paiement dérivé (`payee` si encaissé ≥ dû − 10 €)
- Fonction SQL `norm_text()` (unaccent+lower) pour le rapprochement nom+prénom ; fonction `match_helloasso_order()` utilisée par webhook & backfill
- **RLS activé partout** : lecture/écriture réservées au rôle `authenticated` ; les Edge Functions utilisent la service key
- Seed : saison 2026-2027 (deadline réduction 2026-08-10), grille Annexe A, compte admin

## Structure de l'app

```
app/
  (public)/            → accueil club, /licence (tutoriel pas à pas)
  crm/login            → connexion
  crm/(protected)/     → middleware auth
    dashboard          → KPIs (dû ligue, à récupérer, encaissé par moyen) + Recharts
    licencies          → tableau filtrable + vue Kanban par statut
    licencies/[id]     → fiche : tarif 3 parts, paiements, reste à charge, case qualification
    licencies/nouveau  → formulaire, catégorie/tarif auto, ajout paiement multi-moyens
    reconciliation     → commandes HelloAsso + file d'arbitrage parent-payeur
    parametres/tarifs  → grille éditable par saison + règle réduction
    parametres/integrations → statut HelloAsso (webhook, backfill)
    saison             → imports (extract Gesthand, Excel historique)
lib/                   → clients supabase (server/browser), moteur tarifs, types DB générés
supabase/functions/    → helloasso-webhook, helloasso-backfill (source versionnée, déployée via MCP)
```

Mutations via Server Actions ; données lues côté server components.

## Intégration HelloAsso

- Webhook (`verify_jwt=false`, idempotent par ha_payment_id/ha_order_id) : réceptionne Order/Payment → upsert cache → tentative de rapprochement nom+prénom normalisés, secours email → si trouvé, création `payments` ; sinon `match_status=pending` (file d'arbitrage)
- Backfill : OAuth2 client_credentials, `GET /v5/organizations/{slug}/forms/Checkout/default/payments` + `/orders`, pagination continuationToken, mêmes upserts idempotents ; déclenchable depuis le CRM + cron quotidien
- Secrets à renseigner par l'admin : `HELLOASSO_CLIENT_ID`, `HELLOASSO_CLIENT_SECRET`, `HELLOASSO_ORG_SLUG` (documentés dans README + écran Intégrations)

## Recette (autonome)

1. `pnpm build` sans erreur + lint
2. Jeu de données de test : licenciés variés (catégories, mutation, dirigeant), paiements multi-moyens, commandes HelloAsso simulées (matchées + arbitrage), échéances
3. Parcours vérifiés via Playwright headless : login, dashboard (KPIs corrects vs calculs attendus), liste/kanban/filtres, fiche licencié (3 parts + réduction + reste à charge + tolérance 10 €), ajout licencié → tarif auto, saisie paiement, arbitrage réconciliation, édition grille, imports, site public
4. Webhook testé par POST simulé sur l'Edge Function déployée ; vérification en base
5. `get_advisors` Supabase (sécurité/perf) après migrations

## Déploiement

1. Repo GitHub `hbc-broons-crm` (gh CLI authentifié) + push
2. Vercel : import du repo (`vercel.json` + env vars documentées : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — si pas de token Vercel local, README pas-à-pas (2 min via dashboard)
3. DNS Hostinger → CNAME vers Vercel (documenté README)
4. Edge Functions déployées sur Supabase via MCP (fait pendant l'implémentation)

## Hors périmètre MVP (V2)

Parsing emails Gesthand (dépend règle de transfert Outlook), relances auto (Resend), analytics multi-saison.
