# Roadmap / Backlog — idées et chantiers à venir

*Notes de brainstorm avec Anthony (10/07/2026). Rien ici n'est engagé — c'est le vivier.*

## ✅ Livré

- Encart séance d'essai gratuite (accueil) *(10/07)*
- FAQ licence (accordéon, 7 questions) *(10/07)*
- Suivi Pass'Sport complet : statuts, code a posteriori, KPIs + reste à récupérer *(10/07)*
- **Planning de salle & journées à domicile** *(11/07)* : équipes (durées, ordre, critères naissance+genre), compétences licenciés, affectation auto d'équipe, ordonnancement automatique (14h→13h, séniors ≥18h, max 21h15), désignations suggérées (compétence + dispo + équité par rôle), resp. de salle majeur/journée, conclusions Gesthand + export WhatsApp, page publique /matchs

## 🏆 Intégration FFHB (classements & calendriers)

Pas d'API officielle, mais les endpoints internes de ffhandball.fr sont accessibles → architecture défensive obligatoire :

- Edge Function `ffhb-sync` (1-2×/jour) → tables cache `standings` / `fixtures` ; le site et le CRM ne lisent QUE le cache.
- Config par équipe : **code de poule** (dans l'URL ffhandball.fr) — à re-saisir chaque saison.
- **Pages équipes publiques** : classement, prochains matchs, derniers résultats.
- **Auto-remplissage du planning** : choisir un samedi → les matchs à domicile du week-end se pré-remplissent depuis les fixtures. Garder l'ajout manuel (amicaux, coupes).
- ⚠️ Sens du flux : FFHB = *quels* matchs ; le CRM = *quels horaires* (jamais l'inverse).
- Première étape le jour J : inspecter les appels réseau du site FFHB pour valider le format.

## ✉️ Communication (`teams` existe désormais → débloqué)

- **Copier les emails** d'une équipe / catégorie / **de n'importe quelle liste filtrée** (ex. impayés, non-qualifiés).
- `mailto:` pré-rempli (Cci) — zéro infra.
- Copier les **téléphones** d'une équipe (création du groupe WhatsApp de saison).
- Convocation du samedi par équipe (variante du message WhatsApp planning).
- V2 : envoi direct via Resend (relances impayés, échéances échouées — déjà au brief) avec historique.

## ⚡ Gains rapides site public

- **Bandeau d'actus** géré depuis le CRM (table `announcements`).
- **OpenGraph** + image de partage, sitemap, favicon club.
- Lien calendrier/résultats du club sur ffhandball.fr (en attendant les pages équipes).

## ⚡ Gains rapides CRM

- **Export CSV** de la liste filtrée des licenciés.
- **Relance impayés semi-auto** : bouton « Copier le mail de relance » pré-rempli (montant, échéances).
- **Journal d'activité** (qui a saisi quoi — utile avec le compte partagé).
- **Alerte tolérance** : licences « Payée » avec 1-10 € d'écart (compta fin de saison).

## 🏗️ Structurants avant la saison prochaine

- **Bascule de saison** : bouton « Ouvrir la saison suivante » (archive, duplique la grille, prépare les renouvellements).
- **Rapport financier imprimable** pour l'AG (dû ligue, encaissé par moyen, restes).
- **Comptes nominatifs** (2-3 utilisateurs au lieu du compte partagé) — rend le journal d'activité pertinent.
- **V2 email Gesthand** : ❌ **testé le 14/07/2026 — bloqué.** La règle de transfert Outlook fonctionne, mais le serveur rejette l'envoi externe (`550 5.7.520 Your organization does not allow external forwarding`). La boîte club vit dans le tenant Microsoft de la FFHB nationale (`ffhandball.onmicrosoft.com`, adresse canonique `5322002@ffhandball.net`) : ni transfert externe, ni IMAP/Graph sans leur admin. Seule voie restante : ticket à l'assistance FFHB (peu probable). Fallback retenu : bascule manuelle, à améliorer avec une **qualification en masse** depuis la liste des licenciés.
