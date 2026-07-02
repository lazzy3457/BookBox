# BooksBox

BooksBox est une application de lecture sociale pour lecteurs francophones. Elle réunit bibliothèque, journal de lecture, reviews, recommandations personnalisées, import Goodreads/CSV, listes et communauté. Le web Next.js est le client principal ; une application mobile Expo consomme le même backend.

Ce README est prevu pour une installation propre sur une autre machine, par exemple depuis un dossier Drive sans `node_modules`, sans `.next` et sans base de donnees locale.

## Sommaire

- Installation web
- Lancement mobile
- Variables d'environnement
- Architecture du projet
- Scripts utiles
- Fonctionnalites principales
- Documentation complémentaire
- Depannage

## Prerequis

- Node.js 20 ou plus recent.
- npm, installe avec Node.js.
- Docker Desktop lance avant de demarrer PostgreSQL.
- Expo Go sur le telephone pour tester l'application mobile.
- Une development build Android/iOS est necessaire pour tester proprement les notifications push systeme. Expo Go affiche des avertissements et ne supporte plus completement les remote push Android depuis Expo SDK 53.
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

Remplacer au minimum `NEXTAUTH_SECRET` par une valeur longue et aleatoire. En production, renseigner `NEXTAUTH_URL` et `NEXT_PUBLIC_APP_URL` avec l'URL publique en HTTPS afin de générer correctement les liens d’e-mail, le sitemap et les aperçus de partage. `GOOGLE_BOOKS_API_KEY` reste optionnelle en local.

Avant l'ouverture publique, renseigner également les variables de contact, juridiques, d’hébergement et SMTP. La liste complète figure dans `.env.example` et [docs/launch-checklist.md](docs/launch-checklist.md).

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

La base de données est vide au premier lancement. Une nouvelle inscription doit recevoir un e-mail de vérification : configure les variables `SMTP_*` pour tester ce parcours. Sans SMTP en développement, le compte est créé mais aucun e-mail n’est envoyé.

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

### Notifications push mobile

Le mobile supporte deux niveaux de notifications :

- une inbox dans l'application, accessible depuis le profil ;
- des notifications push systeme via Expo Notifications.

Les notifications push demandent les dependances mobiles suivantes :

```bash
cd mobile
npx expo install expo-notifications expo-constants
```

Le plugin `expo-notifications` doit rester declare dans `mobile/app.json`.

Android demande aussi le fichier Firebase Android `mobile/google-services.json`, reference par
`android.googleServicesFile` dans `mobile/app.json`. Ce fichier vient de Firebase Console >
Project settings > Your apps > Android app `com.bookbox.mobile` > Download `google-services.json`.
Ce n'est pas le fichier service account `firebase-adminsdk-...json` utilise dans EAS Credentials.
Avant de reconstruire l'APK, verifier la configuration :

```bash
cd mobile
npm run check:notifications
```

Avec Expo Go, les push Android affichent un avertissement et le rendu systeme reste limite. Pour tester le comportement reel sur telephone, utiliser une development build :

```bash
cd mobile
npm run check:notifications
npx eas build --profile development --platform android
npx expo start --dev-client
```

Apres installation de la development build, se connecter une fois dans l'app pour enregistrer le token push du telephone. Les notifications creees ensuite par les likes, commentaires, nouveaux followers et reviews d'amis peuvent apparaitre dans la barre de notifications. Le clic sur une notification ouvre l'app et navigue vers la fiche livre ou le profil cible quand la notification contient un lien.

## Variables d'environnement

Le fichier `.env` n'est pas versionne. Il doit etre cree a partir de `.env.example`.

Variables cote web :

- `DATABASE_URL` : URL PostgreSQL utilisee par Prisma.
- `NEXTAUTH_URL` : URL du site, par exemple `http://localhost:3000`.
- `NEXT_PUBLIC_APP_URL` : URL publique canonique du site.
- `NEXTAUTH_SECRET` : secret utilise par NextAuth.
- `GOOGLE_BOOKS_API_KEY` : optionnel en local, utilise cote serveur pour Google Books.
- `MOBILE_JWT_SECRET` : secret pour les tokens mobiles. Si absent, le code reutilise `NEXTAUTH_SECRET`.
- `RATE_LIMIT_SECRET` : secret utilise pour hacher les identifiants du limiteur de requetes.
- `CONTACT_EMAIL` et `DSA_CONTACT_EMAIL` : points de contact public et moderation legale.
- `LEGAL_*` et `HOST_*` : identification de l'editeur particulier et de l'hebergeur.
- `SMTP_*` : serveur d'envoi des verifications, recuperations et decisions de moderation.
- `TRUST_PROXY_HEADERS` : active uniquement derriere un proxy connu qui reecrit les en-tetes d'adresse client.
- `INACTIVE_ACCOUNT_POLICY_CONFIRMED` : doit valoir `confirmed` apres validation de la politique d'inactivite.

Les droits de moderation sont stockes en base et accordes avec `npm run admin:grant -- adresse@email.fr`.

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
      notifications/      Enregistrement push et clic sur notifications
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
- `Notification` : inbox sociale persistante.
- `NotificationPreference` : préférences détaillées pour les likes, commentaires, reviews d’amis et nouveaux followers.
- `UserPreference` : préférences privées de lecture, dont le masquage persistant des spoilers.
- `User.sessionVersion` : invalide les anciennes sessions après un changement de mot de passe.
- `PushToken` : tokens Expo Push enregistres par appareil.
- `ReadingPeriod` et `ReadingEntry` : lectures, relectures et journal de progression.
- `LegalAcceptance` et `AccountToken` : acceptations versionnées et jetons de compte hachés.
- `RecommendationDismissal` : exclusions des recommandations.
- `UserBlock` : blocages réciproques.
- `ModerationReport`, `LegalNotice`, `ModerationAction` et `ModerationAppeal` : modération, décisions et recours.

