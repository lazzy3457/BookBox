# BooksBox Mobile

Application Expo React Native pour BooksBox.

## Lancement

```bash
cd mobile
npm install
npm run start
```

Par defaut l'app lit l'URL API depuis `EXPO_PUBLIC_API_URL`.

Pour tester sur un telephone physique, lance le serveur Next.js sur le reseau local. Le fichier `.env.local` contient:

```bash
EXPO_PUBLIC_API_URL=http://ADRESSE_IP_DU_PC:3000
```

Exemple :

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.54:3000
```

Depuis la racine du projet, lance le backend avec :

```bash
npm run dev -- -H 0.0.0.0
```

Le telephone et le PC doivent etre sur le meme reseau Wi-Fi.

## Notifications

L'app mobile possede :

- une inbox dans l'application, accessible depuis le profil ;
- des notifications push systeme via Expo Notifications.

Installer les dependances push :

```bash
npx expo install expo-notifications expo-constants
```

Le fichier `app.json` doit declarer le plugin :

```json
"plugins": [
  [
    "expo-notifications",
    {
      "color": "#7AF7C4"
    }
  ]
]
```

Android demande aussi un fichier Firebase Android a la racine mobile :

```text
mobile/google-services.json
```

Ce fichier se telecharge dans Firebase Console > Project settings > Your apps > Android app
`com.bookbox.mobile` > Download `google-services.json`. Ne pas le confondre avec le fichier
service account `firebase-adminsdk-...json` utilise pour EAS Credentials / FCM V1.

Verifier avant de reconstruire une APK :

```bash
npm run check:notifications
```

Expo Go affiche un avertissement avec Expo SDK 54, car les remote push Android ne sont plus completement supportes dans Expo Go depuis SDK 53. Pour tester le vrai rendu dans la barre de notifications et le clic a froid, utiliser une development build :

```bash
npm run check:notifications
npx eas build --profile development --platform android
npx expo start --dev-client
```

Apres installation de la development build sur le telephone :

1. lancer le backend Next.js sur le reseau local ;
2. lancer Expo en mode dev client ;
3. ouvrir l'app BookBox installee, pas Expo Go ;
4. se connecter pour enregistrer le `ExpoPushToken` ;
5. accepter la permission systeme ;
6. liker/commenter depuis un autre compte.

Le serveur envoie les push via l'Expo Push Service. Le payload contient `targetUrl`, `notificationId` et `type`. Quand l'utilisateur touche une notification contenant une URL de livre ou de profil, l'app s'ouvre sur l'ecran correspondant.

Si les notifications ne s'affichent pas :

- verifier que les preferences sont activees dans l'ecran Parametres ;
- verifier que le switch "Nouveaux followers" est actif pour recevoir les notifications de follow ;
- verifier que `mobile/google-services.json` existe et correspond au package Android `com.bookbox.mobile` ;
- verifier que le compte recepteur s'est reconnecte apres installation de `expo-notifications` ;
- verifier que le backend est accessible depuis le telephone ;
- utiliser une development build plutot qu'Expo Go pour exclure les limitations Expo Go.

## Backend utilise

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
- `POST /api/mobile/push-tokens`
- `DELETE /api/mobile/push-tokens`

Les routes web existantes comme `/api/books/search`, `/api/books`, `/api/library`, `/api/reviews` et `/api/follows` acceptent aussi le token mobile via `Authorization: Bearer <token>`.
