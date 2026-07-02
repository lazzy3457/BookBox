---
stepsCompleted: [1]
inputDocuments:
  - c:/Users/maeld/GIT/app/_bmad-output/planning-artifacts/prd-booksbox-v1.md
  - c:/Users/maeld/GIT/app/_bmad-output/planning-artifacts/architecture.md
  - c:/Users/maeld/GIT/app/_bmad-output/planning-artifacts/ux-design-specification.md
workflow_note: "Inventaire (étape 1) validé. Epics proposés (étape 2) — en attente d’approbation explicite avant rédaction des stories (étape 3)."
epics_status: proposed
---

# Archive — Découpage initial des epics

> Ce document est conservé pour l’historique produit. Plusieurs epics sont désormais livrés et certaines hypothèses techniques sont obsolètes. L’implémentation actuelle est décrite dans `README.md` et `architecture.md`.

# BooksBox — Découpage en epics et stories

Ce document regroupe l’inventaire des exigences (PRD, architecture, UX) puis, une fois complété, la **liste des epics** et les **user stories** prêtes pour le développement.

## Vue d’ensemble

**Prérequis pris en compte :** PRD (`prd-booksbox-v1.md`), architecture (`architecture.md`), spécification UX (`ux-design-specification.md`).  
Tu peux demander d’ajouter d’autres fichiers plus tard.

### Où on en est dans le workflow BMAD « Epics & Stories »

| Étape | Contenu | Statut |
|--------|---------|--------|
| **1** | Inventaire FR / NFR / archi / UX | **Fait** (ce document, sections ci-dessous) |
| **2** | **Liste d’epics** (groupement par valeur utilisateur + couverture des FR) | **Proposé** — à valider avec toi avant les stories |
| **3** | **Stories** détaillées (titres, critères d’acceptation) | **À faire** après validation des epics |

**État :** la liste d’epics et la carte de couverture sont **remplies ci-dessous (proposition)**. La partie epic sera **considérée comme figée** une fois que tu auras **approuvé** cette structure (puis **`C`** pour passer à l’étape 3 — stories).

### Enchaînement que tu veux (story → dev → QA → validation)

Tu peux l’appliquer **story par story** une fois l’étape 3 avancée :

1. **Story** — fichier de story prêt (via `bmad-create-story` / flux PM, ou story rédigée dans `epics.md`).
2. **Dev** — `bmad-dev-story` ou `bmad-quick-dev` pour implémenter cette story.
3. **Tests** — `bmad-qa-generate-e2e-tests` (ou tests manuels) sur le périmètre de la story.
4. **Validation** — `bmad-code-review` et/ou recette produit sur les critères d’acceptation.

On peut aussi faire les epics et stories **par petits lots** (ex. un epic à la fois) pour rester aligné avec ce rythme.

---

## Inventaire des exigences

### Exigences fonctionnelles (FR)

```
FR1: Le système permet à l’utilisateur de s’inscrire et de se connecter (mécanisme d’auth à trancher selon l’architecture).
FR2: Le système permet à l’utilisateur de gérer un profil (avatar, bio, statistiques de base optionnelles).
FR3: Le système permet de rechercher des livres par titre et/ou auteur via Google Books (côté serveur uniquement).
FR4: Le système permet de créer un livre manuellement (titre + auteur obligatoires) lorsque la recherche / l’API ne donne pas de résultat utilisable.
FR5: Le système affiche une fiche livre avec couverture, titre, auteur et description lorsque les métadonnées sont disponibles (stockées ou issues de l’API).
FR6: Le système permet d’ajouter un livre à une bibliothèque personnelle avec le statut : À lire / En cours / Lu / Abandonné.
FR7: Le système permet de marquer un livre comme Lu et de publier une note numérique.
FR8: Le système permet de publier une review avec un corps de texte optionnel (mini-review non obligatoire).
FR9: Le système impose au plus une review par couple (utilisateur, livre) et permet à l’utilisateur de modifier cette review.
FR10: Le système permet de marquer une review comme contenant des spoilers.
FR11: Le système permet de suivre un autre utilisateur.
FR12: Le système fournit un fil d’activité des personnes suivies (ex. review publiée, livre terminé).
FR13: Le système permet de réagir à une review avec « Like » ou « À lire » (selon arbitrage PRD).
FR14: Le système permet des commentaires sous une review, avec fil de discussion (y compris imbrication / threads si retenu en implémentation).
FR15: Le système fournit une liste « Tendance » (ou équivalent) de livres populaires (règles de fenêtre et pondération à préciser).
FR16: Le système supporte le parcours découverte : ouvrir tendance, ouvrir un livre, lire les reviews, ajouter le livre en À lire.
```

