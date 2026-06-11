# Architecture BooksBox

Date de mise a jour : 2026-06-11

BooksBox est une application full-stack composee d'un site web Next.js, d'une application mobile Expo React Native et d'un backend partage expose via les routes API Next.js. Les deux clients utilisent la meme base PostgreSQL via Prisma.

## Vue d'ensemble

```text
Navigateur web
  -> Next.js App Router
  -> Pages React + Server Components
  -> Routes API Next.js
  -> Services serveur
  -> Prisma
  -> PostgreSQL Docker

Application mobile Expo
  -> Client API mobile
  -> Routes /api/mobile/*
  -> Services serveur partages
  -> Prisma
  -> PostgreSQL Docker

APIs externes
  -> Google Books
  -> Open Library
```

Le backend est volontairement centralise dans l'application Next.js. Le mobile ne possede pas de backend separe : il appelle les routes API du projet web avec `EXPO_PUBLIC_API_URL`.

## Stack technique

### Web et backend

- Next.js App Router.
- React.
- TypeScript.
- Tailwind CSS.
- NextAuth avec provider Credentials.
- Prisma ORM.
- PostgreSQL.
- Zod pour la validation.
- Vitest pour les tests unitaires.
- ESLint pour la qualite de code.

### Mobile

- Expo SDK 54.
- React Native.
- TypeScript.
- React Navigation.
- Expo Secure Store pour stocker le token mobile.

### Infrastructure locale

- Docker Compose lance uniquement PostgreSQL.
- Le serveur Next.js tourne en local avec `npm run dev`.
- Le mode mobile necessite d'exposer Next.js sur le reseau local avec `npm run dev -- -H 0.0.0.0`.

## Structure des dossiers

```text
BooksBox/
  src/
    app/
      api/
        auth/             Auth web et inscription
        mobile/           API dediee a l'application mobile
        books/            Recherche, import et detail des livres
        library/          Bibliotheque utilisateur
        reviews/          Reviews, reactions et commentaires
        comments/         Edition, suppression et likes des commentaires
        follows/          Follow / unfollow
        feed/             Activite sociale
        trending/         Tendances
        users/            Recherche utilisateurs
      authors/            Pages auteurs web
      books/              Pages livres web
      commu/              Page communaute
      library/            Page bibliotheque
      lists/              Pages listes
      login/              Connexion web
      profile/            Profil prive et profils publics
      search/             Recherche web
      settings/           Parametres
      signup/             Inscription web
      trending/           Page tendances
    components/
      activity/           Feed et lignes d'activite
      auth/               Formulaires et boutons auth
      authors/            Sections auteurs
      books/              Cartes, couvertures et fiche livre
      community/          Recherche lecteurs et follow
      layout/             Shell de navigation
      library/            Bibliotheque et actions livre
      lists/              Creation, edition et affichage listes
      profile/            Edition profil
      reviews/            Reviews, etoiles, commentaires
      search/             Workspace de recherche
      settings/           Panneau de parametres
      ui/                 Composants UI generiques
    server/
      actions/            Actions serveur appelees par le web
      auth/               NextAuth, session, mot de passe, token mobile
      db/                 Client Prisma singleton
      http/               Helpers d'erreurs API
      services/           Logique metier et APIs externes
      validation/         Schemas Zod
    lib/                  Helpers partages
    types/                Augmentations TypeScript
  mobile/
    App.tsx               Entree Expo
    src/
      api/                Client HTTP mobile
      auth/               Contexte d'auth mobile
      components/         Composants React Native
      screens/            Ecrans mobiles
      lib/                Helpers mobiles
      theme.ts            Theme mobile
      types.ts            Types mobiles
  prisma/
    schema.prisma         Schema relationnel
    migrations/           Historique des migrations
  scripts/
    next-with-system-ca.mjs
  docker-compose.yml
```

## Architecture web

Le site web utilise le dossier `src/app` de Next.js.

- Les pages sont organisees par route : `books`, `authors`, `library`, `profile`, `search`, `commu`, `trending`, `settings`, `lists`.
- Le layout global est dans `src/app/layout.tsx`.
- Le shell de navigation est dans `src/components/layout/AppShell.tsx`.
- Les interactions utilisateur passent soit par des routes API, soit par des actions serveur dans `src/server/actions`.

Les composants sont regroupes par domaine fonctionnel. Par exemple, les composants de reviews sont dans `src/components/reviews`, les composants de bibliotheque dans `src/components/library`, et les composants livres dans `src/components/books`.

## Architecture API

Les routes API sont dans `src/app/api`. Elles renvoient du JSON avec `NextResponse`.

### API web principale

