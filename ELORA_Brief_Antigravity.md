# ELORA --- Brief de référence pour Antigravity

**Version : 1.0 --- 22 novembre 2026**\
**Statut : document de cadrage vivant --- les décisions confirmées sont
à respecter.**

------------------------------------------------------------------------

## 1. Mission

Construire **ELORA**, une intelligence personnelle hybride, à la fois
**en ligne et locale**, destinée à aider chaque utilisateur à
comprendre, organiser, développer et concrétiser ses objectifs.

ELORA ne doit pas être un simple chatbot étudiant, un tableau de bord de
productivité ou une collection de fonctionnalités sans lien. C'est un
environnement d'intelligence personnelle qui apprend progressivement le
contexte de son utilisateur, relie ses connaissances, ses projets, son
organisation, ses progrès et les opportunités pertinentes, puis l'aide à
agir.

**Promesse centrale :** ELORA reste utile avec Internet et, sur les
appareils compatibles après préparation du moteur local, continue à
fournir des capacités d'IA sans connexion.

Le projet est développé pour le hackathon Firebase **#BuildHybridAI**.
La démonstration doit prouver une véritable intégration de l'inférence
locale et cloud, et non simplement afficher un bouton « mode hors ligne
».

## 2. Contexte de développement

-   Poste actuel de développement : **Dell Inspiron 15 7000 sous Ubuntu
    26.04 LTS**.
-   IDE : **Antigravity**.
-   L'utilisateur maîtrise notamment React, JavaScript/TypeScript,
    Node.js, Python et Flutter.
-   Construire et tester sur le Dell actuellement utilisé. Ne pas
    supposer que le développement se fait sur le HP.
-   Priorité au coût minimal : privilégier les outils gratuits et les
    offres gratuites disponibles, vérifier les quotas et conditions
    actuels avant de dépendre d'un service payant.
-   Temps de réalisation très court : avancer par incréments
    fonctionnels, tester tôt, éviter la sur-ingénierie et les longs
    documents supplémentaires.

## 3. Principes non négociables

1.  **Hybridité réelle :** le local et le cloud sont deux voies
    d'inférence intégrées dans un même produit.
2.  **Pas de fausse promesse :** ne jamais prétendre que tous les
    téléphones supportent le même modèle local ni que toutes les
    fonctions sont utilisables hors ligne.
3.  **Expérience unifiée :** l'utilisateur parle à ELORA, pas à deux
    assistants distincts. Le choix du moteur doit être géré par une
    couche d'orchestration.
4.  **Local d'abord quand c'est pertinent et possible :** utiliser
    l'inférence locale pour les capacités compatibles lorsque le modèle
    est prêt ; basculer vers le cloud lorsque la tâche exige une
    fonction non prise en charge localement et qu'Internet est
    disponible.
5.  **Hors ligne réel :** sans réseau, les fonctions locales compatibles
    et les données déjà synchronisées/téléchargées doivent rester
    accessibles. Ne pas promettre recherche Web, synchronisation ou
    services distants sans Internet.
6.  **Consentement et transparence :** ne pas télécharger
    silencieusement plusieurs gigaoctets. Expliquer la compatibilité, la
    taille, l'espace nécessaire, l'usage des données et demander
    l'accord avant un téléchargement volumineux.
7.  **Mobile-first :** la majorité des utilisateurs visés accèdent au
    produit sur téléphone. L'interface doit être excellente sur mobile,
    sans sacrifier le desktop.
8.  **Données personnelles isolées :** aucune mémoire, conversation ou
    donnée d'un utilisateur ne doit être accessible à un autre.
9.  **Actions sous contrôle :** les propositions de planification ou les
    actions ayant des conséquences doivent être confirmées par
    l'utilisateur avant exécution.
10. **Véracité :** pas de fausses opportunités, faux scores de
    progression, fausses citations ou données fictives présentées comme
    réelles.

## 4. Fonctionnement de l'IA hybride

### 4.1 Architecture conceptuelle

Créer une couche indépendante des fournisseurs/modèles, par exemple
`AI Orchestrator`, avec des interfaces distinctes :

-   `CloudAIProvider` : appels aux modèles cloud via Firebase AI Logic.
-   `LocalAIProvider` : appels au modèle embarqué/géré localement par la
    plateforme.
