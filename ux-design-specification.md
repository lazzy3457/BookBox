---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - c:/Users/maeld/GIT/app/_bmad-output/planning-artifacts/prd-booksbox-v1.md
---

# Spécification UX BooksBox

**Auteur :** Maeld
**Date:** 2026-04-03

---

## Résumé d'initialisation

- Workflow UX initialisé.
- Document principal chargé : `prd-booksbox-v1.md`.
- Aucun product brief additionnel ni fichier `project-context.md` trouvé.

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Résumé exécutif

### Vision produit

BooksBox est une plateforme web mobile-first pour lecteurs francophones, inspirée de l'énergie sociale de Letterboxd appliquée aux livres. La V1 doit offrir une expérience rapide, moderne et sociale, centrée sur un rituel simple : rechercher un livre, le marquer comme lu, puis publier une note et une mini-review en quelques instants.

### Utilisateurs cibles

La cible principale est constituée de gros lecteurs francophones, actifs et engagés, qui aiment partager leurs avis et suivre l'activité de leur réseau. Une cible secondaire regroupe les lecteurs plus occasionnels, motivés par la découverte sociale et les tendances communautaires.

### Défis clés de design

1. Réduire la friction mobile dans la boucle principale (recherche -> lu -> review) pour créer de la valeur en moins de 2 minutes.
2. Éviter l'effet "feed vide" au démarrage en proposant une expérience sociale crédible dès les premières sessions.
3. Maintenir une expérience fiable malgré la variabilité des données API (champs manquants, doublons), avec un fallback manuel clair.
4. Conserver la simplicité V1 tout en préparant l'extension future vers les reviews par chapitre.

### Opportunités de design

1. Installer une habitude "post-lecture" grâce à une publication ultra rapide (review courte d'abord, enrichissement ensuite).
2. Se différencier des outils perçus comme vieillissants avec une interface mobile web moderne, lisible et agréable.
3. Utiliser la preuve sociale (amis, tendances, réactions, commentaires) pour renforcer la rétention et la découverte.
4. Transformer les limites API en avantage UX via un ajout manuel fluide et rassurant.

### Décisions affinées (atelier collaboratif)

- Priorité écran d'accueil mobile V1 : **"J'ai fini un livre"** comme CTA principal.
- Le flux critique V1 est : **recherche -> marquer lu -> note -> publication**.
- La **mini-review est optionnelle** en V1 pour réduire la friction.
- Après publication, proposer un nudge non bloquant : **"ajouter un texte maintenant"** ou **"plus tard"**.
- Le fallback API doit être immédiat : **ajout manuel** sans sortie du parcours.

## Expérience utilisateur coeur

### Définition de l'expérience

L'expérience centrale de BooksBox repose sur une action rapide et répétée : **ajouter un livre puis publier une note/review**.
C'est l'interaction la plus fréquente et la plus critique du produit : si ce parcours est fluide, l'adoption et la rétention suivent naturellement.

### Stratégie plateforme

BooksBox V1 est conçu en **web mobile-first**.
Les interactions prioritaires sont pensées pour le pouce, en sessions courtes (soir, temps libre, après lecture).

- Plateforme principale : web mobile
- Interaction dominante : tactile
- Contrainte clé : parcours courts, lisibles et robustes
- Offline V1 : **oui**, pour les actions essentielles

### Interactions sans effort

Les interactions qui doivent être quasi instantanées :

- Rechercher un livre
- Ajouter un livre à sa bibliothèque
- Noter un livre rapidement
- Publier une review courte (review optionnelle, note seule possible)

Le système doit minimiser les frictions :

- CTA principal visible : **"J'ai fini un livre"**
- Fallback immédiat vers ajout manuel si la recherche API échoue
- Nudge post-publication non bloquant pour enrichir plus tard

### Moments critiques de succès

Les moments décisifs de réussite UX :

1. **Ajout du livre réussi** (moment make-or-break principal)
2. Publication de la note/review sans friction
3. Découverte immédiate de l'activité sociale (feed, réactions, commentaires)

Le moment "wow" attendu arrive quand l'utilisateur perçoit que l'app est **vivante socialement** dès les premières minutes.

### Principes d'expérience

1. **Publier doit être plus rapide que réfléchir** : capturer une lecture en quelques secondes.
2. **Le social doit être visible tôt** : montrer de la preuve sociale dès l'onboarding/accueil.
3. **Aucune impasse dans le parcours** : si l'API échoue, l'ajout manuel prend le relais.
4. **Mobile d'abord, complexité ensuite** : V1 simple et fluide avant d'ajouter des couches avancées.

## Réponse émotionnelle souhaitée

### Objectifs émotionnels principaux

L'utilisateur doit surtout ressentir une **appartenance à une communauté** : il n'est pas seul avec ses lectures, il partage, réagit et se reconnaît dans un cercle de lecteurs.

### Parcours émotionnel

- **Découverte / première ouverture** : curiosité et envie d'explorer, avec vite un sentiment que « il y a du monde / de l'activité ».
- **Pendant l'action centrale** (recherche, ajout, note/review) : **liberté** et **détente** — pas de pression, pas de formulaire lourd.
- **Juste après avoir publié** : **joie** et petite fierté (« c'est enregistré, c'est partagé »).
- **Retour sur l'app** : retrouver le plaisir et le confort d'un rituel du soir ou après une lecture.
- **En cas d'échec** (ex. livre introuvable via l'API) : **pas de frustration** — message rassurant et chemin clair vers l'ajout manuel, sans culpabiliser l'utilisateur.

