# BooksBox - Contexte Agent

## Vision Produit

BooksBox est une application web desktop-first pour lecteurs francophones, inspiree de l'energie sociale de Letterboxd appliquee aux livres.

L'objectif V1 est de permettre a un utilisateur de :

- rechercher un livre ;
- l'ajouter a sa bibliotheque ;
- le marquer avec un statut de lecture ;
- publier une note et une review courte ;
- suivre d'autres lecteurs ;
- voir un feed social ;
- decouvrir des livres tendance.

La V1 est volontairement online-first et desktop-first. Le responsive mobile avance et l'offline sont repousses.

## References Design

Le design doit s'inspirer de ces familles d'interfaces sans les copier au pixel pres :

- Letterboxd : grille de couvertures, activite sociale, ton media/culture.
- AniList : pages media/profil avec panneaux larges, metadata visibles, UI sombre.
- Hyakanime : catalogue dense, navigation rapide, usage editorial.
- League of Comic Geeks : listes de sorties denses avec couverture + metadata.

Direction BooksBox actuelle :

- theme sombre noir bleute ;
- accents vert critique, ambre rating, corail review, bleu metadata ;
- interface desktop dense mais lisible ;
- couvertures de livres comme signal visuel principal ;
- feed social compact et scannable.

## Stack Technique

- Framework : Next.js App Router + TypeScript.
- UI : React + Tailwind CSS.
- Icons : lucide-react.
- Auth : Auth.js / NextAuth avec Credentials et Prisma Adapter.
- Base de donnees : PostgreSQL.
- ORM : Prisma.
- DB locale cible : Docker Compose, meme si Docker n'est pas installe sur la machine actuelle.
- API livres : Google Books API, appelee uniquement cote serveur.
- Tests : Vitest.
- Lint : ESLint flat config.

Versions importantes :

- Prisma est pinne en `6.19.3`, car Prisma 7 exige un runtime Node incompatible avec le Node 23 actuel.
- Vitest est pinne en `3.2.6` pour eviter les contraintes moteur de Vitest 4 avec Node 23.

## Structure Principale

- `src/app` : pages et routes API Next.js.
- `src/app/api/**/route.ts` : endpoints serveur.
- `src/components` : composants UI et metier.
- `src/server` : logique serveur, services, validation, auth, DB.
- `src/server/db/prisma.ts` : client Prisma centralise.
- `src/server/services` : Google Books, books, feed, trending.
- `src/server/validation` : schemas Zod.
- `prisma/schema.prisma` : modele de donnees.
- `prisma/migrations` : migration SQL initiale.
- `docker-compose.yml` : PostgreSQL local.

## Modele Fonctionnel V1

Entites principales :

- `User`
- `Book`
- `UserBook`
- `Review`
- `ReviewReaction`
- `ReviewComment`
- `Follow`

Contraintes importantes :

- `Book.googleBooksVolumeId` unique nullable.
- `UserBook` unique sur `(userId, bookId)`.
- `Review` unique sur `(userId, bookId)`.
- `ReviewReaction` unique sur `(reviewId, userId, kind)`.
- `Follow` unique sur `(followerId, followingId)`.

Statuts de lecture :

- `TO_READ`
- `READING`
- `READ`
- `ABANDONED`

Reactions :

- `LIKE`
- `TO_READ`

## API Actuelle

Routes principales :

- `POST /api/auth/signup`
- `GET/POST /api/auth/[...nextauth]`
- `GET /api/books/search`
- `POST /api/books`
- `GET /api/books/[bookId]`
- `GET/POST /api/library`
- `POST /api/reviews`
- `POST /api/reviews/[reviewId]/reactions`
- `POST /api/reviews/[reviewId]/comments`
- `POST /api/follows`
- `GET /api/feed`
- `GET /api/trending`

Regles API :

- validation serveur via Zod ;
- erreurs JSON au format `{ error: { code, message } }` ;
- routes protegees via `requireCurrentUserId()`;
- Google Books ne doit jamais etre appele depuis le client.

## UI Actuelle

Pages principales :

- `/` : accueil social avec hero, etagere de couvertures, feed, tendance.
- `/search` : recherche Google Books + ajout manuel.
- `/library` : bibliotheque personnelle en poster-grid.
- `/trending` : livres tendance en poster-grid.
- `/books/[bookId]` : fiche livre media avec couverture, metadata, actions, reviews.
- `/login` et `/signup` : authentification.
- `/profile` : profil lecteur et stats.

Composants importants :

- `AppShell`
- `SectionHeader`
- `BookCard`
- `CoverShelf`
- `SearchWorkspace`
- `LibraryActions`
- `ReviewComposer`
- `RatingControl`
- `ActivityRow`
- `AuthForm`

## Commandes Utiles

Installation :

```bash
npm install
```

Developpement :

```bash
npm run dev
```

Validation :

```bash
npm run lint
npm test
npm run build
```

Prisma :

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

PostgreSQL local cible :

```bash
docker compose up -d
```

Note : Docker n'etait pas disponible lors de l'implementation initiale (`docker` non reconnu). Ne pas supposer que la DB locale est lancee.

## Variables d'Environnement

Voir `.env.example`.

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_BOOKS_API_KEY`

Le fichier `.env` local existe pour le developpement. Ne pas y mettre de secret de production.

## Points d'Attention

- Ne pas exposer `GOOGLE_BOOKS_API_KEY` au client.
- Ne pas disperser les appels Prisma dans les composants client.
- Garder les mutations protegees par session.
- Ne pas ajouter de complexite mobile-first pour la V1.
- Eviter une UI type dashboard SaaS generique ; privilegier un catalogue social de couvertures.
- Les textes visibles sont en francais.
- Conserver des composants metier reutilisables plutot que dupliquer les layouts.
- Sur Windows, un serveur Next actif peut verrouiller le moteur Prisma. Si `prisma generate` echoue avec `EPERM rename query_engine`, arreter le serveur dev puis relancer.

## Etat de Validation Connu

Derniere validation effectuee apres la refonte design :

- `npm run lint` : OK.
- `npm test` : OK.
- `npm run build` : OK.
- `http://localhost:3000` : repond `200 OK` quand le serveur dev est lance.

## Prochaines Evolutions Naturelles

- Ajouter des tests API pour auth, books, library et reviews.
- Ajouter une seed Prisma avec quelques livres et utilisateurs demo.
- Brancher une vraie base PostgreSQL locale ou cloud.
- Ajouter des interactions client pour commenter/reagir depuis la fiche livre.
- Ajouter filtres de bibliotheque par statut.
- Ajouter pages publiques utilisateur et recherche d'utilisateurs.