-   `CapabilityDetector` : détection des capacités, compatibilités,
    disponibilité du modèle, état réseau et contraintes.
-   `TaskRouter` : choisit le moteur selon la tâche, la disponibilité et
    la politique de confidentialité.
-   `InferenceMetadata` : enregistre la source réelle de chaque réponse
    (`local` ou `cloud`), sans l'inférer.
-   `OfflineQueue` : conserve les opérations de synchronisation qui
    peuvent être différées, sans simuler l'exécution d'une requête IA
    cloud hors ligne.

L'interface ne doit pas appeler directement un SDK de modèle dans tous
les composants. Toute requête passe par une API applicative stable, afin
de pouvoir remplacer ou ajouter un fournisseur sans réécrire
l'interface.

### 4.2 Modèle local retenu comme cible du hackathon

La cible retenue est **Gemini Nano**, avec Firebase AI Logic et les
intégrations officielles adaptées à chaque plateforme. Ne pas remplacer
arbitrairement ce choix par un modèle tiers avant d'avoir validé les
exigences du challenge et les SDK officiels.

Cependant, ne pas coder comme si Gemini Nano était disponible partout
: - **Web/PWA :** l'inférence locale Prompt API / Gemini Nano via
Firebase AI Logic est dépendante de Chrome et de la compatibilité de
l'environnement ; la prise en charge documentée est principalement
desktop. Ne pas présenter la PWA Android comme compatible localement
sans test et support officiel vérifié. - **Android natif :** étudier
l'intégration Firebase AI Logic Android avec Gemini Nano/AICore sur les
appareils compatibles. Elle est expérimentale et certaines capacités
peuvent être limitées. - **Appareil incompatible ou modèle indisponible
:** utiliser le cloud lorsque le réseau est disponible ; afficher
clairement que le mode local n'est pas disponible sur cet appareil. -
**Hors ligne sur appareil incompatible :** l'application conserve
l'accès aux données mises en cache et aux fonctions non-IA locales ;
elle ne doit pas prétendre pouvoir effectuer une inférence IA si aucun
moteur local n'est présent.

L'objectif est de prouver l'intégration locale sur une plateforme
officiellement compatible et de concevoir l'architecture pour étendre le
support. Tester très tôt la faisabilité sur le matériel réellement
disponible.

### 4.3 Routage des requêtes

Exemples de politique : - Petite reformulation, résumé d'un texte déjà
disponible, explication simple : local si disponible et capable. -
Conversation nécessitant un contexte multi-tours, analyse complexe,
fonctions non supportées localement ou contexte Web : cloud si Internet
et consentement/politique le permettent. - Mode « local uniquement » :
ne jamais envoyer le contenu au cloud ; expliquer si la tâche demandée
n'est pas supportée. - Pas de réseau : exécuter uniquement les tâches
prises en charge par le moteur local ; sinon proposer les possibilités
hors ligne disponibles et indiquer que la requête devra attendre une
connexion.

Ne pas basculer silencieusement une demande explicitement
privée/local-only vers le cloud.

### 4.4 Téléchargement et préparation du moteur local

L'utilisation cloud doit être accessible immédiatement, sans
téléchargement obligatoire du modèle local.

Proposer une préparation locale claire : - au premier lancement,
détecter discrètement les capacités sans télécharger le modèle ; -
expliquer l'intérêt du mode hors ligne ; - proposer « Activer l'IA hors
ligne » avec taille estimée, espace requis, compatibilité, connexion
recommandée et politique de confidentialité ; - télécharger/initialiser
le modèle seulement après accord, ou utiliser le mécanisme géré par la
plateforme si celui-ci demande une autorisation ; - afficher
progression, pause/reprise si possible, erreurs et espace insuffisant
; - permettre de gérer/désactiver le moteur local et de libérer son
stockage lorsque la plateforme l'autorise.

Ne pas exiger le téléchargement pour créer un compte ou utiliser ELORA
en ligne. Ne pas supposer que le modèle est stocké dans le cache PWA :
le modèle peut être géré par Chrome ou par le système.

### 4.5 Ce qui doit rester disponible hors ligne

