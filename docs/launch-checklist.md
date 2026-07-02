# Checklist de mise en ligne BooksBox

Une case non validée signifie que le site n’est pas prêt à être ouvert au public.

## Identité et juridique

- [ ] `LEGAL_NAME`, `LEGAL_ADDRESS` et `LEGAL_DIRECTOR` correspondent à l’éditeur réel.
- [ ] `CONTACT_EMAIL` et `DSA_CONTACT_EMAIL` sont surveillées.
- [ ] `HOST_NAME`, `HOST_ADDRESS` et `HOST_PHONE` correspondent à l’hébergeur.
- [ ] La politique des comptes inactifs est définie puis `INACTIVE_ACCOUNT_POLICY_CONFIRMED=confirmed`.
- [ ] Les prestataires, pays de traitement et garanties de transfert sont documentés.
- [ ] Les pages légales ont reçu une validation juridique finale.
- [ ] Le statut de micro/petite structure et les obligations DSA applicables sont confirmés.

## Domaine et secrets

- [ ] Le domaine définitif utilise HTTPS.
- [ ] `NEXTAUTH_URL` et `NEXT_PUBLIC_APP_URL` utilisent exactement ce domaine.
- [ ] `NEXTAUTH_SECRET`, `MOBILE_JWT_SECRET` et `RATE_LIMIT_SECRET` sont longs, uniques et absents du dépôt.
- [ ] `TRUST_PROXY_HEADERS=true` uniquement derrière un proxy connu qui réécrit les adresses clientes.
- [ ] Les secrets de développement ont été remplacés.

## E-mails

- [ ] Toutes les variables `SMTP_*` sont renseignées.
- [ ] SPF, DKIM et DMARC sont configurés.
- [ ] Vérification, renvoi et mot de passe oublié sont testés.
- [ ] Les décisions de modération sont correctement envoyées.

## Base de données

- [ ] PostgreSQL de production est créé avec accès chiffré.
- [ ] `npx prisma migrate deploy` réussit.
- [ ] Une sauvegarde chiffrée est planifiée.
- [ ] Une restauration a été testée.
- [ ] La rotation respecte la durée documentée.

## Administration et modération

- [ ] Au moins un compte vérifié possède le rôle `ADMIN`.
- [ ] `/moderation` est inaccessible à un compte ordinaire.
- [ ] Les signalements communautaires et `/signalement` sont testés.
- [ ] Masquage, restauration, suspension et contestation sont testés.
- [ ] Une fréquence de consultation humaine des signalements est définie.

## Contrôles techniques

```bash
npm install
npm run preflight
npx prisma migrate deploy
npm test
npm run lint
npm run build
npm audit --omit=dev
```

- [ ] Le build ne contient aucune erreur.
- [ ] Les alertes npm restantes sont relues dans `docs/dependency-security.md`.
- [ ] `robots.txt`, `sitemap.xml`, `manifest.webmanifest` et l’image Open Graph répondent.
- [ ] Les pages 404, erreur, inscription, connexion, paramètres et signalement sont testées au clavier.
- [ ] Aucune donnée privée n’apparaît dans une réponse publique.

## Après ouverture

- [ ] Disponibilité et erreurs surveillées sans traceur non consenti.
- [ ] Signalements ouverts consultés quotidiennement.
- [ ] Sauvegardes testées périodiquement.
- [ ] Dépendances revues mensuellement.
- [ ] Registre des incidents maintenu.
