# BookBox Mobile

Application Expo React Native pour BookBox.

## Lancement

```bash
cd mobile
npm install
npm run start
```

Par defaut l'app lit l'URL API depuis `EXPO_PUBLIC_API_URL`.

Pour tester sur un telephone physique, lance le serveur Next.js sur le reseau local. Le fichier `.env.local` contient:

```bash
EXPO_PUBLIC_API_URL=http://10.21.113.200:3000
```

## Backend utilise

- `POST /api/mobile/auth/login`
- `GET /api/mobile/auth/me`
- `GET /api/mobile/home`
- `GET /api/mobile/books/:bookId`
- `GET /api/mobile/profile`
- `GET /api/mobile/community`
- `GET /api/mobile/lists/:listId`

Les routes web existantes comme `/api/books/search`, `/api/books`, `/api/library`, `/api/reviews` et `/api/follows` acceptent aussi le token mobile via `Authorization: Bearer <token>`.
