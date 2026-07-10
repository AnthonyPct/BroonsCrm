# Roadmap / Backlog — idées et chantiers à venir

*Notes de brainstorm avec Anthony (10/07/2026). Rien ici n'est engagé — c'est le vivier.*

## ✅ Livré (10/07/2026)

- Encart séance d'essai gratuite (accueil)
- FAQ licence (accordéon, 7 questions)
- Suivi Pass'Sport complet : En attente du code → Code reçu → Déclaré à l'État → Remboursé, saisie du code a posteriori, KPIs + reste à récupérer

## 🎯 Chantier majeur : planning de salle & journées à domicile

Automatiser l'organisation des matchs à domicile (aujourd'hui : conclusions de match à saisir dans Gesthand, ordre/horaires à décider, désignations à trouver).

- **Compétences licenciés** : cases `Arbitre`, `Table de marque`, `Responsable de salle` sur la fiche.
- **Table `teams`** (SM1, SF1, U13M…) remplaçant le champ texte libre des licences.
- **Journées à domicile** : date + salle → matchs (équipe, adversaire, horaire, ordre).
- **Ordonnancement proposé** : jeunes tôt, séniors tard, créneaux configurables ; liste d'horaires prête à recopier dans Gesthand (conclusions).
- **Désignations suggérées** : 2 tables + 1 arbitre par match, 1 responsable de salle par journée. Règles : compétence requise, pas de double affectation, ne joue pas en même temps, **équité** (compteur de corvées sur la saison).
- **Sorties** : page publique « Matchs à domicile » + bouton **« Copier pour WhatsApp »** (message formaté prêt à coller). Plus tard : .ics, rappels automatiques.
- Ordre de construction : socle manuel d'abord (fonctionne sans la fédé), sync FFHB ensuite.

## 🏆 Intégration FFHB (classements & calendriers)

Pas d'API officielle, mais les endpoints internes de ffhandball.fr sont accessibles → architecture défensive obligatoire :

- Edge Function `ffhb-sync` (1-2×/jour) → tables cache `standings` / `fixtures` ; le site et le CRM ne lisent QUE le cache.
- Config par équipe : **code de poule** (dans l'URL ffhandball.fr) — à re-saisir chaque saison.
- **Pages équipes publiques** : classement, prochains matchs, derniers résultats.
- **Auto-remplissage du planning** : choisir un samedi → les matchs à domicile du week-end se pré-remplissent depuis les fixtures. Garder l'ajout manuel (amicaux, coupes).
- ⚠️ Sens du flux : FFHB = *quels* matchs ; le CRM = *quels horaires* (jamais l'inverse).
- Première étape le jour J : inspecter les appels réseau du site FFHB pour valider le format.

## ✉️ Communication (dès que `teams` existe)

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
- **V2 email Gesthand** : qualification auto si règle de transfert des mails `[FFHandball]` obtenue (cf. brief §4.6).
