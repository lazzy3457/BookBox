---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - c:/Users/maeld/GIT/app/_bmad-output/planning-artifacts/prd-booksbox-v1.md
  - c:/Users/maeld/GIT/app/_bmad-output/planning-artifacts/ux-design-specification.md
workflowType: architecture
project_name: BooksBox
user_name: Maeld
date: "2026-04-04"
---

# Document de décisions d'architecture — BooksBox

_Ce document est construit collaborativement étape par étape. Les sections sont ajoutées au fil des décisions d'architecture._

## Analyse du contexte projet

### Vue d'ensemble des exigences

**Exigences fonctionnelles (synthèse architecturale)**

- **Identité** : inscription, connexion, profil (avatar, bio, stats optionnelles).
- **Catalogue** : recherche via **Google Books API** ; **ajout manuel** si aucun résultat ; fiche livre (métadonnées + couverture selon disponibilité).
- **Bibliothèque** : lien utilisateur–livre avec statuts (À lire / En cours / Lu / Abandonné).
- **Reviews** : une review éditable par couple (utilisateur, livre) ; note + texte optionnel ; flag spoiler.
- **Social** : relations de suivi ; fil d'activité ; réactions (Like, À lire) ; commentaires sous review (threads possibles).
- **Découverte** : liste « Tendance » basée sur popularité (règles métier à figer : fenêtre temporelle, pondération).

**Exigences non fonctionnelles**

- **UX / plateforme** : web **mobile-first**, thème **sombre** V1, **Nuxt UI + Tailwind** (spec UX).
- **Performance** : recherche réactive ; **pagination** du feed et des listes.
- **Fiabilité données externes** : Google Books (quotas, champs manquants, doublons) ; parcours sans impasse vers ajout manuel.
- **Offline (spec UX)** : continuité minimale sur actions essentielles — à trancher en architecture (PWA, file locale, resync).
- **Sécurité** : comptes, UGC (reviews, commentaires) ; modération simple en V1.

**Échelle et complexité**

- **Domaine principal** : application web full-stack (Nuxt) + API applicative + base de données + intégration tierce.
- **Niveau** : **moyen** pour une V1 (social + tendance + API externe, sans multi-tenant ni conformité lourde explicite).
- **Blocs estimés** : UI (Nuxt), API, persistance (PostgreSQL ou équivalent), auth, module livres (API + cache), feed / activité, tendance.

### Contraintes et dépendances techniques

- **Google Books API** : clés, quotas, locale FR.
- **Ouverte (PRD)** : source de vérité des livres — API seule vs **cache DB** (recommandation probable : persister les livres référencés pour IDs stables et résilience).
- **Hébergement** : non spécifié — impact déploiement, secrets, DB.

### Préoccupations transverses

- **Identifiants livre** (ID Google vs ID interne) pour bibliothèque, reviews, tendance.
- **Feed et tendance** : modèle de données et requêtes performantes.
- **Spoilers** : contrat API + affichage client.
- **Offline** : périmètre minimal réaliste.
- **Abus** : rate limiting, signalement minimal (should PRD).

### État des lieux — stack, dossiers, BDD, API

| Sujet | Statut |
|--------|--------|
| **Stack** | **Partiel** : figé dans la spec UX (Nuxt 3, Tailwind, Nuxt UI, thème sombre). À **consolider** en décisions formelles aux étapes **starter (3)** et **décisions (4)** du workflow architecture. |
| **Structure des dossiers** | **Pas encore** dans ce document. Le workflow prévoit une étape dédiée (**step-06-structure**). |
| **Schéma BDD** | **Brouillon** repris ci-dessous (aligné PRD + discussion précédente). **Pas** encore versionné comme migrations dans le dépôt d'app — à porter en Prisma / SQL selon choix d'implémentation. |
| **Design d'API** | **Pas encore** : à produire après starter + patterns (**steps 3–5**), puis figé dans ce document. |

