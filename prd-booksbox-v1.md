---
stepsCompleted: [1]
inputDocuments: []
workflowType: "prd"
product_name: "BooksBox"
version: "V1"
date: "2026-04-03"
language: "fr"
---

# PRD — BooksBox (V1 Web)

**Auteur :** Maeld  
**Date :** 2026-04-03  
**Version :** V1 (Web)

## 1) Résumé exécutif

BooksBox est une application web “à la Letterboxd” pour les livres : on peut rechercher des livres, les ajouter à sa bibliothèque (à lire / en cours / lu), publier des reviews, et interagir via réactions et discussions sous les reviews. La V1 vise d’abord les gros lecteurs francophones, avec une expérience mobile-first et une couche sociale simple mais gratifiante.

## 2) Problème & opportunité

### Problème

Les plateformes existantes (ex. Goodreads) sont perçues comme :
- peu “sociales” (interactions limitées, peu engageantes)
- avec une UX/UI peu attractive et peu fluide
- peu adaptées à des formats de review variés (micro-reviews, discussions structurées, et “review par chapitre”)

### Opportunité

Créer un produit centré sur :
- une belle interface, simple, rapide, agréable
- des interactions sociales naturelles autour des reviews
- des reviews plus fines (chapitre + livre) pour renforcer l’engagement des lecteurs assidus

## 3) Audience cible (V1)

### Cible principale

**Gros lecteurs francophones** : lecteurs très actifs, qui aiment partager, débattre, recommander, et suivre ce que lisent leurs amis.

### Cibles secondaires (plus tard / indirectement)

**Petits lecteurs** : la dimension sociale peut donner envie de lire davantage (effet motivation).

## 4) Proposition de valeur & différenciation

### Proposition de valeur

“Une app pour capturer ce que tu lis, publier des reviews, et discuter autour des livres — avec une UI moderne et un social vivant.”

### Différenciation clé (V1)

**Social + belle UI**, avec **reviews de livre** en V1, puis **reviews par chapitre** en V1.5+.

## 5) Objectifs (V1) & métriques de succès

### Objectifs produit

- Permettre à un utilisateur de **trouver** un livre et de l’ajouter facilement à sa bibliothèque
- Permettre de **publier une review** et de recevoir des interactions
- Mettre en place un **minimum de réseau social** (amis) pour alimenter un feed
- Lancer une “boucle” d’habitude : lire → marquer lu → reviewer → interagir

### Métriques (à préciser pendant l’itération PRD)

- Taux d’activation : % des nouveaux utilisateurs qui réalisent la boucle 2 minutes (cf. ci-dessous)
- Reviews par utilisateur actif / semaine
- Interactions (réactions + commentaires) par review
- Rétention (D7, D30) des gros lecteurs

## 6) Boucle d’activation (2 minutes)

**Action #1 :** Rechercher un livre → l’ajouter en “Lu” → mettre une note + mini-review.

## 7) Périmètre produit

### In-scope (V1)

#### A) Comptes & profils
- Création de compte / connexion
- Profil utilisateur : avatar, bio (simple), stats basiques (optionnel)
- Bibliothèque personnelle avec statuts : **À lire / En cours / Lu / Abandonné**

#### B) Catalogue livres (via API)
- Recherche de livres via **Google Books API** (titre / auteur minimum)
- Page “fiche livre” : couverture, titre, auteur, description (si dispo via API)
- Ajout à la bibliothèque depuis la recherche ou la fiche livre
- **Ajout manuel d’un livre** si non trouvé via API (titre + auteur obligatoires)

#### C) Reviews
- Créer une review de livre : note + texte (mini-review)
- **Une seule review par utilisateur et par livre** (review éditable)
- Indiquer un **spoiler** (flag)
- (Préparation V1) permettre d’évoluer vers “reviews par chapitre” (structure de données + UI plus tard)

