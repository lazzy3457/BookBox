# Environnements BooksBox

Trois environnements, chacun avec sa propre base PostgreSQL et ses propres secrets. Le code est le même partout ; seules les variables d’environnement changent.

| | Développement | Staging (préproduction) | Production |
|---|---|---|---|
| Où | Poste du développeur | Hébergeur, URL privée ou d’aperçu | Hébergeur, domaine public |
| Base | Docker local (`docker compose up -d`) | Base dédiée chez l’hébergeur | Base dédiée chez l’hébergeur, sauvegardée |
| Données | Fausses données, comptes de test | Fausses données ou copie anonymisée | Vraies données personnelles |
| Variables | `.env` (jamais commité) | Variables de l’hébergeur | Variables de l’hébergeur |
| Migrations | `npx prisma migrate dev` pour en créer | `npm run db:deploy` au déploiement | `npm run db:deploy` au déploiement |
| Secrets | Valeurs de développement | Uniques à staging | Uniques à la production |

## Règles

- Ne jamais copier des données de production vers le développement ou le staging sans les anonymiser.
- `prisma migrate dev` est réservé au développement : il peut proposer de réinitialiser la base. Ailleurs, seul `prisma migrate deploy` est utilisé.
- Les secrets (`NEXTAUTH_SECRET`, `MOBILE_JWT_SECRET`, `RATE_LIMIT_SECRET`, SMTP, base) sont différents dans chaque environnement. Une fuite du staging ne doit rien ouvrir en production.
- `npm run preflight` refuse une configuration incomplète, une URL non HTTPS ou une base locale ; il se lance avec les variables de staging ou de production.
- Le staging peut envoyer des e-mails : utiliser un SMTP de test (boîte de capture) ou une liste d’adresses autorisées.

## Une base par branche en développement

Une branche qui modifie le schéma utilise sa propre base locale, pour ne pas mélanger ses migrations avec celles de `master` :

```bash
npm run db:branch
```

Le script copie la base `booksbox` vers `booksbox_<branche>` (par exemple `booksbox_parcours` pour `bdd_parcours`), y applique les migrations de la branche, puis affiche la ligne `DATABASE_URL` à mettre dans `.env`. Garder la ligne de `master` en commentaire pour revenir dessus.

Revenir sur `master` sans changer de base fonctionne pour la lecture, mais ne jamais y lancer `prisma migrate dev` : Prisma verrait des migrations inconnues et proposerait une réinitialisation.

## Flux de livraison

1. Développer sur une branche, avec sa base locale.
2. Vérifier : `npm run lint`, `npm test`, `npm run build`.
3. Déployer la branche sur le staging : l’hébergeur exécute `npm run db:deploy` puis `npm run build`.
4. Tester sur le staging (inscription, e-mails, parcours, modération).
5. Fusionner dans `master` : la production se déploie avec les mêmes commandes.

Les prérequis d’ouverture au public sont dans `launch-checklist.md`, l’exploitation courante dans `production-operations.md`.