- `POST /api/auth/signup` : creation de compte.
- `/api/auth/[...nextauth]` : routes NextAuth.
- `GET /api/books/search` : recherche Google Books et Open Library.
- `POST /api/books` : creation ou import de livre.
- `GET /api/books/:bookId` : detail livre.
- `GET/POST/DELETE /api/library` : bibliotheque utilisateur.
- `POST /api/reviews` : creation de review.
- `PATCH/DELETE /api/reviews/:reviewId` : edition ou suppression de review.
- `POST /api/reviews/:reviewId/reactions` : like de review.
- `POST /api/reviews/:reviewId/comments` : commentaire de review.
- `PATCH/DELETE /api/comments/:commentId` : edition ou suppression de commentaire.
- `POST /api/comments/:commentId/reactions` : like de commentaire.
- `POST/DELETE /api/follows` : follow et unfollow.
- `GET /api/feed` : activite sociale.
- `GET /api/trending` : livres tendances.
- `GET /api/users/search` : recherche lecteurs.

### API mobile

Les routes mobiles sont regroupees sous `src/app/api/mobile`.

- `POST /api/mobile/auth/login`
- `POST /api/mobile/auth/logout`
- `GET /api/mobile/auth/me`
- `GET /api/mobile/home`
- `GET /api/mobile/books/:bookId`
- `GET /api/mobile/authors/:authorSlug`
- `GET /api/mobile/profile`
- `PATCH /api/mobile/profile`
- `GET /api/mobile/profiles/:userId`
- `GET /api/mobile/community`
- `GET /api/mobile/lists`
- `POST /api/mobile/lists`
- `GET /api/mobile/lists/:listId`
- `PATCH /api/mobile/lists/:listId`
- `DELETE /api/mobile/lists/:listId`
- `POST /api/mobile/lists/:listId/books`
- `DELETE /api/mobile/lists/:listId/books?bookId=...`
- `POST /api/mobile/lists/:listId/reorder`
- `POST /api/mobile/favorites/:bookId`

Certaines routes web acceptent aussi le token mobile via `Authorization: Bearer <token>`, notamment la recherche de livres, l'ajout a la bibliotheque, les reviews et les follows.

## Services serveur

La logique metier est separee des routes API dans `src/server/services`.

- `books.ts` : creation manuelle, import et upsert de livres externes.
- `googleBooks.ts` : appels a Google Books.
- `openLibrary.ts` : appels a Open Library.
- `externalBooks.ts` : normalisation des resultats externes.
- `feed.ts` : activite sociale et top reviews.
- `trending.ts` : calcul des tendances.

Les validations d'entree sont dans `src/server/validation` avec Zod :

- `books.ts`
- `library.ts`
- `lists.ts`
- `reviews.ts`

Les erreurs API communes sont centralisees dans `src/server/http/errors.ts`.

## Authentification

### Web

L'authentification web utilise NextAuth avec un provider Credentials.

Fichiers principaux :

- `src/server/auth/options.ts`
- `src/server/auth/password.ts`
- `src/server/auth/session.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/auth/signup/route.ts`

Les mots de passe sont hashes avec `bcryptjs`. Les sessions web utilisent la strategie JWT de NextAuth.

### Mobile

Le mobile utilise une authentification par token.

Fichiers principaux :

- `src/server/auth/mobile.ts`
- `src/app/api/mobile/auth/login/route.ts`
- `src/app/api/mobile/auth/me/route.ts`
- `mobile/src/auth/AuthContext.tsx`
- `mobile/src/api/client.ts`

Au login mobile, le backend verifie les identifiants et renvoie un token. L'application mobile le stocke avec Expo Secure Store et l'envoie ensuite dans l'en-tete :

```text
Authorization: Bearer <token>
```

Le secret utilise est `MOBILE_JWT_SECRET`. Si cette variable est absente, le code reutilise `NEXTAUTH_SECRET`. En developpement, un secret de fallback existe, mais il ne doit pas etre utilise en production.

## Base de donnees

La base est PostgreSQL. Le schema est gere par Prisma dans `prisma/schema.prisma`.

### Modeles principaux

- `User` : compte, profil, email, image, bio.
- `Account`, `Session`, `VerificationToken` : tables compatibles NextAuth.
- `Book` : livre interne, lie a Google Books ou Open Library si disponible.
- `UserBook` : lien utilisateur-livre, statut de lecture et favori.
- `Review` : note, texte, spoiler, auteur et livre.
- `ReviewReaction` : reaction sur une review.
- `ReviewComment` : commentaire de review, avec support de reponses.
- `ReviewCommentReaction` : like de commentaire.
- `Follow` : relation follower / following.
- `BookList` : liste de livres creee par un utilisateur.
- `BookListEntry` : entree d'une liste, avec ordre et note optionnelle.

### Contraintes importantes

- Un email utilisateur est unique.
- Un username est unique.
- Un couple `userId` / `bookId` est unique dans `UserBook`.
- Une review est unique par couple `userId` / `bookId`.
- Une reaction est unique par review, utilisateur et type.
- Une relation follow est unique par follower et following.
- Une liste ne peut contenir qu'une seule fois le meme livre.

### Migrations

Les migrations sont versionnees dans `prisma/migrations`.

