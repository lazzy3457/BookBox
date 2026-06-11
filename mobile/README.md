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

Les routes web existantes comme `/api/books/search`, `/api/books`, `/api/library`, `/api/reviews` et `/api/follows` acceptent aussi le token mobile via `Authorization: Bearer <token>`.
