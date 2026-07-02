# BooksBox — Contexte agent

Dernière mise à jour : 2 juillet 2026

## Produit

BooksBox est une application sociale de lecture francophone inspirée de Letterboxd, AniList et TV Time. Le web Next.js est le client principal ; le mobile Expo partage le backend.

Fonctions actuelles :

- recherche Google Books/Open Library et ajout manuel ;
- bibliothèque, favoris et statuts ;
- journal daté avec lectures, relectures et progression par page, pourcentage ou chapitre ;
- reviews, commentaires, réactions, follows, listes et feed ;
- recommandations personnalisées explicables ;
- import Goodreads et CSV BookBox ;
- blocage, signalement, modération et suspension ;
- export et suppression du compte ;
- SEO, footer et pages légales.

## Stack

- Next.js App Router, React, TypeScript, Tailwind et lucide-react.
- NextAuth Credentials, sessions JWT et Prisma Adapter.
- PostgreSQL avec Prisma `6.19.3`.
- Zod, Vitest et ESLint.
- Nodemailer via SMTP.
- Expo SDK 54, Secure Store et Expo Notifications.

## Règles importantes

- Le web reste prioritaire ; ne pas élargir le mobile sans demande explicite.
- Toute mutation doit être authentifiée et autorisée.
- Les nouveaux comptes doivent accepter les textes courants, confirmer avoir au moins 15 ans et vérifier leur e-mail.
- Les rôles administrateurs sont stockés en base, jamais déduits d’une liste d’e-mails.
- Une entrée de journal est privée par défaut.
- Un contenu masqué ou un compte suspendu ne doit apparaître sur aucune surface publique.
- Le blocage s’applique dans les deux directions.
- Ne jamais exposer e-mails, secrets, hash, jetons ou entrées privées.
- Les signalements légaux sont accessibles sans compte ; leur suivi exige code et e-mail.
- Ne pas ajouter de cookies non nécessaires, analytics ou publicité sans mécanisme juridique adapté.
- Les textes visibles sont en français.

## Fichiers de référence

- `README.md` : installation et utilisation.
- `architecture.md` : architecture actuelle.
- `prisma/schema.prisma` : modèle de données.
- `docs/launch-checklist.md` : prérequis de mise en ligne.
- `docs/production-operations.md` : exploitation et incidents.
- `docs/processing-register.md` : registre RGPD synthétique.
- `docs/dependency-security.md` : alertes de dépendances.

`prd-booksbox-v1.md`, `epics.md` et `ux-design-specification.md` sont historiques et ne décrivent plus nécessairement l’implémentation.

## Validation

```bash
npm run lint
npm test
npm run build
```

Avant une publication :

```bash
npm run preflight
npx prisma migrate deploy
npm run admin:grant -- adresse@email.fr
```

Sous Windows, arrêter Next.js avant `prisma generate` ou `npm run build` si le moteur Prisma est verrouillé avec une erreur `EPERM`.