Après synchronisation ou téléchargement préalable : - ouvrir
l'application et naviguer dans les sections déjà mises en cache ; -
consulter les documents réellement téléchargés et les notes enregistrées
; - consulter les tâches, objectifs, calendrier et données personnelles
synchronisés ; - créer/modifier localement des tâches et notes, avec une
file de synchronisation ; - lancer les fonctions IA locales réellement
prises en charge par l'appareil ; - voir clairement les éléments non
synchronisés.

Les éléments nécessitant Internet (recherche Web, nouvelles
opportunités, synchronisation distante, certaines analyses ou fonctions
cloud) doivent être désactivés ou mis en attente, avec un état
explicite.

## 5. Structure produit : six pages principales

Ne pas ajouter de pages principales supplémentaires sans validation. Les
six pages sont :

### 5.1 Home

Briefing personnel du jour : - une à trois priorités ; - objectifs
actifs ; - échéances et événements à venir ; - une opportunité
pertinente lorsqu'il en existe une vérifiée ; - raccourcis vers les
actions utiles.

Éviter un tableau de bord surchargé de statistiques, les blocs vides et
les chiffres décoratifs. Le contenu doit s'adapter à l'activité réelle
de la personne.

### 5.2 AI

Espace central de conversation avec ELORA : - nouvelle conversation et
historique ; - contexte personnel pertinent ; - pièces jointes : PDF,
documents, images et fichiers pris en charge ; - saisie vocale et
traitement audio correctement typés ; - réponses riches et lisibles :
titres, sections, explications, tableaux, graphiques, schémas,
extraits/citations de documents, cartes de révision, quiz, exercices et
code formaté lorsque pertinent ; - images uniquement lorsqu'elles
apportent une réelle valeur, sans décoration excessive ; - affichage
discret et fiable de la source d'inférence : locale ou cloud ; - gestion
des erreurs, du streaming et des états de chargement.

L'expérience de conversation doit être intuitive, fluide et
particulièrement soignée sur téléphone. Le compositeur reste accessible,
les pièces jointes et le micro sont faciles à utiliser. Ne jamais
traiter un enregistrement audio comme une image ou une vidéo.

### 5.3 Knowledge

Bibliothèque personnelle : - PDF, cours, notes, images, fichiers et
ressources ; - collections, recherche et fichiers récents ; - ouverture,
résumé, explication, analyse et extraction ; - questions sur plusieurs
documents ; - citations de source et de page lorsque disponibles ; -
création de quiz/fiches à partir des documents ; - liens entre les
connaissances, le Planner, Focus et Progress.

Ne pas prétendre qu'un document est accessible hors ligne s'il n'a pas
été téléchargé ou mis en cache de manière fiable.

### 5.4 Planner

Organisation personnelle : - vues jour, semaine et mois ; - tâches,
objectifs, horaires, échéances et événements ; - création, modification,
achèvement et suppression ; - suggestions d'organisation basées sur les
objectifs, le temps disponible, les échéances et la progression ; -
rappels et notifications ; - propositions de modification par l'IA
appliquées après validation de l'utilisateur.

**Focus** est intégré au Planner et à AI, pas une septième page
principale : session guidée avec objectif, durée, assistance, bilan et
enregistrement du travail effectué.

### 5.5 Opportunities

Découverte d'opportunités : - stages, bourses, hackathons, concours,
formations, événements et programmes ; - sections « Pour vous »,
Explorer, Enregistrées et Échéances ; - filtres pertinents : catégorie,
pays, domaine et date limite ; - explication de la pertinence, des
conditions d'éligibilité, des compétences manquantes et de la
préparation ; - liens vers les sources officielles ; - aide à la
préparation de CV et de dossiers ; - ajout des échéances au Planner.

Ne jamais inventer une opportunité, une date, un montant, une condition
ou une source. Signaler les informations non vérifiées.

### 5.6 Progress

Suivi concret : - objectifs et étapes atteints ; - tâches terminées et
sessions Focus ; - apprentissages démontrés, quiz et compétences
travaillées ; - projets et réalisations ; - forces, lacunes et
prochaines étapes.

Pas de faux scores, de badges artificiels ou de compliments
automatiques. Les indicateurs doivent provenir d'activités réelles.

## 6. Mémoire personnelle

ELORA apprend progressivement à connaître l'utilisateur à partir de ses
conversations, documents, objectifs, projets, préférences, intérêts,
habitudes et décisions.