Pour initialiser la base sur une nouvelle machine :

```bash
npm run prisma:migrate
npm run prisma:generate
```

## Application mobile

L'application mobile est une application Expo React Native situee dans `mobile/`.

Le client HTTP mobile lit l'URL du backend depuis :

```text
EXPO_PUBLIC_API_URL
```

Fichiers importants :

- `mobile/App.tsx` : navigation principale.
- `mobile/src/api/client.ts` : client HTTP et gestion des erreurs API.
- `mobile/src/auth/AuthContext.tsx` : session mobile.
- `mobile/src/screens` : ecrans de l'application.
- `mobile/src/components` : composants UI mobiles.
- `mobile/src/theme.ts` : couleurs et styles partages.

Le mobile depend du backend web. Il faut donc lancer Next.js avant Expo.

## APIs externes

### Google Books

Google Books est appele cote serveur dans `src/server/services/googleBooks.ts`.

La cle `GOOGLE_BOOKS_API_KEY` est optionnelle en local. Si elle est renseignee, elle est ajoutee aux appels serveur. Elle ne doit jamais etre exposee cote client.

### Open Library

Open Library est appele cote serveur dans `src/server/services/openLibrary.ts`.

L'usage actuel ne necessite pas de cle API.

## Variables d'environnement

### Racine du projet

Le fichier `.env` doit etre cree depuis `.env.example`.

```text
DATABASE_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
GOOGLE_BOOKS_API_KEY
MOBILE_JWT_SECRET
```

### Mobile

Le fichier `mobile/.env.local` doit etre cree depuis `mobile/.env.example`.

```text
EXPO_PUBLIC_API_URL
```

## Flux principaux

### Inscription et connexion web

1. L'utilisateur cree un compte via `/api/auth/signup`.
2. Le mot de passe est hashe avec `bcryptjs`.
3. La connexion passe par NextAuth Credentials.
4. Les pages web recuperent l'utilisateur courant via la session NextAuth.

### Connexion mobile

1. Le mobile appelle `POST /api/mobile/auth/login`.
2. Le backend verifie l'email et le mot de passe.
3. Le backend renvoie un token mobile.
4. Le mobile stocke le token dans Expo Secure Store.
5. Les appels suivants ajoutent `Authorization: Bearer <token>`.

### Recherche et import de livre

1. Le client appelle `/api/books/search`.
2. Le serveur interroge Google Books et Open Library.
3. Les resultats sont normalises.
4. Lors de l'ajout, le livre est cree ou mis a jour dans `Book`.
5. L'utilisateur peut l'ajouter a sa bibliotheque via `UserBook`.

### Review et interactions sociales

1. Un utilisateur ajoute une review sur un livre.
2. Les autres utilisateurs peuvent liker ou commenter.
3. Le feed social utilise les follows pour afficher l'activite des personnes suivies.
4. Les tendances sont calculees cote serveur a partir des donnees d'activite.

### Listes

1. Un utilisateur cree une liste.
2. Il ajoute des livres via `BookListEntry`.
3. L'ordre des livres peut etre modifie.
4. Les listes sont reutilisees sur le web et le mobile.

## Securite

- Les mots de passe sont hashes, jamais stockes en clair.
- Les secrets sont lus depuis les variables d'environnement.
- Les cles d'API externes restent cote serveur.
- Les routes protegees verifient l'utilisateur courant via NextAuth ou token mobile.
- Les donnees entrantes sont validees avec Zod sur les routes critiques.
- Les suppressions et editions verifient que l'utilisateur est proprietaire de la ressource.

## Tests et qualite

- `npm run lint` verifie le code avec ESLint.
- `npm test` lance les tests Vitest.
- `npm run build` valide la generation Prisma et le build Next.js.
- `npm run typecheck` dans `mobile/` verifie TypeScript cote mobile.

Un test unitaire existe notamment pour la logique de tendances dans `src/server/services/trending.test.ts`.

## Decisions d'architecture

- Backend unique dans Next.js pour eviter de maintenir une API separee.
- Prisma comme couche d'acces aux donnees pour garder un schema type et des migrations versionnees.
- PostgreSQL pour un modele relationnel adapte aux livres, utilisateurs, reviews, follows et listes.
- Routes mobiles dediees quand le format attendu par l'application Expo differe du web.
- Services serveur partages pour eviter de dupliquer la logique entre routes web et routes mobiles.
- Appels Google Books et Open Library uniquement cote serveur pour proteger les cles et controler les erreurs.
- Expo Secure Store pour conserver le token mobile cote telephone.

## Points d'attention

- `architecture.md` remplace l'ancien document de conception et correspond au code actuel.
- Le mobile ne fonctionne que si le backend est accessible depuis le telephone.
- En local, Docker doit etre lance avant Prisma et Next.js.
- La base est vide au premier lancement : il faut creer un compte pour tester.
- Si le port PostgreSQL `5432` est deja utilise, adapter Docker et `DATABASE_URL`.
