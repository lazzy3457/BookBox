# BooksBox

BooksBox est une application de lecture sociale pour lecteurs francophones. Elle permet de rechercher des livres, gerer sa bibliotheque, publier des reviews, suivre d'autres utilisateurs, consulter les tendances et utiliser une application mobile Expo connectee au meme backend.

Ce README est prevu pour une installation propre sur une autre machine, par exemple depuis un dossier Drive sans `node_modules`, sans `.next` et sans base de donnees locale.

## Sommaire

- Installation web
- Lancement mobile
- Variables d'environnement
- Architecture du projet
- Scripts utiles
- Fonctionnalites principales
- Depannage

## Prerequis

- Node.js 20 ou plus recent.
- npm, installe avec Node.js.
- Docker Desktop lance avant de demarrer PostgreSQL.
- Expo Go sur le telephone pour tester l'application mobile.
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

Le `DATABASE_URL` fourni dans `.env.example` correspond deja au PostgreSQL du fichier `docker-compose.yml`.

Remplacer au minimum `NEXTAUTH_SECRET` par une valeur longue et aleatoire. `GOOGLE_BOOKS_API_KEY` peut rester vide en local, mais une cle Google Books peut etre ajoutee pour fiabiliser les appels a l'API Google.

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

La base de donnees est vide au premier lancement. Creer un compte depuis la page d'inscription pour commencer les tests.

## Lancement mobile

L'application mobile est dans le dossier `mobile/`. Elle n'est pas une WebView : elle consomme les routes API du backend Next.js.

Pour que le telephone puisse joindre le backend, lancer le serveur web depuis la racine avec :

```bash
npm run dev -- -H 0.0.0.0
```

Trouver ensuite l'adresse IPv4 du PC sur le reseau Wi-Fi. Sous Windows :

```bash
ipconfig
```

Depuis le telephone, verifier que l'URL suivante s'ouvre dans Chrome ou Safari :

```bash
http://ADRESSE_IP_DU_PC:3000
```

Exemple :

```bash
http://192.168.1.54:3000
```

Installer les dependances mobiles :

```bash
cd mobile
npm install
```

Creer le fichier `mobile/.env.local` :

```bash
copy .env.example .env.local
```

Sur macOS ou Linux :

```bash
cp .env.example .env.local
```

Modifier `mobile/.env.local` avec l'IP du PC :

```bash
EXPO_PUBLIC_API_URL=http://ADRESSE_IP_DU_PC:3000
```

Exemple :

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.54:3000
```

Lancer Expo :

```bash
npx expo start --lan -c
```

Scanner le QR code avec Expo Go. Le PC et le telephone doivent etre sur le meme reseau Wi-Fi.

## Variables d'environnement

Le fichier `.env` n'est pas versionne. Il doit etre cree a partir de `.env.example`.

Variables cote web :

- `DATABASE_URL` : URL PostgreSQL utilisee par Prisma.
- `NEXTAUTH_URL` : URL du site, par exemple `http://localhost:3000`.
- `NEXTAUTH_SECRET` : secret utilise par NextAuth.
- `GOOGLE_BOOKS_API_KEY` : optionnel en local, utilise cote serveur pour Google Books.
- `MOBILE_JWT_SECRET` : secret pour les tokens mobiles. Si absent, le code reutilise `NEXTAUTH_SECRET`.

Variable cote mobile, dans `mobile/.env.local` :

- `EXPO_PUBLIC_API_URL` : URL du backend accessible depuis le telephone.

Open Library ne demande pas de cle API pour l'usage actuel.

## Architecture du projet