### Modèle de données V1 (brouillon de référence)

Entités principales : `users`, `books`, `user_books`, `reviews`, `review_comments`, `review_reactions`, `follows`.  
Contraintes clés : unicité `(user_id, book_id)` sur `user_books` ; une review par `(user_id, book_id)` (éditable) ; réactions `Like` / `À lire` par `(review_id, user_id, kind)`.

*(Le SQL de migration détaillé peut être recopié ici ou dans `migrations/` au moment de l'implémentation.)*

---

## Évaluation du starter

### Domaine technologique principal

Application **web full-stack** : **Nuxt 3** (Vue) côté UI et routes serveur, alignée avec la spec UX (mobile-first, Nuxt UI, Tailwind, thème sombre V1).

### Options de starter envisagées

| Option | Intérêt | Limite |
|--------|---------|--------|
| **`npm create nuxt@latest`** (officiel) | Standard, bien maintenu, `@latest` pour version courante ([doc init Nuxt](https://nuxt.com/docs/3.x/api/commands/init)) | Nuxt UI à ajouter après coup |
| **`npm create nuxt@latest -- -t ui`** | Accélère l’intégration **Nuxt UI** dès la création ([installation Nuxt UI](https://ui3.nuxt.com/getting-started/installation/nuxt)) | Moins de contrôle sur le preset minimal initial |

### Starter retenu : Nuxt officiel (+ Nuxt UI)

**Pourquoi ce choix**

- Cohérent avec la stack UX (Nuxt 3 + Tailwind + Nuxt UI v3).
- Chaîne de build et conventions documentées ; évolution Nuxt 3 / CLI suivie en amont.
- Permet d’ajouter **Nuxt UI 3** soit via template `-t ui`, soit après coup avec `@nuxt/ui` et config CSS indiquée par la doc.

**Commande d’initialisation (référence — à exécuter dans le dépôt ou dossier cible)**

```bash
npm create nuxt@latest
```

**Alternative** si tu veux Nuxt UI intégré dès le scaffold :

```bash
npm create nuxt@latest -- -t ui
```

*(Tu peux préciser le gestionnaire de paquets via les options du CLI, ex. `--packageManager pnpm`.)*

**Si Nuxt UI est ajouté manuellement** (rappel doc actuelle) :

```bash
pnpm add @nuxt/ui@3
```

Puis configuration `modules`, imports CSS (`tailwindcss` + `@nuxt/ui`), et enveloppe `<UApp>` dans `app.vue` selon [Nuxt UI — Installation](https://ui3.nuxt.com/getting-started/installation/nuxt).

### Décisions déjà posées par ce socle

**Langage & runtime**

- **TypeScript** (recommandé avec le starter Nuxt moderne ; à activer si le prompt du CLI le propose).

**Styles**

- **Tailwind CSS** via l’écosystème Nuxt UI v3 (Tailwind v4 côté UI selon doc Nuxt UI).

**Build & outillage**

- **Vite** (sous-jacent à Nuxt), HMR, build optimisé pour prod.

**Tests**

- Selon modules choisis à l’init (**Vitest** souvent utilisé avec Nuxt ; à confirmer au moment du `create`).

**Organisation du code**

- Arborescence Nuxt standard (`pages/`, `components/`, `server/`, etc.) — **détail des dossiers métier** à figer à l’**étape structure** du workflow architecture.

**Expérience de développement**

- `nuxt dev`, TypeScript, ESLint selon preset.

**Note :** La première story d’implémentation peut être : exécuter la commande ci-dessus, commit initial, puis ajouter Nuxt UI + thème sombre de base.

### Préférences encore ouvertes (à trancher — étape « décisions cœur »)

**Authentification — pas encore choisie.** Pistes à comparer en étape 4 :

- **Nuxt Auth Utils** (intégration Nuxt, sessions côté serveur selon config).
- **Lucia** (flexible, à brancher sur ta DB).
- **Sidebase Nuxt Auth** (wrapper Auth.js pour Nuxt).
- **Supabase Auth** (si tu héberges auth + DB chez Supabase).
- **OAuth pur** (GitHub/Google) + session maison (plus de travail custom).

**Base de données — pas explicitement validée par toi**, mais **recommandation provisoire** pour coller au modèle relationnel V1 : **PostgreSQL** + migrations (Drizzle / Prisma / SQL brut — à décider étape 4).

---

## Décisions d’architecture cœur

### Analyse des priorités

**Décisions critiques (bloquent l’implémentation si absentes)**

- Persistance relationnelle + stratégie d’identité des **livres** (interne vs Google).
- Forme de l’**API applicative** (contrat client ↔ serveur).
- Règles **sécurité** minimales (secrets, pas de clé Google Books côté client).

**Décisions importantes (facilitent la cohérence)**

- Choix **ORM / migrations**.
- Format des **erreurs API** et pagination.

**Décisions reportées (explicitement non figées ici)**

- **Fournisseur / module d’authentification** (tu n’as pas encore tranché).
- **Hébergeur** et pipeline CI/CD détaillé.
- **Offline avancé** (file d’attente + sync) : hors périmètre technique détaillé dans cette passe ; à traiter après V1 online-first si besoin.

### Architecture des données

- **SGBD** : **PostgreSQL** (relationnel, adapté au modèle V1 : users, books, user_books, reviews, social).
- **ORM & migrations** : **Prisma** (schéma déclaratif, migrations, client typé). *Installer les versions `latest` publiées sur npm au moment du projet (`prisma`, `@prisma/client`).*
- **Source de vérité des livres** :
  - Toute fiche référencée par un utilisateur est **persistée en base** (`books`) avec **ID interne UUID**.
  - Champs d’alignement externe : ex. `google_books_volume_id` (nullable, unique quand présent) pour les volumes Google Books ; livres **manuel** sans ID externe.
  - Recherche UI : appel **Google Books côté serveur** → proposition de résultats → à la sélection ou à l’ajout, **upsert** dans `books` pour stabilité des FK (reviews, user_books).
- **Validation** : validation des entrées **côté serveur** (schémas Zod ou équivalent dans les handlers Nitro) ; mirroring optionnel côté client pour l’UX.

### Authentification et sécurité

- **Authentification** : **non choisie** à ce stade — **aucune intégration imposée** dans ce document. Avant d’implémenter l’inscription / la connexion, trancher entre par ex. **Lucia + Postgres**, **@sidebase/nuxt-auth**, **Supabase Auth**, ou **OAuth + sessions maison**.
- **Exigences transverses** (quel que soit le choix) :
  - Mots de passe : hachage robuste (Argon2/bcrypt selon la lib).
  - Sessions : cookies **httpOnly**, **Secure** en prod, **SameSite** adapté ; pas de stockage du JWT localStorage pour du web classique si évitable.
  - **Clé API Google Books** : uniquement variables d’environnement **serveur** ; jamais exposée au bundle client.
  - **UGC** (reviews, commentaires) : contrôle d’autorisation sur chaque route (propriétaire ou lecture publique selon règle produit).

### API et communication

- **Style** : **REST JSON** via routes **Nitro** (`server/api/**`), préfixe recommandé `/api` (ou `/api/v1` si tu anticipes le versioning).
- **Lecture / écriture** : préférer **GET** pour lecture paginée ; **POST/PATCH/DELETE** pour mutations ; codes HTTP explicites (400 validation, 401/403 auth, 404, 409 conflit métier ex. review déjà existante si règle stricte).
- **Erreurs** : enveloppe stable, par ex. `{ "error": { "code": "STRING_MACHINE", "message": "humain" } }` (ou **Problem Details** `application/problem+json` si tu standardises ainsi partout).
- **Pagination** : curseur ou `limit`+`offset` pour feed et listes ; tailles par défaut raisonnables côté serveur.
- **Google Books** : un **module serveur** dédié (service) appelé par les routes de recherche ; **caching court** ou **throttling** simple pour respecter les quotas (voir **Patterns d’implémentation** ci-dessous).

### Architecture frontend (Nuxt)

- **Rendu** : **SSR/SSG hybride** selon pages (Nuxt par défaut) ; pages très interactives (feed) en SSR + hydration.
- **État** : privilégier **`useAsyncData` / `useFetch`** et données issues du serveur pour le premier rendu ; **Pinia** seulement si état client complexe (non obligatoire V1).
- **UI** : **Nuxt UI** + **Tailwind** (spec UX) ; thème **sombre** par défaut V1.
- **Composants métier** : encapsuler `BookCard`, `ReviewComposer`, `ActivityRow`, etc., pour limiter la divergence entre agents.

### Infrastructure et déploiement

- **Cible d’exécution** : **Node.js** (runtime Nitro standard) sur hébergeur compatible (ex. Railway, Render, Fly.io, VPS) — **choix précis reporté**.
- **Variables d’environnement** : `DATABASE_URL`, secrets auth, `GOOGLE_BOOKS_API_KEY` (serveur), origines CORS si API séparée (sinon même origine en full Nuxt).
- **CI/CD** : **reporté** (lint, test, migrate, build au minimum quand le repo existera).

### Analyse d’impact et ordre d’implémentation suggéré

1. Repo Nuxt + Prisma + PostgreSQL (schéma aligné sur le brouillon métier).
2. Module **books** (upsert depuis Google + création manuelle).
3. **Auth** (dès que le choix de module est fait).
4. Bibliothèque utilisateur + reviews + social + tendance.
5. Durcissement (rate limit, modération minimale).

**Dépendances croisées** : les routes protégées et le modèle `users` dépendent du choix d’auth ; le feed et la tendance dépendent des tables sociales et d’index SQL adaptés.

---

## Patterns d’implémentation (version courte)

_Objectif : éviter les divergences entre agents / devs, sans livre de règles._

### API (`server/api`)

- **Nommage fichiers** : `*.get.ts`, `*.post.ts`, etc. ; chemins URL en **kebab-case** (`/api/books/search`).
- **Réponses succès** : JSON direct (pas d’enveloppe `{ data: ... }` obligatoire sauf besoin pagination — alors `{ items, nextCursor? }` ou `{ items, total? }`).
- **Erreurs** : toujours `{ "error": { "code": "SNAKE_UPPER", "message": "…" } }` + statut HTTP adapté.
- **Validation** : schéma **Zod** (ou équivalent) en entrée de handler ; jamais faire confiance au corps brut.

### Prisma & données

- **Tables / colonnes** : `snake_case` en base si tu restes aligné SQL ; noms Prisma en **`camelCase` modèle** + `@map` si besoin — **choisir une convention et la tenir**.
- **Accès DB** : passer par de petits modules **`server/utils/db.ts`** ou services (`server/services/*`) plutôt que d’éparpiller `prisma` dans les handlers.

### Nuxt / Vue

- **Composants** : préfixe **`Book`**, **`Review`**, **`Activity`** pour le métier ; un composant par fichier, nom **PascalCase**.
- **Données page** : `useAsyncData` avec clé stable ; pas de double fetch client/serveur sans raison.

### Tests (minimal V1)

- **Vitest** pour logique pure et utilitaires ; tests d’intégration légers sur les handlers critiques si temps.

### Google Books

- **Un seul module** `server/services/googleBooks.ts` (nom indicatif) ; timeouts + gestion d’erreur réseau ; ne jamais logger la clé API.

---

## Suite du workflow (optionnel)

**Étape 6 — Structure projet** : détailler l’arborescence des dossiers (`components/`, `server/services/`, etc.) — utile si plusieurs personnes codent ; sinon tu peux **t’arrêter ici** et faire évoluer ce document au fil du code.
