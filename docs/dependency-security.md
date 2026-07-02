# Suivi des dépendances

Audit initial du 2 juillet 2026 : six alertes de production (une haute et cinq modérées) observées dans `next`/PostCSS et `next-auth`/Nodemailer/`uuid`, sans correctif direct compatible proposé au moment de l’audit. BooksBox n’expose aucune option avancée de Nodemailer (`raw`, `envelope`, en-têtes arbitraires ou nom EHLO) aux entrées utilisateur, ce qui réduit l’exposition aux avis recensés, sans les faire disparaître. Leur exploitabilité doit être réévaluée avant chaque déploiement.

- Exécuter `npm audit --omit=dev` à chaque livraison.
- Ne pas appliquer `npm audit fix --force` sans revue des changements majeurs.
- Réexaminer les alertes au plus tard tous les 30 jours.
- Mettre à jour Next.js et NextAuth dès qu’une version compatible corrige les dépendances transitives.
- Ne jamais fournir aux options Nodemailer des valeurs utilisateur pour `raw`, `envelope`, les en-têtes arbitraires ou le nom EHLO.
- Consigner après chaque mise à jour le nombre, la sévérité, l’exploitabilité et la décision prise.