## Scripts utiles

Depuis la racine :

- `npm run dev` : lance le serveur de developpement.
- `npm run build` : genere Prisma puis build Next.js.
- `npm run start` : lance le build de production.
- `npm run lint` : lance ESLint.
- `npm test` : lance les tests Vitest.
- `npm run preflight` : contrôle les variables indispensables avant une mise en ligne.
- `npm run admin:grant -- adresse@email.fr` : accorde manuellement le rôle administrateur à un compte vérifié.
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

Le contrôle `npm run preflight` est réservé à une simulation de mise en ligne : il échoue volontairement en local tant que les coordonnées, l’hébergeur, le SMTP et la politique d’inactivité ne sont pas confirmés.

Depuis `mobile/` :

```bash
npm run typecheck
```

## Fonctionnalites principales

- Recherche de livres via Google Books et Open Library.
- Recherche par titre, auteur ou ISBN.
- Import d'un livre externe ou ajout manuel.
- Bibliotheque personnelle avec statuts de lecture et favoris.
- Journal de lecture daté, relectures et progression par page, pourcentage ou chapitre.
- Recommandations personnalisées explicables avec actions « Pas intéressé » et « Déjà lu ».
- Import Goodreads et CSV BookBox avec prévisualisation et résolution des conflits.
- Fiches livres avec statistiques, reviews, commentaires et activite sociale.
- Pages auteurs avec biographie, livres connus et editions externes.
- Reviews avec note, spoiler, edition, suppression, likes et commentaires.
- Profils publics et page communaute.
- Blocage réciproque, export des données et suppression du compte.
- Vérification d’e-mail et récupération du mot de passe.
- Signalements communautaires et notifications légales avec suivi et contestation.
- Page Paramètres complète : profil, pseudo unique, préférences, notifications, blocages, import/export et sécurité du compte.
- Administration par rôle, masquage de contenu et suspension de compte.
- Systeme de follow/unfollow.
- Feed social et tendances.
- Listes de livres personnalisables.
- Notifications sociales : likes, commentaires/reponses, nouveaux followers et nouvelles reviews d'amis, avec inbox mobile et push systeme.
- Interface web responsive avec navigation mobile.
- SEO, sitemap, manifeste, footer et pages légales.
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
- `GET /api/mobile/notifications`
- `PATCH /api/mobile/notifications/:notificationId/read`
- `GET /api/mobile/notification-preferences`
- `PATCH /api/mobile/notification-preferences`
- `GET|PATCH /api/settings/profile`
- `GET|PATCH /api/settings/preferences`
- `PATCH /api/settings/password`
- `POST /api/mobile/push-tokens`
- `DELETE /api/mobile/push-tokens`

Le mobile reutilise aussi certaines routes web compatibles avec le token mobile : `/api/auth/signup`, `/api/books/search`, `/api/books`, `/api/library`, `/api/reviews` et `/api/follows`.

Attention : `/api/auth/signup` exige désormais l’âge minimum et les versions juridiques courantes. Le formulaire mobile historique doit être aligné avant de permettre de nouvelles inscriptions depuis le mobile. Les comptes déjà créés continuent à fonctionner.

## Routes web de conformité principales

- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/account/export`
- `DELETE /api/account`
- `POST /api/reports`
- `POST /api/legal-notices`
- `POST /api/legal-notices/status`
- `POST /api/legal-notices/appeal`
- `GET/POST/DELETE /api/blocks`

## Documentation complémentaire

- [Architecture actuelle](architecture.md)
- [Checklist de mise en ligne](docs/launch-checklist.md)
- [Conformité web](docs/legal-compliance.md)
- [Référence API](docs/api-reference.md)
- [Exploitation de production](docs/production-operations.md)
- [Registre synthétique des traitements](docs/processing-register.md)
- [Suivi des dépendances](docs/dependency-security.md)

Les fichiers `prd-booksbox-v1.md`, `epics.md` et `ux-design-specification.md` sont des archives de conception.

## Depannage

Si Docker signale que le port `5432` est deja utilise, arreter l'autre PostgreSQL local ou modifier le port expose dans `docker-compose.yml`, puis adapter `DATABASE_URL` dans `.env`.

Si `prisma generate` ou `npm run build` echoue sous Windows avec une erreur `EPERM` sur le moteur Prisma, arreter le serveur Next.js puis relancer la commande.

Si le mobile ne se connecte pas au backend :

- verifier que le backend est lance avec `npm run dev -- -H 0.0.0.0` ;
- verifier que le telephone ouvre `http://ADRESSE_IP_DU_PC:3000` dans son navigateur ;
- verifier que `mobile/.env.local` contient la meme IP ;
- relancer Expo avec `npx expo start --lan -c` ;
- autoriser Node.js dans le pare-feu Windows si une alerte apparait.

Si les notifications push ne s'affichent pas dans la barre du telephone :

- verifier que `expo-notifications` et `expo-constants` sont installes dans `mobile/node_modules` ;
- verifier que le plugin `expo-notifications` est present dans `mobile/app.json` ;
- verifier que `mobile/google-services.json` existe, correspond a `com.bookbox.mobile`, puis reconstruire l'APK ;
- se reconnecter dans l'app mobile pour enregistrer le token push ;
- verifier que les preferences de notifications sont activees dans les parametres ;
- utiliser une development build pour un test fiable, car Expo Go limite les remote push Android depuis SDK 53.
