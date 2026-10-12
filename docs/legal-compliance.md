# Conformité web BooksBox

Dernière mise à jour : 2 juillet 2026

Ce document décrit les mécanismes intégrés au produit. Il ne remplace pas un avis juridique.

## Cadre retenu

- Éditeur particulier établi en France.
- Service gratuit, sans publicité ni mesure d’audience au lancement.
- Création de compte réservée aux personnes déclarant avoir au moins 15 ans.
- Web publié en premier ; mobile hors du lancement initial.

## Information et acceptation

Les versions des conditions et de la politique sont centralisées dans `src/lib/legal.ts`. L’inscription exige l’âge minimum, l’acceptation des conditions et la reconnaissance de la politique de confidentialité.

`LegalAcceptance` conserve les versions, la date et la source, sans enregistrer l’adresse IP.

## Droits des personnes

Les paramètres permettent la modification du profil, le masquage privé des spoilers, le changement de mot de passe, l’export JSON, la suppression du compte, la gestion des blocages et les préférences détaillées de notifications. Un changement de mot de passe invalide les anciennes sessions.

Les données de conformité, signalement et modération sont incluses dans l’export. Les notifications légales liées à l’e-mail sont supprimées avec le compte. Les actions de modération restent anonymisées pour préserver l’audit.

## Cookies

BooksBox utilise les cookies nécessaires à NextAuth. Les recherches et livres récents sont conservés localement dans le navigateur. Aucun analytics ni cookie publicitaire n’est installé dans la configuration de lancement.

Tout nouveau traceur non nécessaire exige une nouvelle analyse, la mise à jour des textes et, si nécessaire, le consentement préalable.

## Modération et DSA

Deux mécanismes coexistent :

- signalement communautaire authentifié depuis les contenus ;
- notification publique de contenu potentiellement illicite via `/signalement`.

La notification publique demande e-mail, URL BooksBox exacte, fondement, explication et déclaration de bonne foi. Un code permet le suivi et la contestation.

Une décision clôturée exige une motivation. Les modérateurs peuvent masquer ou restaurer un contenu et suspendre ou réactiver un profil. Chaque action est inscrite dans `ModerationAction`.

## Points encore bloquants

- Choix et mise en œuvre de la durée des comptes inactifs.
- Identité réelle de l’éditeur et de l’hébergeur.
- Prestataire SMTP définitif et contrats associés.
- Analyse des transferts hors UE.
- Qualification DSA finale et validation juridique.

`npm run preflight` reste en échec tant que la configuration obligatoire n’est pas complète.
