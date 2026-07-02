# Architecture BooksBox

Dernière mise à jour : 2 juillet 2026

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

### Lecture

- `UserBook` représente la présence du livre dans la bibliothèque.
- `ReadingPeriod` représente une lecture ou une relecture avec début et fin.
- `ReadingEntry` représente une progression datée en page, pourcentage ou chapitre.
- Une entrée de journal est privée par défaut et peut être rendue publique individuellement.

### Recommandations

Le score combine notes, favoris, statuts, auteurs appréciés et proximité avec d’autres lecteurs. Les livres lus ou abandonnés et les exclusions explicites sont retirés. Aucune IA payante n’est utilisée.

### Import

L’import Goodreads/BookBox fonctionne en deux phases : prévisualisation sans écriture, puis confirmation transactionnelle. La correspondance utilise ISBN, identifiant externe, puis titre/auteur normalisés.

### Social et confidentialité

- Reviews, commentaires, réactions, follows, listes et notifications sont persistés.
- Le blocage supprime les follows mutuels, empêche les interactions et masque réciproquement profils et contenus.
- Les contenus masqués et comptes suspendus sont exclus des pages et API publiques.

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

`User`, `LegalAcceptance`, `AccountToken`, `Book`, `UserBook`, `ReadingPeriod`, `ReadingEntry`, `Review`, `ReviewComment`, `Follow`, `UserBlock`, `BookList`, `Notification`, `PushToken`, `RecommendationDismissal`, `ModerationReport`, `LegalNotice`, `ModerationAction` et `ModerationAppeal`.

Les relations utilisateur utilisent en majorité `onDelete: Cascade`. Le journal d’audit de modération anonymise le modérateur supprimé avec `SetNull`.

## Déploiement

1. Renseigner toutes les variables décrites dans `.env.example`.
2. Choisir et confirmer la politique des comptes inactifs.
3. Exécuter `npm run preflight`.
4. Appliquer `npx prisma migrate deploy`.
5. Exécuter tests, lint et build.
6. Accorder au moins un rôle administrateur.
7. Vérifier SMTP, sauvegardes et restauration.

Voir [docs/launch-checklist.md](docs/launch-checklist.md) et [docs/production-operations.md](docs/production-operations.md).