Le projet est organise en deux applications qui partagent le meme backend et la meme base de donnees.

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
    components/           Composants React reutilisables
    server/               Logique serveur
      actions/            Actions serveur
      auth/               NextAuth, mots de passe, token mobile
      db/                 Client Prisma
      http/               Erreurs API
      services/           Google Books, Open Library, feed, tendances
      validation/         Schemas de validation
    lib/                  Helpers partages
    types/                Types TypeScript globaux
  mobile/
    App.tsx               Entree de l'application Expo
    src/
      api/                Client API mobile
      auth/               Contexte d'authentification mobile
      components/         Composants React Native
      screens/            Ecrans mobiles
      lib/                Helpers mobiles
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
- Le mobile Expo consomme le backend Next.js via `EXPO_PUBLIC_API_URL`.

### Base de donnees

Le schema principal est dans `prisma/schema.prisma`. Les tables principales sont :

- `User` : comptes utilisateurs.
- `Book` : livres importes ou ajoutes manuellement.
- `UserBook` : bibliotheque personnelle et statut de lecture.
- `Review` : avis et notes.
- `ReviewComment` : commentaires de reviews.
- `ReviewReaction` et `ReviewCommentReaction` : likes et reactions.
- `Follow` : abonnements entre utilisateurs.
- `BookList` et `BookListEntry` : listes de livres.

## Scripts utiles

Depuis la racine :

- `npm run dev` : lance le serveur de developpement.
- `npm run build` : genere Prisma puis build Next.js.
- `npm run start` : lance le build de production.
- `npm run lint` : lance ESLint.
- `npm test` : lance les tests Vitest.
- `npm run prisma:generate` : genere le client Prisma.
- `npm run prisma:migrate` : applique les migrations en developpement.
- `npm run prisma:studio` : ouvre Prisma Studio.

Depuis `mobile/` :

- `npm run start` : lance Expo.
- `npm run android` : lance Expo vers Android si le SDK Android est configure.
- `npm run ios` : lance Expo vers iOS si l'environnement le permet.
- `npm run web` : lance la cible web Expo.
- `npm run typecheck` : verifie TypeScript cote mobile.

## Verification avant rendu

Depuis la racine :

```bash
npm run lint
npm test
npm run build
```

Depuis `mobile/` :

```bash
npm run typecheck
```

## Fonctionnalites principales

- Recherche de livres via Google Books et Open Library.
- Recherche par titre, auteur ou ISBN.
- Import d'un livre externe ou ajout manuel.
- Bibliotheque personnelle avec statuts de lecture et favoris.
- Fiches livres avec statistiques, reviews, commentaires et activite sociale.
- Pages auteurs avec biographie, livres connus et editions externes.
- Reviews avec note, spoiler, edition, suppression, likes et commentaires.
- Profils publics et page communaute.
- Systeme de follow/unfollow.
- Feed social et tendances.
- Listes de livres personnalisables.
- Interface web responsive avec navigation mobile.
- Application mobile Expo : accueil, recherche, bibliotheque, communaute, profils, listes, favoris et fiches livres.

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

Le mobile reutilise aussi certaines routes web compatibles avec le token mobile : `/api/auth/signup`, `/api/books/search`, `/api/books`, `/api/library`, `/api/reviews` et `/api/follows`.

## Depannage

Si Docker signale que le port `5432` est deja utilise, arreter l'autre PostgreSQL local ou modifier le port expose dans `docker-compose.yml`, puis adapter `DATABASE_URL` dans `.env`.

Si `prisma generate` ou `npm run build` echoue sous Windows avec une erreur `EPERM` sur le moteur Prisma, arreter le serveur Next.js puis relancer la commande.

Si le mobile ne se connecte pas au backend :

- verifier que le backend est lance avec `npm run dev -- -H 0.0.0.0` ;
- verifier que le telephone ouvre `http://ADRESSE_IP_DU_PC:3000` dans son navigateur ;
- verifier que `mobile/.env.local` contient la meme IP ;
- relancer Expo avec `npx expo start --lan -c` ;
- autoriser Node.js dans le pare-feu Windows si une alerte apparait.

## Remarque sur la documentation d'architecture

Le fichier `architecture.md` vient d'une phase de conception anterieure. Le projet actuel fait foi dans ce README : il utilise Next.js, Prisma, PostgreSQL et Expo.
