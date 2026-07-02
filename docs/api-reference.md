# Référence API BooksBox

Les routes renvoient du JSON. Les erreurs suivent généralement :

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Message lisible"
  }
}
```

Les routes web protégées utilisent la session NextAuth. Les routes partagées acceptent également un Bearer mobile valide.

## Compte

- `POST /api/auth/signup` : inscription avec âge et versions juridiques.
- `POST /api/auth/verify-email` : vérification de l’adresse.
- `POST /api/auth/resend-verification` : renvoi neutre.
- `POST /api/auth/forgot-password` : récupération neutre.
- `POST /api/auth/reset-password` : nouveau mot de passe.
- `GET /api/account/export` : export JSON privé.
- `DELETE /api/account` : suppression du compte.

L’ancien client mobile doit transmettre les nouveaux champs juridiques avant de pouvoir créer de nouveaux comptes. Les comptes existants peuvent continuer à se connecter.

## Lecture

- `GET/POST/PATCH/DELETE /api/library`
- `GET/POST /api/reading-journal`
- `PATCH/DELETE /api/reading-journal/:entryId`
- `POST /api/library/import`
- `GET /api/library/import/template`

## Livres et découverte

- `GET /api/books/search`
- `POST /api/books`
- `GET /api/books/:bookId`
- `GET /api/trending`
- `GET/POST /api/recommendations`

## Social

- `POST /api/reviews`
- `PATCH/DELETE /api/reviews/:reviewId`
- `POST /api/reviews/:reviewId/reactions`
- `POST /api/reviews/:reviewId/comments`
- `PATCH/DELETE /api/comments/:commentId`
- `POST /api/comments/:commentId/reactions`
- `POST/DELETE /api/follows`
- `GET /api/feed`
- `GET /api/users/search`
- `GET/POST/DELETE /api/blocks`

## Modération

- `POST /api/reports` : signalement communautaire authentifié.
- `POST /api/legal-notices` : notification légale publique.
- `POST /api/legal-notices/status` : suivi avec code et e-mail.
- `POST /api/legal-notices/appeal` : contestation.
- `GET /api/admin/reports` : liste administrateur.
- `PATCH /api/admin/reports/:reportId` : décision et action.
- `PATCH /api/admin/legal-notices/:noticeId` : décision légale.

## Mobile

Les routes spécifiques sous `/api/mobile` couvrent authentification, accueil, livres, auteurs, profils, communauté, listes, notifications, préférences et jetons push.

## Paramètres web

- `GET|PATCH /api/settings/profile` : consulter et modifier nom, pseudo, bio et avatar.
- `GET|PATCH /api/settings/preferences` : consulter et modifier les préférences privées, notamment le masquage des spoilers.
- `PATCH /api/settings/password` : changer le mot de passe après vérification du mot de passe actuel. L’opération invalide les autres sessions.
- `GET|PATCH /api/mobile/notification-preferences` : réglages détaillés des notifications, utilisés également par le web.

Toutes ces routes exigent une session authentifiée. Le profil est enregistré explicitement ; les préférences et notifications sont enregistrées immédiatement.

Un compte non vérifié ou suspendu ne peut pas se connecter. Une ancienne session ne permet pas à un compte suspendu d’effectuer une mutation.