Exigences : - mémoire propre à chaque compte ; - stockage structuré et
récupération contextuelle pertinente ; - ne pas injecter tout
l'historique dans chaque requête ; - possibilité de consulter, corriger
et supprimer les éléments mémorisés ; - expliquer d'où vient une
information mémorisée lorsque c'est possible ; - contrôle utilisateur
sur la mémoire et sur les données envoyées au cloud ; - prévoir un
fonctionnement local avec les éléments déjà synchronisés et disponibles
sur l'appareil.

Ne pas imposer un long questionnaire de profil. L'utilisateur se
présente progressivement.

## 7. Authentification, données et backend

Prévoir : - création de compte par e-mail et mot de passe avec
confirmation ; - connexion ; - connexion Google ; - réinitialisation du
mot de passe ; - profil utilisateur ; - séparation stricte des données
par UID ; - règles de sécurité Firestore et Storage ; - validation côté
serveur pour toute opération sensible ; - gestion des erreurs
d'authentification et des états de session.

Firebase envisagé : - Firebase Authentication ; - Cloud Firestore ; -
Firebase Storage pour les fichiers, selon les besoins ; - Firebase AI
Logic pour les modèles cloud et les intégrations hybrides prises en
charge.

Ne jamais mettre de secret serveur dans le code client. Configurer les
règles de sécurité avant d'ajouter des données réelles.

## 8. Notifications et paramètres

Notifications contextualisées et utiles : - échéances ; - rappels ; -
opportunités pertinentes ; - changements de planning ; - suivi des
objectifs.

Paramètres : - profil et sécurité ; - mémoire personnelle ; -
préférences de notification ; - choix de thème et langue ; - préférences
IA : local/cloud, confidentialité et disponibilité du moteur ; - gestion
du stockage local et des contenus hors ligne.

Ne pas spammer l'utilisateur. Les notifications doivent être
contrôlables.

## 9. Design et expérience

Direction visuelle : - premium, professionnelle, élégante et originale
; - simplicité d'utilisation proche des meilleurs assistants
conversationnels, sans copier leur identité visuelle ; - priorité
absolue à la qualité mobile ; - thème clair en **ivoire/beige chaud**,
plutôt que blanc pur agressif ; - thème sombre en **noir profond**, avec
contrastes confortables ; - choix clair/sombre/système dans les
paramètres ; - composants cohérents, typographie soignée, hiérarchie
nette, espaces maîtrisés et animations utiles ; - réponses IA riches,
colorées avec retenue et bien structurées ; - graphiques et schémas
uniquement quand ils clarifient le contenu ; - éviter l'esthétique
générique de dashboard, les gradients décoratifs omniprésents, les
cartes excessives et les images inutiles.

Le rendu mobile doit être conçu réellement pour petits écrans :
navigation adaptée, tailles tactiles correctes, compositeur de chat
accessible, aucune barre horizontale indésirable, aucun contenu coupé.

## 10. PWA et installation

Le produit principal est un site web responsive installable depuis le
navigateur : - manifest PWA ; - icônes et nom d'application ; - service
worker ; - mise en cache prudente de l'interface et des ressources ; -
stratégie de stockage et de synchronisation ; - états hors
ligne/connexion/synchronisation ; - ouverture en mode autonome après
installation lorsque le navigateur le permet.

Ce n'est pas un APK Android à ce stade. Une intégration Android native
peut être développée en complément pour les capacités Gemini Nano/AICore
non accessibles depuis la PWA.

Ne jamais confondre installation de la PWA et installation du modèle IA
local.

## 11. Architecture technique attendue

Proposer une architecture simple, modulaire, testable et adaptée au
délai. Stack de départ recommandée : - React + TypeScript + Vite ; - PWA
; - Firebase Authentication ; - Firestore ; - Firebase AI Logic ; -
Firebase Storage si nécessaire.

L'agent Antigravity doit d'abord inspecter l'environnement et le dépôt,
vérifier les versions et la compatibilité des SDK, puis présenter un
plan d'exécution court. Ne pas installer des dépendances obsolètes ni
inventer des APIs.