#### D) Social minimal
- Suivre des utilisateurs (amis)
- Feed : activité des amis (review publiée, livre terminé, etc.)
- Réactions sur une review : **Like** + **À lire**
- Commentaires sous une review (discussions)

#### E) Découverte simple
- “Tendance” basée sur la **popularité** (ex. nombre d’ajouts “Lu” + “À lire” sur une période)

### Out-of-scope (V1)

- Clubs de lecture, salons, événements live
- Messagerie privée
- Import massif (Goodreads/Kindle) (à décider plus tard)
- Modération avancée / anti-spam sophistiquée (V1 = règles simples)
- Monétisation (abonnements, etc.)

## 8) User stories (V1 — haut niveau)

### Recherche & ajout
- En tant qu’utilisateur, je peux rechercher un livre et voir des résultats pertinents.
- En tant qu’utilisateur, je peux ouvrir la fiche d’un livre et l’ajouter à ma bibliothèque avec un statut.

### Marquer lu + review
- En tant qu’utilisateur, je peux marquer un livre “Lu” et publier une note + mini-review.
- En tant qu’utilisateur, je peux marquer une review comme spoiler.

### Social
- En tant qu’utilisateur, je peux suivre un autre utilisateur.
- En tant qu’utilisateur, je peux voir un feed des activités de mes amis.
- En tant qu’utilisateur, je peux réagir et commenter une review.

### Découverte
- En tant qu’utilisateur, je peux voir une liste “tendance” de livres populaires.

## 9) Parcours clés (V1)

### Parcours 1 — Activation (nouvel utilisateur)
1. Je crée un compte
2. Je cherche un livre
3. Je l’ajoute en “Lu”
4. Je mets une note + mini-review

### Parcours 2 — Social
1. Je suis un ami
2. J’ouvre mon feed
3. Je like / commente une review

### Parcours 3 — Découverte
1. J’ouvre “Tendance”
2. Je sélectionne un livre
3. Je lis les reviews
4. Je l’ajoute en “À lire”

## 10) Exigences non-fonctionnelles (V1)

- UX mobile-first (web responsive)
- Performance : recherche fluide, feed paginé
- Gestion spoilers (au minimum via flag + masquage UI)
- Dépendance à une **API livres** (Google Books / OpenLibrary ou autre) + gestion des limites

## 11) Risques & questions ouvertes

- Stratégie anti-spam / modération minimale : quelles règles V1 suffisent ?
- “Popularité” : comment éviter que ce soit trop biaisé / manipulable en V1 ?
- Qualité des résultats FR Google Books (couverture, doublons, métadonnées manquantes)

## 12) Décisions à prendre (prochaines)

- Définir la source de vérité des livres (API only vs cache DB)
- Définir la règle de calcul “Tendance” (fenêtre 7j/30j, pondération Lu vs À lire)
- Définir le niveau minimal de modération spoilers/commentaires pour lancement

## 13) Arbitrages V1 validés

- **API livres :** Google Books API
- **Fallback :** ajout manuel d’un livre si introuvable
- **Reviews :** 1 review maximum par couple (utilisateur, livre), éditable
- **Reviews par chapitre :** hors V1 (prévu en V1.5+)
- **Réactions :** Like + À lire

## 14) Priorisation V1 (Must / Should / Could)

### Must (lancement V1)
- Auth + profil utilisateur basique
- Recherche Google Books + fiche livre
- Ajout bibliothèque (statuts de lecture)
- Ajout manuel livre (fallback API)
- Review de livre (note + texte + spoiler)
- Feed amis + follow
- Réactions (Like, À lire) + commentaires
- Liste “Tendance” simple

### Should (si temps restant)
- Édition améliorée des reviews (versionnage léger ou historique simplifié)
- Filtres de recherche enrichis (genre, année, popularité)
- Outils basiques anti-spam (limite de fréquence, signalement minimal)

### Could (post-V1)
- Reviews par chapitre
- Clubs de lecture
- Recommandations personnalisées avancées

