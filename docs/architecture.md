# Architecture BooksBox

Dernière mise à jour : 26 octobre 2026

Ce document décrit l’architecture réellement utilisée. Les anciens documents produit et UX restent des archives de conception.

## Vue d’ensemble

```text
Navigateur web ─┐
                ├─> Next.js App Router et routes API
Mobile Expo ────┘        │
                         ├─> services métier et sécurité
                         ├─> Prisma 6.19.3
                         └─> PostgreSQL

Services externes :
Google Books · Open Library · Wikimedia · Expo Push · SMTP
```

Le web est le client principal. Le mobile Expo consomme le même backend avec un jeton Bearer et ne possède pas de serveur séparé.

## Stack

- Next.js 16, React, TypeScript et Tailwind CSS.
- NextAuth Credentials avec sessions JWT.
- Prisma et PostgreSQL.
- Zod pour les entrées API.
- Nodemailer avec SMTP générique pour les e-mails transactionnels.
- Vitest et ESLint.
- Expo SDK 54 pour le mobile.

## Organisation

```text
src/app/                 pages web, métadonnées et routes API
src/components/          composants React par domaine
src/lib/                 configuration publique et helpers partagés
src/server/actions/      server actions des formulaires web
src/server/auth/         sessions web/mobile et rôles
src/server/email/        transport SMTP
src/server/security/     limitation des requêtes
src/server/services/     logique métier et intégrations
src/server/validation/   schémas Zod
prisma/                  schéma et migrations PostgreSQL
scripts/                 préflight, administration et lancement
docs/                    exploitation, conformité et sécurité
mobile/                  application Expo
```

Répartition des points d’entrée :

- `src/server/services/` porte la logique métier et les accès Prisma ; c’est la seule couche à faire évoluer pour changer une règle.
- `src/server/actions/` contient les server actions appelées par les formulaires web ; elles délèguent aux services.
- `src/app/api/` expose les routes appelées côté client web ; `src/app/api/mobile/` expose celles du client Expo (authentification `Bearer`). Les deux délèguent aux mêmes services.
- Une nouvelle fonctionnalité commence par un service, puis un point d’entrée web et/ou mobile.

## Authentification et autorisation

- Une inscription web exige l’attestation d’un âge minimum de 15 ans et l’acceptation des versions juridiques courantes.
- Les acceptations sont enregistrées dans `LegalAcceptance`.
- Un nouveau compte doit vérifier son e-mail avec un jeton haché valable 24 heures.
- Un lien de réinitialisation de mot de passe est valable 30 minutes et utilisable une seule fois.
- Les réponses de vérification et récupération ne révèlent pas l’existence d’un compte.
- Les comptes existant avant la migration du lot 8 ont été considérés comme vérifiés.
- Les routes protégées passent par `requireCurrentUserId`; une ancienne session ne permet pas à un compte suspendu d’agir.
- Les administrateurs possèdent le rôle `ADMIN` en base. Le rôle est accordé avec `npm run admin:grant -- adresse@email.fr`.
- Les requêtes web mutantes vérifient leur origine. Les clients mobiles utilisent `Authorization: Bearer`.

L’ancien mécanisme `ADMIN_EMAILS` n’est plus utilisé.

## Domaines métier

### Livres et genres

- `Book.genres` contient au plus trois genres principaux, sous forme de slugs issus de la liste fermée de `src/lib/genres.ts` (Fantasy, Science-fiction, Romance, Thriller, Policier, Horreur, Aventure, Roman historique, Littérature, Classique, Jeunesse, Young adult, BD & manga, Poésie, Théâtre, Biographie, Histoire, Philosophie, Sciences, Développement personnel).
- `genresFromCategories` convertit les catégories Google Books et les sujets Open Library : un genre doit totaliser au moins la moitié des correspondances du genre dominant, et les genres documentaires sont écartés pour un livre classé « Fiction ».
- À l’ajout d’un livre Google Books, la fiche du volume est consultée pour obtenir la catégorie détaillée ; un échec réseau n’empêche pas l’ajout. Un livre existant conserve ses genres.
- Un livre manuel reçoit les genres choisis dans le formulaire ; les valeurs inconnues sont refusées par la validation Zod.
- Les genres s’affichent en badges (`GenreBadges`) sur la fiche livre, les résultats de recherche et l’étagère, qui propose aussi un filtre par genre.
- `npm run genres:backfill` (option `-- --dry-run`) renseigne les livres existants sans genre.

### Lecture

- `UserBook` représente la présence du livre dans la bibliothèque. Son `createdAt` sert de date d’ajout : elle est affichée sur l’étagère et la fiche livre, et sert au tri « Ajout récent » ; `updatedAt` alimente le tri « Activité récente ».
- `ReadingPeriod` représente une lecture ou une relecture avec début et fin.
- `ReadingEntry` représente une progression datée en page, pourcentage ou chapitre.
- Une entrée de journal est privée par défaut et peut être rendue publique individuellement.

### Recommandations

Le score combine notes, favoris, statuts, auteurs appréciés et proximité avec d’autres lecteurs. Les livres lus ou abandonnés et les exclusions explicites sont retirés. Aucune IA payante n’est utilisée.

### Import

L’import Goodreads/BookBox fonctionne en deux phases : prévisualisation sans écriture, puis confirmation transactionnelle. La correspondance utilise ISBN, identifiant externe, puis titre/auteur normalisés. La date d’ajout (`Date Added` Goodreads ou colonne `addedAt` BookBox) est reprise comme `UserBook.createdAt` lorsqu’un livre entre dans la bibliothèque ; un livre déjà présent conserve sa date d’ajout.

### Progression : XP, niveaux, parcours et badges

