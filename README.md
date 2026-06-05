# BooksBox

BooksBox est une application web desktop-first pour lecteurs francophones : recherche de livres, bibliotheque personnelle, reviews, feed social et tendances.

## Fonctionnalites V1

- Recherche Google Books cote serveur.
- Ajout de livres a la bibliotheque avec statut de lecture.
- Ajout manuel enrichi : couverture, date via calendrier, nombre de pages, editeur, langue et description.
- Bibliotheque triable par ajout recent, titre, auteur, date de publication, pages et statut.
- Retrait d'un livre depuis la bibliotheque ou depuis sa fiche.
- Reviews avec note bornee a 5 etoiles, spoiler masquable/revelable, edition et suppression par l'auteur.
- Likes sur reviews et commentaires.
- Commentaires de review avec edition et suppression par l'auteur.
- Profil avec historique de livres et reviews.
- Page Parametres avec preferences locales, confort de lecture, spoilers et panneaux compte/confidentialite.
- Historique de recherche textuel et historique visuel des 5 derniers livres ajoutes.
- Deconnexion depuis le header.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS, theme sombre par defaut
- Auth.js / NextAuth avec Credentials + Prisma Adapter
- PostgreSQL + Prisma
- Google Books API appelee cote serveur
- Vitest pour les tests unitaires

## Demarrage local

1. Installer les dependances :

```bash
npm install
```

2. Lancer PostgreSQL :

```bash
docker compose up -d
```

3. Appliquer la migration et generer Prisma :

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

Le fichier `.env` local contient des valeurs de developpement. Pour une autre machine, repartir de `.env.example`.

- `DATABASE_URL` : connexion PostgreSQL.
- `NEXTAUTH_URL` : URL locale ou production.
- `NEXTAUTH_SECRET` : secret long et aleatoire en production.
- `GOOGLE_BOOKS_API_KEY` : optionnel en local, recommande en production.

## Scripts

- `npm run dev` : serveur de developpement.
- `npm run build` : generation Prisma puis build Next.js.
- `npm run lint` : lint ESLint.
- `npm test` : tests unitaires.
- `npm run prisma:migrate` : migrations Prisma en developpement.
- `npm run prisma:studio` : interface Prisma Studio.

## Workflow Git

Le projet est realise a plusieurs. Travailler sur une branche dediee par page ou par fonctionnalite quand la demande touche plusieurs zones.

Avant une nouvelle passe :

```bash
git fetch origin
git pull --ff-only origin master
git switch -c feature/nom-de-la-feature
```

Avant de pousser :

```bash
npm run lint
npm test
npm run build
git status --short
git add .
git commit -m "feat: description courte"
git push -u origin feature/nom-de-la-feature
```

Sous Windows, si `prisma generate` ou `npm run build` echoue avec `EPERM` sur le moteur Prisma, arreter le serveur Next.js puis relancer le build.