### Micro-émotions clés

À favoriser : **appartenance**, **confiance**, **accomplissement léger**, **plaisir**.

À éviter : **confusion**, **énervement**, **frustration** (notamment sur la recherche, l'ajout de livre et la publication).

### Implications design

- **Communauté** : montrer tôt le social (feed, activité, tendances) pour éviter le sentiment d'isolement.
- **Heureux / détendu** : CTA clair, peu d'étapes, review optionnelle, micro-copy bienveillant.
- **Zéro frustration en échec API** : expliquer en une phrase, proposer « Ajouter le livre à la main » comme suite naturelle du même flux.
- **Après publication** : écran ou message de succès court et chaleureux, pas technique.

### Principes de design émotionnel

1. **Communauté avant tout** : chaque écran important doit rappeler qu'on lit *avec* d'autres.
2. **Légèreté** : privilégier le plaisir et la détente plutôt que l'efficacité froide.
3. **Jamais bloqué** : un échec technique ne doit jamais se traduire par de la colère ou l'abandon.
4. **Célébrer le petit geste** : noter ou poster une mini-review doit donner un mini-moment de joie.

## Analyse des patterns UX et inspiration

### Analyse des produits inspirants

**Letterboxd**

- Résout élégamment le besoin : « suivre ce que je regarde, noter, partager, découvrir via les autres ».
- Onboarding et navigation orientés **profil + activité** : on comprend vite où on est et quoi faire ensuite.
- **Cartes et listes** créent une hiérarchie visuelle claire (couverture, titre, note, contexte social).
- Le **daily / activité** renforce l'habitude et la preuve sociale sans surcharger.
- Erreurs / cas limites souvent gérés par des états simples (vide, chargement) et des parcours courts.

**TV Time**

- Même famille « tracking + communauté » : **efficacité** et **simplicité** pour marquer un épisode ou une série.
- Le social reste **lisible** et actionnable (statuts, réactions) sans exiger trop de configuration au départ.

### Patterns UX transférables

**Navigation et structure**

- **Accueil orienté action** (équivalent du rituel « j'ai fini ») + accès rapide au **feed / activité**.
- **Profil** comme vitrine des lectures et des avis (grille ou listes de cartes livre).
- **Onglets ou sections** type : Accueil, Découverte / Tendance, Profil, Recherche (selon priorité V1).

**Interaction**

- **Cartes livre** (couverture, titre, auteur, note utilisateur, badge statut) partout où on liste des livres.
- **Listes** (à lire, lus, en cours) avec le même langage visuel que Letterboxd (cohérence, scan rapide).
- **Fil d'activité** structuré par type d'événement (review publiée, livre terminé, réaction) avec entrées courtes et CTA secondaires (voir livre, commenter).

**Visuel / émotion**

- Mise en page **aérée**, typographie lisible, contrastes adaptés au **soir** et à la **détente**.
- Moments de **preuve sociale** visibles tôt (aperçu du feed, tendances, « activité récente »).

### Anti-patterns à éviter

- **Feed illisible** : trop d'infos par ligne, pas de hiérarchie, texte trop long sans repli.
- Mélanger **plusieurs actions principales** sur le même écran sans priorité claire.
- **Formulaires lourds** avant la première valeur (contraire à la boucle d'activation).
- États d'erreur **culpabilisants** ou vagues quand l'API livre échoue (risque de frustration).

### Stratégie d'inspiration design

**À adopter**

- Système de **cartes + listes** façon Letterboxd pour livres, bibliothèque et découverte.
- Un **daily / activité** comme fil conducteur de retour (même si la V1 reste plus simple qu'un produit mature).
- **Efficacité** type TV Time sur le geste « marquer + noter » en peu d'étapes.

**À adapter**

- Letterboxd est centré **film** ; BooksBox doit **mettre le livre et la review** au centre des cartes, avec spoilers et commentaires adaptés au texte long (repli, aperçu).
- Le « daily » V1 peut être un **résumé court** (3–5 items) plutôt qu'un journal complet.

**À éviter**

- Feed dense et illisible.
- Complexifier la navigation avant d'avoir validé la boucle **recherche → lu → note/review**.

## Fondation design system

### 1.1 Choix du design system

**Approche : système thémable (équilibre vitesse / identité)**

- **Framework UI de base :** **Nuxt UI** (Nuxt 3 + Tailwind CSS), pour des composants solides, une doc claire et une personnalisation via thème / tokens.
- **Styles :** **Tailwind CSS** comme couche utilitaire et pour affiner la direction visuelle (cartes, listes, densité du feed).
- **Thème V1 :** **mode sombre par défaut** (usage le soir, ambiance lecture). Le mode clair pourra être ajouté plus tard.

> **Note :** *shadcn/ui* cible surtout React. Avec Nuxt (Vue), Nuxt UI est l’option la plus alignée pour le même type d’équilibre ; *shadcn-vue* reste possible si tu préfères ce modèle plus tard.

### Rationale du choix

- **Équilibre** : moins coûteux qu’un design system 100 % custom, plus flexible qu’un Material « figé » pour une identité type Letterboxd.
- **Alignement stack** : cohérent avec **Nuxt** et une V1 **web mobile-first**.
- **Cohérence produit** : composants réutilisables pour cartes livre, listes, modales, champs de recherche, états vides et erreurs API.
- **Accessibilité** : partir d’une base maintenue réduit le risque de bases UI fragiles en V1.

### Approche de mise en œuvre

1. Initialiser **Tailwind** + **Nuxt UI** selon la doc officielle Nuxt 3.
2. Définir des **tokens** (couleurs sombres, rayons, ombres, espacements) pour cartes et listes inspirées Letterboxd / TV Time.
3. Composer les écrans V1 à partir des primitives : **Button, Input, Card, Modal/Sheet, Tabs, Avatar, Badge**, listes virtualisées si besoin plus tard.
4. Prévoir dès le début les **états** : chargement, vide, erreur API, offline (message non bloquant + file d’actions en attente si applicable).

### Stratégie de personnalisation

- **Identité BooksBox** : palette sombre chaude ou neutre « cinéma / livre », typographie lisible à distance, **cartes livre** en héros (couverture + métadonnées + note).
- **Feed lisible** : hiérarchie typographique stricte, **aperçu de review** tronqué + « lire la suite », espacement généreux.
- **Composants métier** : encapsuler `BookCard`, `ActivityRow`, `ReviewComposer`, `RatingControl` pour ne pas disperser les styles.
- **Évolution** : ajout du thème clair et raffinement visuel sans refonte si les tokens sont centralisés.

---

*Workflow UX interrompu volontairement après l’étape 6. L’étape suivante du module (`step-07-defining-experience`) peut être reprise plus tard pour détailler l’interaction cœur écran par écran ; ce n’est pas bloquant pour commencer l’implémentation Nuxt avec cette spec.*