### Exigences non fonctionnelles (NFR)

```
NFR1: Application web mobile-first et responsive.
NFR2: Recherche perçue comme réactive ; listes et fil d’activité paginés.
NFR3: Gestion des spoilers en interface (indicateur + masquage / révélation explicite).
NFR4: Respect des quotas Google Books ; clé API jamais exposée au bundle client.
NFR5: Attentes « offline » de l’UX : préciser en implémentation (MVP online-first vs file d’attente + resynchronisation).
NFR6: Une fois la stack d’auth choisie : bonnes pratiques (cookies httpOnly, hachage des mots de passe, autorisation sur les mutations).
NFR7: Contenu généré par les utilisateurs (reviews, commentaires) : pas de modification par des tiers non autorisés.
NFR8: API : format d’erreur cohérent et codes HTTP appropriés (selon patterns d’architecture).
NFR9: Persistance des livres référencés en PostgreSQL avec identifiants internes stables pour l’intégrité des clés étrangères.
```

### Exigences additionnelles (architecture)

```
- Projet neuf : initialiser avec le starter officiel Nuxt (`npm create nuxt@latest` ou `npm create nuxt@latest -- -t ui`) ; ajouter Nuxt UI 3 + Tailwind (UX / architecture).
- Données : PostgreSQL + migrations Prisma ; paquets Prisma en `latest` à l’init du projet.
- Identité livre : UUID interne pour `books.id` ; `google_books_volume_id` optionnel unique ; livres manuels sans id externe.
- Google Books : uniquement via module / service serveur centralisé (ex. `server/services/googleBooks.ts`) ; ne jamais logger la clé API.
- API applicative : REST JSON via Nitro `server/api/**` ; validation des entrées (Zod ou équivalent) ; segments d’URL en kebab-case.
- Préférer une couche service pour Prisma plutôt que d’éparpiller les accès DB dans les handlers.
- Auth : fournisseur / module non choisi — bloquant pour les routes protégées ; à décider avant les stories d’authentification.
- Infrastructure / CI-CD : non figé — variables d’environnement DATABASE_URL, secrets d’auth, GOOGLE_BOOKS_API_KEY.
```

### Exigences UX (UX-DR)

```
UX-DR1: Thème sombre par défaut en V1 (Nuxt UI + tokens Tailwind, usage soir / lecture).
UX-DR2: Accueil mobile : CTA principal « J’ai fini un livre » visible sans scroll excessif (usage pouce).
UX-DR3: Après lecture : publication possible avec note seule ; nudge non bloquant pour ajouter du texte après coup.
UX-DR4: Si recherche Google / API échoue ou est vide : message clair, non culpabilisant, et chemin vers création manuelle sans quitter le tunnel.
UX-DR5: Composant BookCard réutilisable : couverture, titre, auteur, note utilisateur si pertinent, badge de statut ; cohérent bibliothèque / recherche / découverte.
UX-DR6: Fil d’activité type ActivityRow : une ligne par type d’événement, texte court, actions secondaires (voir livre, commenter), pas de pavé illisible.
UX-DR7: Lisibilité du feed : espacement, hiérarchie typographique, extrait de review tronqué avec « lire la suite » si besoin.
UX-DR8: Après publication : confirmation courte et chaleureuse (pas technique) ; prochain pas optionnel (feed / autre livre).
UX-DR9: Preuve sociale tôt : extrait tendance et/ou aperçu d’activité sur l’accueil ou l’onboarding pour limiter le vide.
UX-DR10: Composants métier encapsulés : BookCard, ReviewComposer, RatingControl, ActivityRow — éviter les duplications de mise en page.
UX-DR11: Réduire confusion / agacement / frustration sur échecs recherche / ajout / review ; micro-copy rassurante sur erreurs API.
UX-DR12: Spoilers : case à cocher explicite à la rédaction ; contenu masqué avec révélation explicite pour les lecteurs.
```

### Carte de couverture des FR

| FR | Epic | Rappel court |
|----|------|----------------|
| FR1 | Epic 1 | Inscription / connexion |
| FR2 | Epic 1 | Profil (avatar, bio, stats optionnelles) |
| FR3 | Epic 2 | Recherche livres (Google Books serveur) |
| FR4 | Epic 2 | Ajout manuel si pas de résultat |
| FR5 | Epic 2 | Fiche livre |
| FR6 | Epic 2 | Bibliothèque + statuts de lecture |
| FR7 | Epic 3 | Marquer Lu + note |
| FR8 | Epic 3 | Review texte optionnel |
| FR9 | Epic 3 | Une review / user / livre, éditable |
| FR10 | Epic 3 | Flag spoiler sur la review |
| FR11 | Epic 4 | Suivre un utilisateur |
| FR12 | Epic 4 | Fil d’activité des suivis |
| FR13 | Epic 5 | Réactions Like / À lire |
| FR14 | Epic 5 | Commentaires sous review |
| FR15 | Epic 6 | Liste Tendance |
| FR16 | Epic 6 | Parcours découverte (tendance → livre → reviews → À lire) |

**NFR / UX-DR :** répartis dans les stories des epics concernés (ex. NFR4 + UX-DR4 dans Epic 2 ; NFR3 + UX-DR12 dans Epic 3 ; UX-DR2/5/6/7 dans Epics 2–4 selon écrans).

## Liste des epics

### Epic 1 — Compte & identité lecteur

**Objectif utilisateur :** créer un compte, se connecter, et présenter son identité de lecteur (profil).

**FR couverts :** FR1, FR2.

**Notes :** choix concret de la stack d’auth (architecture) à prendre en toute première story de cet epic. Les profils sont la base pour le social (Epic 4).

---

### Epic 2 — Découvrir les livres & tenir sa bibliothèque

**Objectif utilisateur :** trouver un livre (API ou saisie manuelle), consulter sa fiche, l’ajouter à sa bibliothèque avec un statut de lecture.

**FR couverts :** FR3, FR4, FR5, FR6.

**Notes :** aligné sur la boucle d’activation PRD (recherche → ajout). Inclut persistance des livres côté serveur (NFR9, service Google Books). UX : CTA « J’ai fini un livre », BookCard, messages d’erreur API rassurants (UX-DR2, UX-DR4, UX-DR5, UX-DR11).

---

### Epic 3 — Noter & publier des reviews

**Objectif utilisateur :** marquer un livre comme lu, donner une note, publier ou compléter une review (texte optionnel), gérer les spoilers, modifier sa review.

**FR couverts :** FR7, FR8, FR9, FR10.

**Notes :** une seule review par (utilisateur, livre). UX : note seule possible + nudge texte (UX-DR3), spoilers (UX-DR12), confirmation chaleureuse (UX-DR8), composants ReviewComposer / RatingControl (UX-DR10).

---

### Epic 4 — Suivre des lecteurs & voir l’activité

**Objectif utilisateur :** suivre d’autres personnes et consulter un fil d’activité à partir de leurs actions.

**FR couverts :** FR11, FR12.

**Notes :** le feed est plus riche après Epic 3 (reviews) ; en V1 on peut commencer par des événements liés bibliothèque + reviews selon ce qui est déjà en base. UX : ActivityRow, lisibilité (UX-DR6, UX-DR7), preuve sociale (UX-DR9).

---

### Epic 5 — Réagir & discuter autour des reviews

**Objectif utilisateur :** réagir aux reviews (Like, À lire) et participer aux discussions en commentaires.

**FR couverts :** FR13, FR14.

**Notes :** dépend des reviews (Epic 3). Prévoir modération / limites simples (NFR7) en stories.

---

### Epic 6 — Tendance & parcours découverte

**Objectif utilisateur :** repérer des livres populaires et enchaîner vers lecture des avis et ajout en « À lire ».

**FR couverts :** FR15, FR16.

**Notes :** règles métier de « Tendance » (fenêtre, pondération) à préciser dans une story dédiée. S’appuie sur l’activité et les données livres des epics précédents.

---

### Dépendances naturelles (ordre recommandé)

1 → 2 → 3 → 4 → 5 ; **Epic 6** après **2** au minimum (données livres + bibliothèque) ; idéalement après **3** pour un sens « communautaire » plus fort.

<!-- Après validation des epics : étape 3 — user stories détaillées (critères d’acceptation), epic par epic ou story par story selon ton rythme. -->