Organisation indicative (à adapter, ne pas créer une complexité inutile)
: - `src/app` : routes, layout et providers ; - `src/features/home` ; -
`src/features/ai` ; - `src/features/knowledge` ; -
`src/features/planner` ; - `src/features/opportunities` ; -
`src/features/progress` ; - `src/features/settings` ; -
`src/lib/firebase` ; - `src/lib/ai` : orchestrateur, providers, routage
et métadonnées ; - `src/lib/offline` : cache, stockage local et
synchronisation ; - `src/components` : composants partagés ; - `docs` :
décisions, tests et notes techniques.

Cette structure est indicative : privilégier la lisibilité et éviter les
abstractions prématurées.

## 12. Plan d'exécution prioritaire

### Phase 0 --- Vérification technique immédiate

1.  Inspecter le Dell, Ubuntu, Node.js, npm/pnpm et Git.
2.  Créer le dépôt et le squelette React/TypeScript/Vite.
3.  Vérifier la documentation Firebase AI Logic Web et Android
    actuellement publiée.
4.  Identifier précisément les plateformes, navigateurs, versions,
    appareils et fonctions compatibles avec Gemini Nano.
5.  Construire une preuve de concept minimale : une requête locale
    identifiable, une requête cloud identifiable, détection de source
    réelle, gestion du modèle indisponible et comportement hors ligne.
6.  Ne pas prétendre que le test est réussi avant de l'avoir exécuté sur
    un appareil compatible.

### Phase 1 --- Fondations produit

-   design system et responsive mobile ;
-   navigation des six pages ;
-   authentification ;
-   structure Firestore et règles ;
-   modèle de données utilisateur.

### Phase 2 --- IA et mémoire

-   orchestrateur hybride ;
-   historique des conversations ;
-   métadonnées local/cloud ;
-   mémoire personnelle contrôlable ;
-   gestion des pièces jointes et des réponses riches ;
-   limites de capacités et fallback explicites.

### Phase 3 --- Fonctionnalités principales

-   Knowledge ;
-   Planner et Focus ;
-   Opportunities ;
-   Progress ;
-   briefing Home ;
-   notifications.

### Phase 4 --- Hors ligne, PWA et qualité

-   contenus synchronisés/téléchargés ;
-   cache et stockage ;
-   file de synchronisation ;
-   tests réseau coupé/rétabli ;
-   tests sur téléphone et desktop ;
-   accessibilité, performances, sécurité et démonstration.

**Important :** ne pas développer toutes les pages avant d'avoir validé
la faisabilité de l'intégration locale. La preuve technique hybride est
le premier jalon critique du hackathon.

## 13. Tests d'acceptation obligatoires

1.  Une requête traitée localement indique réellement
    `local`/`ON_DEVICE` selon les métadonnées du SDK.
2.  Une requête cloud indique réellement `cloud`/`IN_CLOUD`.
3.  Si le modèle local est absent, ELORA ne simule pas une réponse
    locale.
4.  Si le réseau est coupé et le modèle local prêt, une requête locale
    compatible fonctionne.
5.  Si le réseau est coupé et qu'aucun moteur local n'est disponible,
    l'application explique clairement la limite et conserve les
    fonctions hors ligne non-IA.
6.  Une tâche non supportée localement utilise le cloud uniquement si le
    réseau est disponible et si la politique de confidentialité le
    permet.
7.  Le mode local uniquement ne transmet aucune donnée au cloud.
8.  Les données de deux comptes différents restent strictement isolées.
9.  Les tâches et notes créées hors ligne sont synchronisées
    correctement au retour du réseau, sans doublons.
10. L'interface reste utilisable sur petit écran et en mode installé.
11. Les fichiers audio sont identifiés et traités comme audio, pas comme
    images/vidéos.
12. Toute fonctionnalité présentée dans la démo est réellement
    implémentée et vérifiée.

## 14. Consignes à Antigravity

-   Lire entièrement ce document avant toute modification.
-   Ne pas réinterpréter les décisions confirmées ni ajouter de pages
    principales.
-   Ne pas commencer par générer une interface complète factice.
-   Commencer par l'inspection de l'environnement et la preuve de
    concept IA hybride.
-   Expliquer brièvement les choix techniques et les limites avant les
    commandes importantes.
-   Exécuter les tests et rapporter les résultats réels.
-   Ne jamais masquer un échec derrière des données fictives ou un
    fallback cloud présenté comme local.
-   Avancer par petites étapes validées, en conservant un projet
    exécutable à chaque étape.