Le barème, les plafonds, les badges, les titres de niveau et les étapes du parcours sont définis dans `src/lib/progression.ts` (module pur, testé). La base ne stocke que ce que les lecteurs gagnent.

- **XP** : `recordProgress(userId, raison, sourceId)` (`src/server/services/progression.ts`) est appelé après la mutation par les points d’entrée existants : statut de bibliothèque (ajout, livre terminé), review, entrée de journal, commentaire, like de review ou de commentaire, abonnement. Il n’existe aucune route pour gagner de l’XP. Une erreur de progression est journalisée sans faire échouer l’action principale.
- **Anti-farm** : `XpEvent` est unique par `(userId, raison, sourceId)`. La source d’un livre terminé ou d’une review est le livre, pas la review : supprimer puis réécrire ne rapporte rien. Les petites actions ont un plafond d’XP quotidien ; au-delà, l’action est enregistrée à 0 XP.
- **Niveaux** : calculés à partir de `UserStats.xpTotal`, sans stockage : le niveau n demande `10 × n²` XP au total, avec un titre par tranche.
- **Parcours** : démarré par le premier livre terminé (ou manuellement si un livre était déjà lu). `ActivityDay` cumule l’XP du jour dans le fuseau du lecteur (`UserStats.timezone`, synchronisé depuis le navigateur) ; le jour est validé quand l’objectif quotidien est atteint. La validation passe par un `updateMany` conditionnel pour qu’une seule requête concurrente fasse avancer la série. Un gel est gagné tous les 7 jours de série (2 au maximum) et comble automatiquement des jours manqués.
- **Badges** : les paliers sont calculés sur les données réelles (livres lus, reviews, likes, commentaires, entrées de journal, record de série, jours validés), si bien que l’historique et les imports comptent. Un palier obtenu en direct crée une notification `BADGE_EARNED` ; les paliers rattrapés à l’affichage d’un profil sont attribués sans notification.
- **Visibilité** : le profil public montre le niveau, son titre et le plus haut palier par badge, sans les compteurs détaillés. L’XP, la série et le calendrier ne sont visibles que par leur propriétaire.

### Social et confidentialité

- Reviews, commentaires, réactions, follows, listes et notifications sont persistés.
- **Fils de commentaires** : on peut répondre à un commentaire à n’importe quelle profondeur (`ReviewComment.parentId`). La liste plate est transformée en arbre par `buildCommentTree` (`src/lib/commentThread.ts`) ; une réponse dont le parent n’est pas visible remonte à la racine. Supprimer un commentaire qui a des réponses le vide (`deletedAt`) au lieu d’effacer le sous-fil ; les parents supprimés sans réponse restante sont effacés (`src/server/services/comments.ts`).
- Le blocage supprime les follows mutuels, empêche les interactions et masque réciproquement profils et contenus.
- Les contenus masqués et comptes suspendus sont exclus des pages et API publiques, y compris les reviews masquées sur le profil public.

### Modération

- `ModerationReport` couvre les signalements communautaires authentifiés.
- `LegalNotice` couvre les notifications publiques de contenus potentiellement illicites.
- `ModerationAction` constitue le journal d’audit des masquages, restaurations et suspensions.
- `ModerationAppeal` conserve les contestations.
- Une clôture exige une motivation et peut notifier les parties par e-mail.

## Sécurité

- Mots de passe hachés avec bcrypt.
- Jetons de compte stockés uniquement sous forme SHA-256.
- Limitation persistante des requêtes avec identifiants HMAC.
- Validation stricte des entrées et taille maximale des imports.
- En-têtes CSP, HSTS en production, anti-framing et politiques de permissions.
- Export et suppression de compte disponibles depuis les paramètres.
- Secrets et jetons push exclus des logs.
- `npm run preflight` bloque une configuration de production incomplète.

## Données principales

- Comptes : `User`, `UserPreference`, `LegalAcceptance`, `AccountToken`, et les tables NextAuth `Account`, `Session`, `VerificationToken`.
- Lecture : `Book`, `UserBook`, `ReadingPeriod`, `ReadingEntry`, `RecommendationDismissal`.
- Social : `Review`, `ReviewReaction`, `ReviewComment`, `ReviewCommentReaction`, `Follow`, `UserBlock`, `BookList`, `BookListEntry`.
- Notifications : `Notification`, `NotificationPreference`, `PushToken`.
- Progression : `XpEvent`, `ActivityDay`, `UserStats`, `UserBadge`.
- Modération : `ModerationReport`, `LegalNotice`, `ModerationAction`, `ModerationAppeal`.
- Technique : `RateLimitBucket`.

Les clés étrangères interrogées seules (`UserBook.bookId`, `Review.bookId`, `Follow.followingId`, `BookListEntry.bookId`, et `userId` des réactions et commentaires) ont un index dédié : un `@@unique` composite ne sert qu’à chercher par sa première colonne.

Les relations utilisateur utilisent en majorité `onDelete: Cascade`. Le journal d’audit de modération anonymise le modérateur supprimé avec `SetNull`.

## Déploiement

Chaque environnement (développement, staging, production) a sa propre base et ses propres secrets : voir [docs/environnements.md](environnements.md).

1. Renseigner toutes les variables décrites dans `.env.example` chez l’hébergeur.
2. Choisir et confirmer la politique des comptes inactifs.
3. Exécuter `npm run preflight` (il refuse aussi une base locale).
4. Appliquer `npm run db:deploy`, puis `npm run genres:backfill` si des livres antérieurs aux genres existent.
5. Exécuter tests, lint et build.
6. Accorder au moins un rôle administrateur.
7. Vérifier SMTP, sauvegardes et restauration.

Voir [docs/launch-checklist.md](launch-checklist.md) et [docs/production-operations.md](production-operations.md).
