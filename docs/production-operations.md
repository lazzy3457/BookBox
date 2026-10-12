# Exploitation de production BooksBox

## Avant ouverture

- Exécuter `npm run preflight`, `npm audit`, `npm test`, `npm run lint` et `npm run build`.
- Appliquer les migrations avec `npx prisma migrate deploy`.
- Accorder le rôle de modération avec `npm run admin:grant -- adresse@email.fr`.
- Valider l’identité de l’éditeur, l’hébergeur, le SMTP, les transferts de données et la politique des comptes inactifs.
- Tester l’envoi, la réception et l’expiration des e-mails transactionnels.
- Vérifier les routes `robots.txt`, `sitemap.xml`, `manifest.webmanifest` et `opengraph-image`.
- Conserver hors du dépôt une copie sécurisée des variables et de la procédure de rotation des secrets.

## Sauvegardes

- Réaliser une sauvegarde PostgreSQL chiffrée quotidienne et conserver au maximum 30 jours.
- Limiter l’accès aux sauvegardes à l’exploitant, journaliser les restaurations et tester une restauration chaque trimestre.
- Propager les suppressions de comptes aux sauvegardes lors de leur rotation naturelle ; ne jamais restaurer une sauvegarde sans rejouer les suppressions intervenues depuis sa création.

## Incident

1. Isoler le composant touché et préserver les journaux utiles sans copier davantage de données personnelles.
2. Identifier les catégories de données, personnes concernées, durée et conséquences.
3. Corriger la cause, révoquer les secrets compromis et documenter les mesures prises.
4. Évaluer la notification à la CNIL sous 72 heures et l’information des personnes concernées.
5. Conserver un registre interne de l’incident et effectuer un retour d’expérience.

## Rotation des secrets

- Une rotation de `NEXTAUTH_SECRET` déconnecte les sessions web existantes.
- Une rotation de `MOBILE_JWT_SECRET` invalide les jetons mobiles.
- Une rotation de `RATE_LIMIT_SECRET` crée de nouvelles clés de limitation sans révéler les anciennes.
- Révoquer immédiatement les identifiants SMTP, Google Books ou base de données compromis.

## Modération

- Examiner quotidiennement les notifications légales ouvertes.
- Motiver toute clôture et toute action ; ne jamais modifier manuellement le journal d’audit.
- Traiter les contestations séparément et conserver uniquement les informations nécessaires.
- Accorder le rôle administrateur uniquement avec `npm run admin:grant -- adresse@email.fr`.
- Révoquer un administrateur directement en base en remettant son rôle à `USER`.
