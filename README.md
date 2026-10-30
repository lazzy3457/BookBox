# BooksBox

BooksBox est une application de lecture sociale pour lecteurs francophones. Elle réunit bibliothèque, journal de lecture, reviews, recommandations personnalisées, import Goodreads/CSV, listes, communauté, ainsi qu’un parcours de lecture avec XP, niveaux, séries et badges. Le web Next.js est le client principal ; une application mobile Expo, maintenue dans le dépôt [Bookbox_Mobile](https://github.com/ZeiMox/Bookbox_Mobile), consomme le même backend.

Ce README est prevu pour une installation propre sur une autre machine, par exemple depuis un dossier Drive sans `node_modules`, sans `.next` et sans base de donnees locale.

## Sommaire

- Installation web
- Backend pour l'application mobile
- Variables d'environnement
- Architecture du projet
- Scripts utiles
- Fonctionnalites principales
- Documentation complémentaire
- Depannage

## Prerequis

- Node.js 20 ou plus recent.
- npm, installe avec Node.js.
- Docker Desktop lance avant de demarrer PostgreSQL.
- Git est optionnel si le projet est fourni en archive ou via Drive.

## Installation web

Depuis la racine du projet :

```bash
npm install
```

Creer le fichier `.env` depuis le modele :

```bash
copy .env.example .env
```

Sur macOS ou Linux :

```bash
cp .env.example .env
```

Pour le PostgreSQL du fichier `docker-compose.yml`, renseigner `DATABASE_URL="postgresql://booksbox:booksbox@localhost:5432/booksbox?schema=public"` (valeur rappelée en commentaire dans `.env.example`).

Remplacer au minimum `NEXTAUTH_SECRET` par une valeur longue et aleatoire. En production, renseigner `NEXTAUTH_URL` et `NEXT_PUBLIC_APP_URL` avec l'URL publique en HTTPS afin de générer correctement les liens d’e-mail, le sitemap et les aperçus de partage. `GOOGLE_BOOKS_API_KEY` reste optionnelle en local.

Avant l'ouverture publique, renseigner également les variables de contact, juridiques, d’hébergement et SMTP. La liste complète figure dans `.env.example` et [docs/launch-checklist.md](docs/launch-checklist.md).

Lancer PostgreSQL avec Docker :

```bash
docker compose up -d
```

Appliquer les migrations et generer Prisma :

```bash
npm run prisma:migrate
npm run prisma:generate
```

Lancer le site :

```bash
npm run dev
```

Le site est disponible sur `http://localhost:3000`.

Une branche qui modifie le schéma peut utiliser sa propre base locale, copiée depuis `booksbox`, avec `npm run db:branch`. Le fonctionnement des environnements (développement, staging, production) est décrit dans [docs/environnements.md](docs/environnements.md).

La base de données est vide au premier lancement. Une nouvelle inscription doit recevoir un e-mail de vérification : configure les variables `SMTP_*` pour tester ce parcours. Sans SMTP en développement, le compte est créé mais aucun e-mail n’est envoyé.

## Backend pour l'application mobile

L'application mobile Expo est maintenue dans un dépôt séparé : https://github.com/ZeiMox/Bookbox_Mobile (installation, variables `EXPO_PUBLIC_*`, notifications push et builds EAS y sont documentées). Elle n'est pas une WebView : elle consomme les routes API de ce backend.

Pour qu'un telephone puisse joindre le backend en local, lancer le serveur web depuis la racine avec :

```bash
npm run dev -- -H 0.0.0.0
```

Trouver ensuite l'adresse IPv4 du PC sur le reseau Wi-Fi (`ipconfig` sous Windows) et verifier depuis le telephone que `http://ADRESSE_IP_DU_PC:3000` s'ouvre dans le navigateur. C'est cette adresse que l'application mobile doit utiliser comme `EXPO_PUBLIC_API_URL`.

## Variables d'environnement

Le fichier `.env` n'est pas versionne. Il doit etre cree a partir de `.env.example`.

Variables cote web :

- `DATABASE_URL` : URL PostgreSQL utilisee par Prisma.
- `NEXTAUTH_URL` : URL du site, par exemple `http://localhost:3000`.
- `NEXT_PUBLIC_APP_URL` : URL publique canonique du site.
- `NEXTAUTH_SECRET` : secret utilise par NextAuth.
- `GOOGLE_BOOKS_API_KEY` : optionnel en local, utilise cote serveur pour Google Books.
- `MOBILE_JWT_SECRET` : secret pour les tokens mobiles. Si absent, le code reutilise `NEXTAUTH_SECRET`.
- `RATE_LIMIT_SECRET` : secret utilise pour hacher les identifiants du limiteur de requetes.
- `CONTACT_EMAIL` et `DSA_CONTACT_EMAIL` : points de contact public et moderation legale.
- `LEGAL_*` et `HOST_*` : identification de l'editeur particulier et de l'hebergeur.
- `SMTP_*` : serveur d'envoi des verifications, recuperations et decisions de moderation.
- `TRUST_PROXY_HEADERS` : active uniquement derriere un proxy connu qui reecrit les en-tetes d'adresse client.
- `INACTIVE_ACCOUNT_POLICY_CONFIRMED` : doit valoir `confirmed` apres validation de la politique d'inactivite.

Les droits de moderation sont stockes en base et accordes avec `npm run admin:grant -- adresse@email.fr`.

Open Library ne demande pas de cle API pour l'usage actuel.

## Architecture du projet

Ce depot contient le site web et le backend. L'application mobile (depot Bookbox_Mobile) consomme les memes routes API.

```text
BooksBox/
  src/
    app/                  Pages web Next.js et routes API
      api/                API web et API mobile
      books/              Pages livres
      authors/            Pages auteurs
      library/            Bibliotheque utilisateur
      profile/            Profils
      search/             Recherche
      commu/              Communaute
      trending/           Tendances
      parcours/           Parcours de lecture : niveau, serie, calendrier, bareme d'XP
    components/           Composants React reutilisables
    server/               Logique serveur
      actions/            Actions serveur
      auth/               NextAuth, mots de passe, token mobile
      db/                 Client Prisma
      http/               Erreurs API
      services/           Google Books, Open Library, feed, tendances, progression
      validation/         Schemas de validation
    lib/                  Helpers partages (genres, auteurs, site, bareme d'XP et badges)
    types/                Types TypeScript globaux
  prisma/
    schema.prisma         Schema de base de donnees
    migrations/           Migrations PostgreSQL
  scripts/                Scripts utilitaires
  docker-compose.yml      PostgreSQL local
```

### Flux technique

- Le web utilise Next.js App Router, React, TypeScript et Tailwind CSS.
- Les routes API sont dans `src/app/api`.
- L'authentification web utilise NextAuth avec Credentials et Prisma.
- L'authentification mobile utilise des tokens envoyes dans `Authorization: Bearer <token>`.
- Prisma communique avec PostgreSQL via `DATABASE_URL`.
- Docker lance uniquement PostgreSQL en local.
- Les livres externes viennent de Google Books et Open Library, appeles cote serveur.
- L'application mobile (depot Bookbox_Mobile) consomme le backend Next.js via son `EXPO_PUBLIC_API_URL`.

### Base de donnees

Le schema principal est dans `prisma/schema.prisma`. Les tables principales sont :

- `User` : comptes utilisateurs.
- `Book` : livres importes ou ajoutes manuellement, avec leurs genres principaux (`genres`).
- `UserBook` : bibliotheque personnelle, statut de lecture et date d'ajout (`createdAt`).
- `Review` : avis et notes.
- `ReviewComment` : commentaires de reviews.
- `ReviewReaction` et `ReviewCommentReaction` : likes et reactions.
- `Follow` : abonnements entre utilisateurs.
- `BookList` et `BookListEntry` : listes de livres.
- `Notification` : inbox sociale persistante.
- `NotificationPreference` : préférences détaillées pour les likes, commentaires, reviews d’amis et nouveaux followers.
- `UserPreference` : préférences privées de lecture, dont le masquage persistant des spoilers.
- `User.sessionVersion` : invalide les anciennes sessions après un changement de mot de passe.
- `PushToken` : tokens Expo Push enregistres par appareil.
- `ReadingPeriod` et `ReadingEntry` : lectures, relectures et journal de progression.
- `LegalAcceptance` et `AccountToken` : acceptations versionnées et jetons de compte hachés.
- `RecommendationDismissal` : exclusions des recommandations.
- `UserBlock` : blocages réciproques.
- `ModerationReport`, `LegalNotice`, `ModerationAction` et `ModerationAppeal` : modération, décisions et recours.
- `XpEvent` : journal des gains d’XP, une ligne par action et par source (anti-farm).
- `ActivityDay` : XP cumulée par jour et validation des jours du parcours.
- `UserStats` : XP totale, série, record, gels, objectif quotidien et fuseau horaire. Le niveau est calculé à partir de l’XP totale.
- `UserBadge` : paliers de badges obtenus ; le catalogue des badges est défini dans `src/lib/progression.ts`.

## Scripts utiles

Depuis la racine :

- `npm run dev` : lance le serveur de developpement.
- `npm run build` : genere Prisma puis build Next.js.
- `npm run start` : lance le build de production.
- `npm run lint` : lance ESLint.
- `npm test` : lance les tests Vitest.
- `npm run preflight` : contrôle les variables indispensables avant une mise en ligne.
- `npm run admin:grant -- adresse@email.fr` : accorde manuellement le rôle administrateur à un compte vérifié.
- `npm run genres:backfill` : renseigne les genres des livres existants depuis Google Books / Open Library (`-- --dry-run` pour simuler, Node.js 22.18+ requis).
- `npm run prisma:generate` : genere le client Prisma.
- `npm run prisma:migrate` : applique les migrations en developpement.
- `npm run db:deploy` : applique les migrations sans réinitialisation (staging et production).
- `npm run db:branch` : crée une base locale `booksbox_<branche>` copiée depuis `booksbox` et y applique les migrations de la branche.
- `npm run prisma:studio` : ouvre Prisma Studio.

## Verification avant rendu

Depuis la racine :

```bash
npm run lint
npm test
npm run build
```

Le contrôle `npm run preflight` est réservé à une simulation de mise en ligne : il échoue volontairement en local tant que les coordonnées, l’hébergeur, le SMTP et la politique d’inactivité ne sont pas confirmés.

## Fonctionnalites principales

- Recherche de livres via Google Books et Open Library.
- Recherche par titre, auteur ou ISBN.
- Import d'un livre externe ou ajout manuel.
- Genres principaux (Fantasy, Science-fiction, Romance, Policier...) deduits de Google Books / Open Library ou choisis a l'ajout manuel, affiches en badges et filtrables dans la bibliotheque.
- Bibliotheque personnelle avec statuts de lecture, favoris et date d'ajout de chaque livre (affichee et triable).
- Journal de lecture daté, relectures et progression par page, pourcentage ou chapitre.
- Parcours de lecture : XP gagnée sur les actions (livre terminé, review, journal, commentaires, likes…), niveaux progressifs avec titres, objectif quotidien, série avec gels et chemin d’étapes, démarré au premier livre terminé.
- Badges par paliers (Bronze, Argent, Or, Platine) affichés sur les profils, avec le catalogue complet dans les paramètres.
- Recommandations personnalisées explicables avec actions « Pas intéressé » et « Déjà lu ».
- Import Goodreads et CSV BookBox avec prévisualisation et résolution des conflits.
- Fiches livres avec statistiques, reviews, commentaires et activite sociale.
- Pages auteurs avec biographie, livres connus et editions externes.
- Reviews avec note, spoiler, edition, suppression, likes et commentaires.
- Profils publics et page communaute.
- Blocage réciproque, export des données et suppression du compte.
- Vérification d’e-mail et récupération du mot de passe.
- Signalements communautaires et notifications légales avec suivi et contestation.
- Page Paramètres complète : profil, pseudo unique, préférences, notifications, blocages, import/export et sécurité du compte.
- Administration par rôle, masquage de contenu et suspension de compte.
- Systeme de follow/unfollow.
- Feed social et tendances.
- Listes de livres personnalisables.
- Notifications sociales : likes, commentaires/reponses, nouveaux followers et nouvelles reviews d'amis, avec inbox mobile et push systeme.
- Interface web responsive avec navigation mobile.
- SEO, sitemap, manifeste, footer et pages légales.
- Application mobile Expo (depot Bookbox_Mobile) : accueil, recherche, bibliotheque, communaute, profils, listes, favoris et fiches livres.

## Routes API mobiles principales

- `POST /api/mobile/auth/login`
- `POST /api/mobile/auth/logout`
- `GET /api/mobile/auth/me`
- `GET /api/mobile/home`
- `GET /api/mobile/books/:bookId`
- `GET /api/mobile/authors/:authorSlug`
- `GET /api/mobile/profile`
- `PATCH /api/mobile/profile`
- `GET /api/mobile/community`
- `GET /api/mobile/lists`
- `POST /api/mobile/lists`
- `GET /api/mobile/lists/:listId`
- `PATCH /api/mobile/lists/:listId`
- `DELETE /api/mobile/lists/:listId`
- `POST /api/mobile/lists/:listId/books`
- `DELETE /api/mobile/lists/:listId/books?bookId=...`
- `GET /api/mobile/notifications`
- `PATCH /api/mobile/notifications/:notificationId/read`
- `GET /api/mobile/notification-preferences`
- `PATCH /api/mobile/notification-preferences`
- `GET|PATCH /api/settings/profile`
- `GET|PATCH /api/settings/preferences`
- `PATCH /api/settings/password`
- `POST /api/mobile/push-tokens`
- `DELETE /api/mobile/push-tokens`

Le mobile reutilise aussi certaines routes web compatibles avec le token mobile : `/api/auth/signup`, `/api/books/search`, `/api/books`, `/api/library`, `/api/reviews` et `/api/follows`.

Attention : `/api/auth/signup` exige désormais l’âge minimum et les versions juridiques courantes. Le formulaire mobile historique doit être aligné avant de permettre de nouvelles inscriptions depuis le mobile. Les comptes déjà créés continuent à fonctionner.

## Routes de progression

Communes au web et au mobile (session ou token mobile). L’XP n’est jamais attribuée par une route dédiée : elle est enregistrée par les routes existantes après chaque action.

- `GET /api/progression` : niveau, XP, série, objectif du jour, calendrier et derniers gains.
- `PATCH /api/progression` : objectif quotidien et fuseau horaire.
- `POST /api/progression/start` : démarre le parcours si un livre est déjà lu.
- `GET /api/badges` : catalogue des badges et progression de l’utilisateur connecté.
- `GET /api/users/:userId/badges` : niveau et badges publics d’un lecteur.

## Routes web de conformité principales

- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/account/export`
- `DELETE /api/account`
- `POST /api/reports`
- `POST /api/legal-notices`
- `POST /api/legal-notices/status`
- `POST /api/legal-notices/appeal`
- `GET/POST/DELETE /api/blocks`

## Documentation complémentaire

- [Architecture actuelle](docs/architecture.md)
- [Environnements](docs/environnements.md)
- [Checklist de mise en ligne](docs/launch-checklist.md)
- [Conformité web](docs/legal-compliance.md)
- [Référence API](docs/api-reference.md)
- [Exploitation de production](docs/production-operations.md)
- [Registre synthétique des traitements](docs/processing-register.md)
- [Suivi des dépendances](docs/dependency-security.md)

Les archives de conception (PRD, epics, spécification UX) sont rangées dans `docs/archive/`.

## Depannage

Si Docker signale que le port `5432` est deja utilise, arreter l'autre PostgreSQL local ou modifier le port expose dans `docker-compose.yml`, puis adapter `DATABASE_URL` dans `.env`.

Si `prisma generate` ou `npm run build` echoue sous Windows avec une erreur `EPERM` sur le moteur Prisma, arreter le serveur Next.js puis relancer la commande.

Si l'application mobile ne se connecte pas au backend :

- verifier que le backend est lance avec `npm run dev -- -H 0.0.0.0` ;
- verifier que le telephone ouvre `http://ADRESSE_IP_DU_PC:3000` dans son navigateur ;
- autoriser Node.js dans le pare-feu Windows si une alerte apparait.

Le depannage cote application (Expo, notifications push, builds) est documente dans le depot Bookbox_Mobile.