-   Maintenir ce document et un journal `docs/DECISIONS.md` à jour
    lorsque de nouvelles décisions sont prises.
-   Ne pas écraser ou supprimer des fichiers existants sans les
    inspecter.
-   Si une exigence officielle du hackathon contredit une hypothèse de
    ce document, citer la documentation officielle, expliquer le conflit
    et demander validation avant de changer la direction.

## 15. Définition du premier résultat attendu

Le premier résultat n'est pas encore le produit complet. C'est un dépôt
ELORA propre, exécutable sur le Dell, avec une preuve technique
démontrant : - détection de la compatibilité locale ; - intégration
Firebase AI Logic ; - une voie d'inférence locale Gemini Nano sur un
environnement officiellement compatible ; - une voie cloud ; - source
d'inférence vérifiable ; - comportement honnête en cas d'absence de
modèle ou de réseau.

Une fois ce jalon validé, poursuivre immédiatement vers les fondations
de l'application et son interface mobile-first.


## 16. Exigences officielles du hackathon à respecter

Vérifier les règles officielles à nouveau avant la soumission. À la date de ce document, la page officielle #BuildHybridAI indique :

- L'application doit utiliser Firebase AI Logic.
- Au moins une plateforme doit être prise en charge :
  - Web (Chrome) avec Gemini Nano 4 ;
  - Android avec Gemini Nano 4 ;
  - iOS avec Apple Foundation Models API via Firebase AI Logic.
- Une solution multiplateforme est encouragée et peut être favorisée, mais une excellente solution sur une seule plateforme peut être compétitive.
- Firebase App Check est requis pour Firebase AI Logic ; les debug tokens sont acceptés pour la soumission.
- Auth, Firestore et Remote Config sont des produits Firebase complémentaires encouragés.
- Le dépôt du projet doit être public et inclure une licence open source.
- La soumission doit inclure une vidéo de démonstration publique sur YouTube, de trois minutes maximum, en anglais ou avec sous-titres anglais.
- Les instructions de test et les éléments de soumission doivent être en anglais, ou accompagnés d'une traduction anglaise selon les règles.
- Le projet doit être installable/exécutable de façon cohérente sur la plateforme annoncée et être accessible gratuitement aux juges.
- Ne jamais publier de clés secrètes, identifiants de production ou données personnelles dans le dépôt.

Page officielle des règles et de la soumission : https://firebasehybridaihackathon.devpost.com/rules

Page officielle Firebase AI Logic Hybrid : https://firebase.google.com/docs/ai-logic/hybrid

Documentation Web : https://firebase.google.com/docs/ai-logic/hybrid/web/get-started

Documentation Android : https://firebase.google.com/docs/ai-logic/hybrid/android/get-started

## 17. Priorité de plateforme et décision de lancement

Le produit reste une PWA mobile-first, mais il faut distinguer l'expérience produit de la plateforme qui prouve l'inférence locale pour le hackathon.

Décision d'exécution :
1. Construire la PWA responsive comme expérience principale.
2. Valider rapidement l'inférence locale Web/Chrome sur un ordinateur compatible : c'est la preuve la plus directe sans imposer une application native complète.
3. Étudier en parallèle la voie Android native, car la cible utilisateur est mobile et le hackathon l'accepte officiellement.
4. Ne promettre aucune inférence locale sur PWA Android tant que la documentation officielle et les tests ne la valident pas.
5. Si le temps ne permet qu'une seule plateforme, livrer une plateforme réellement fonctionnelle et démontrable plutôt que trois intégrations incomplètes.
6. Conserver une architecture permettant d'ajouter Android et iOS ensuite sans réécrire le produit.

## 18. Calendrier critique

- Date limite officielle affichée : **30 novembre 2026 à 14:00 Pacific Time**. Vérifier le fuseau et l'heure sur Devpost avant l'envoi final.
- Le dernier sprint de demande de quota Google est annoncé pour le **25 novembre 2026 à 10:00 PT**, avec distribution annoncée le 27 novembre. La délivrance n'est pas garantie. Ne pas bloquer le développement sur cette demande ; vérifier si le compte actuel dispose déjà des quotas nécessaires.
- Objectif de travail : avoir une démonstration stable et les éléments de soumission préparés avant les derniers jours.

