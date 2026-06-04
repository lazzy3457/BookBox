# BooksBox

BooksBox est une application web desktop-first pour lecteurs francophones : recherche de livres, bibliothèque personnelle, reviews, feed social et tendances.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS, thème sombre par défaut
- Auth.js / NextAuth avec Credentials + Prisma Adapter
- PostgreSQL + Prisma
- Google Books API appelée côté serveur
- Vitest pour les tests unitaires

## Démarrage local

1. Installer les dépendances :

```bash
npm install
```

2. Lancer PostgreSQL :

```bash
docker compose up -d
```

3. Appliquer la migration et générer Prisma :

```bash
npm run prisma:migrate
npm run prisma:generate
```

4. Lancer Next.js :

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:3000`.

## Variables d'environnement

Le fichier `.env` local contient des valeurs de développement. Pour une autre machine, repartir de `.env.example`.

- `DATABASE_URL` : connexion PostgreSQL.
- `NEXTAUTH_URL` : URL locale ou production.
- `NEXTAUTH_SECRET` : secret long et aléatoire en production.
- `GOOGLE_BOOKS_API_KEY` : optionnel en local, recommandé en production.

## Scripts

- `npm run dev` : serveur de développement.
- `npm run build` : génération Prisma puis build Next.js.
- `npm run lint` : lint ESLint.
- `npm test` : tests unitaires.
- `npm run prisma:migrate` : migrations Prisma en développement.
- `npm run prisma:studio` : interface Prisma Studio.
