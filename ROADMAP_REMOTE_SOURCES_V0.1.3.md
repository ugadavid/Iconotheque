# Iconotheque — Cadrage sources web et Midjourney

> **Document de cadrage historique.** Cette roadmap conserve les intentions et décisions de départ ; elle ne décrit pas à elle seule la version courante. Consulter le [README](README.md) pour l’état fonctionnel actuel.

## État constaté après les développements 0.1.3

| État | Éléments |
|---|---|
| Réalisé | catalogue commun `images.id`, séparation local/distant, ajout d’URL Web HTTPS, rendu contrôlé `iconotheque-image://`, imports Midjourney simple et par lot, vues Midjourney images/jobs, collections virtuelles locales et distantes. |
| Partiellement réalisé | validation et rendu des sources distantes limités au périmètre actuel ; représentation des statuts distant/cache/archive dans le modèle, sans cache ni archivage ; companion Chrome séparé avec export manuel. |
| Restant | cache ou archivage local, exports riches, recherche/filtres distants approfondis, import direct depuis le companion, recette fonctionnelle consolidée et audit réseau approfondi. |

_Date de création : 7 juillet 2026_  
_Statut : document de cadrage — réflexion produit / technique_  
_Version cible de travail envisagée : `0.1.3-dev.x`_  
_Stable précédente : `0.1.2`_

## 1. Intention générale

Ce document cadre une évolution possible d’Iconotheque autour des **images distantes**.

L’idée est de permettre à Iconotheque de référencer, afficher, annoter et organiser des images qui ne sont pas nécessairement présentes dans un dossier local du disque.

Cette évolution doit respecter l’esprit actuel de la v0.1.x :

> Iconotheque reste d’abord une application de métadonnées, de consultation, d’annotation et d’organisation.

Elle ne doit pas ouvrir tout de suite un mode édition destructif ou semi-destructif.

Autrement dit :

- on référence ;
- on affiche ;
- on annote ;
- on classe ;
- on regroupe ;
- on recherche ;
- mais on ne déplace pas, ne renomme pas, ne supprime pas et ne modifie pas les fichiers locaux.

Le cas Midjourney est un cas spécialisé important, parce que les URLs Midjourney suivent une structure exploitable et que beaucoup d’images personnelles existent déjà sous cette forme.

## 2. Problème à résoudre

Iconotheque travaille actuellement principalement à partir d’images locales présentes dans des dossiers du disque.

Or certaines images intéressantes existent d’abord sous forme distante :

- image accessible par URL ;
- image CDN ;
- image générée par Midjourney ;
- image temporairement consultable en ligne ;
- image que l’utilisateur ne souhaite pas encore télécharger ;
- image que l’utilisateur souhaite simplement référencer, commenter ou classer.

Aujourd’hui, pour intégrer ces images à Iconotheque, il faut d’abord les télécharger manuellement, les ranger dans un dossier local, puis scanner ce dossier.

L’objectif de cette évolution est donc de permettre un usage plus souple :

> Coller une URL ou un identifiant de source, créer une fiche dans Iconotheque, afficher l’image distante, et permettre l’annotation comme pour une image locale.

## 3. Principe produit

Le principe produit peut se résumer ainsi :

> Iconotheque peut gérer des images locales et des images distantes, mais elle indique toujours clairement leur statut.

Une image distante n’est pas une image archivée.

Elle reste dépendante :

- de l’URL ;
- du serveur distant ;
- de la connexion Internet ;
- de la politique de conservation de la source externe.

Il faut donc distinguer :

1. **référence distante** ;
2. **cache local** ;
3. **archive locale**.

Ces trois statuts doivent être clairs pour l’utilisateur.

## 4. Trois statuts de source

### 4.1. Source distante

Iconotheque stocke uniquement les informations nécessaires pour retrouver l’image :

- URL ;
- fournisseur éventuel ;
- identifiant de source ;
- index éventuel ;
- métadonnées utilisateur ;
- tags ;
- notes ;
- statut.

L’image est affichée depuis sa source distante.

Avantages :

- très léger ;
- rapide à créer ;
- pas de duplication ;
- pratique pour explorer ou trier beaucoup d’images ;
- cohérent avec une logique méta.

Limites :

- nécessite Internet ;
- dépend du serveur distant ;
- rien ne garantit la disponibilité dans le temps ;
- pas adapté à une archive durable.

### 4.2. Cache local

Iconotheque conserve une copie locale technique ou régénérable pour améliorer l’affichage.

Ce cache peut être supprimé et reconstruit.

Avantages :

- affichage plus rapide ;
- meilleure expérience utilisateur ;
- peut fonctionner temporairement si le serveur est lent ou indisponible.

Limites :

- ce n’est pas une conservation garantie ;
- il faut gérer la taille du cache ;
- il faut décider ce qui est régénérable ;
- il faut éviter toute confusion avec une vraie archive.

### 4.3. Archive locale

L’utilisateur choisit explicitement de télécharger et conserver l’image localement.

Dans ce cas, Iconotheque crée ou référence une vraie copie locale.

Avantages :

- conservation ;
- usage hors ligne ;
- indépendance vis-à-vis de la source distante ;
- export plus fiable ;
- possibilité de sauvegarde utilisateur.

Limites :

- prend de l’espace disque ;
- nécessite une action explicite ;
- introduit une logique d’import ;
- peut être rapproché plus tard du futur mode édition, donc à cadrer prudemment.

## 5. Message de confiance à afficher

Il faut éviter toute ambiguïté.

Message générique possible :

> Cette image est affichée depuis une source distante. Tant qu’elle n’est pas archivée localement, Iconotheque ne peut pas garantir sa disponibilité dans le temps.

Message spécifique Midjourney possible :

> Ces images Midjourney sont affichées depuis le CDN Midjourney. Iconotheque peut les référencer, mais ne garantit pas leur disponibilité future. Pour les conserver durablement, utilisez une future fonction d’archivage local.

Ce message doit être sobre, non anxiogène, mais clair.

## 6. Distinction entre sources locales et sources web

Iconotheque pourrait évoluer vers une bibliothèque composée de deux grands types de sources :

```txt
Bibliothèque
├── Dossiers locaux
└── Web
```

### 6.1. Dossiers locaux

Ce sont les dossiers actuellement utilisés par Iconotheque :

- dossiers du disque ;
- images locales ;
- scan ;
- métadonnées locales associées ;
- non-modification des originaux.

### 6.2. Web

Ce serait une nouvelle racine virtuelle.

Elle ne représente pas un dossier physique du disque, mais un espace logique dans Iconotheque.

Exemple possible :

```txt
Bibliothèque
├── Dossiers locaux
└── Web
    ├── Images par URL
    ├── Collections web
    └── Midjourney
```

Ou bien :

```txt
Bibliothèque
├── Local
│   └── Dossiers scannés
└── Distant
    ├── URLs
    ├── Midjourney
    └── Collections
```

Le vocabulaire reste à décider.

## 7. Image distante générique

### 7.1. Cas d’usage

L’utilisateur colle une URL directe vers une image.

Exemples possibles :

```txt
https://example.com/image.png
https://example.com/photo.jpg
https://cdn.example.com/assets/123.webp
```

Iconotheque crée une fiche distante.

### 7.2. Comportement minimal attendu

1. L’utilisateur ouvre une commande du type :
   - `Ajouter une image web`
   - `Ajouter depuis URL`
   - `Nouvelle source distante`

2. Il colle une URL.

3. Iconotheque vérifie minimalement :
   - URL valide ;
   - protocole `https://` ou éventuellement `http://` ;
   - extension ou type compatible si disponible ;
   - absence de doublon évident.

4. Iconotheque crée une fiche.

5. L’image apparaît dans une section web.

6. L’utilisateur peut renseigner les mêmes informations utilisateur que pour une image locale :
   - titre ;
   - description ;
   - notes ;
   - tags ;
   - couleur workflow ;
   - termes ;
   - statut ;
   - collection.

### 7.3. Données minimales à stocker

Pour une image distante générique :

```json
{
  "type": "remote_image",
  "provider": "generic_url",
  "remoteUrl": "https://example.com/image.png",
  "sourceStatus": "remote",
  "title": "",
  "notes": "",
  "tags": [],
  "workflowColor": null,
  "createdAt": "",
  "updatedAt": "",
  "lastCheckedAt": null,
  "lastKnownStatus": null
}
```

### 7.4. Métadonnées utilisateur

Les métadonnées utilisateur doivent être aussi proches que possible de celles d’une image locale.

L’objectif est que l’utilisateur ne se demande pas :

> Est-ce que je peux annoter une image distante comme une image locale ?

La réponse produit doit être :

> Oui, sauf pour les fonctions qui exigent une copie locale.

## 8. Collections web

### 8.1. Objectif

Les collections web permettent de regrouper des images distantes sans les mélanger directement à l’arborescence locale.

Elles peuvent servir à :

- organiser des URLs ;
- préparer des séries ;
- regrouper des références ;
- classer des images Midjourney ;
- construire une collection temporaire ;
- isoler un travail en cours.

### 8.2. Dossier virtuel

Une collection web peut être pensée comme un **dossier virtuel**.

Elle n’existe pas sur le disque sous forme de dossier d’images.

Elle existe dans la base Iconotheque.

### 8.3. Questions à décider

- Une image distante peut-elle appartenir à plusieurs collections web ?
- Une collection web peut-elle contenir à la fois des URLs génériques et des jobs Midjourney ?
- Les collections web partagent-elles les mêmes tags que les images locales ?
- Doit-on afficher les collections web dans l’arborescence gauche ou dans une vue dédiée ?
- Doit-on créer une collection web par défaut du type `Images par URL` ?
- Doit-on créer une collection web spécifique `Midjourney` ?

### 8.4. Hypothèse simple pour la première tranche

Pour une première version de travail :

- créer une racine virtuelle `Web` ;
- créer une collection par défaut `Images par URL` ;
- toutes les images distantes génériques y sont ajoutées ;
- pas encore de multi-collection ;
- pas encore de déplacement entre collections ;
- pas encore d’archive locale.

## 9. Cas spécialisé Midjourney

### 9.1. Données connues

D’après vérification utilisateur :

- le GUID présent dans l’URL CDN Midjourney correspond au `job_id` ;
- chaque job produit quatre images ;
- les images sont accessibles avec les suffixes :
  - `0_0.png` ;
  - `0_1.png` ;
  - `0_2.png` ;
  - `0_3.png`.

Exemple :

```txt
job_id:
32f08e2c-8188-4a08-bd93-89d22369d3ad

images:
https://cdn.midjourney.com/32f08e2c-8188-4a08-bd93-89d22369d3ad/0_0.png
https://cdn.midjourney.com/32f08e2c-8188-4a08-bd93-89d22369d3ad/0_1.png
https://cdn.midjourney.com/32f08e2c-8188-4a08-bd93-89d22369d3ad/0_2.png
https://cdn.midjourney.com/32f08e2c-8188-4a08-bd93-89d22369d3ad/0_3.png
```

### 9.2. Entrées possibles

Iconotheque pourrait accepter :

#### URL Midjourney complète

```txt
https://cdn.midjourney.com/32f08e2c-8188-4a08-bd93-89d22369d3ad/0_1.png
```

L’application extrait :

```txt
job_id = 32f08e2c-8188-4a08-bd93-89d22369d3ad
slot = 0_1
provider = midjourney
```

Puis elle peut reconstituer les quatre images du job.

#### Job ID seul

```txt
32f08e2c-8188-4a08-bd93-89d22369d3ad
```

L’application reconnaît le format UUID et propose :

> Créer un job Midjourney avec les quatre images associées.

#### Liste d’URLs

L’utilisateur colle plusieurs URLs, une par ligne.

Iconotheque :

- détecte les URLs Midjourney ;
- regroupe par job ID ;
- évite les doublons ;
- crée les jobs correspondants.

#### Liste de job IDs

L’utilisateur colle plusieurs UUIDs, un par ligne.

Iconotheque crée un job Midjourney pour chacun.

### 9.3. Objet “job Midjourney”

Un job Midjourney n’est pas exactement une image.

C’est un groupe logique de quatre images.

Il pourrait être modélisé comme :

```json
{
  "type": "midjourney_job",
  "provider": "midjourney",
  "jobId": "32f08e2c-8188-4a08-bd93-89d22369d3ad",
  "sourceStatus": "remote",
  "images": [
    {
      "slot": "0_0",
      "remoteUrl": "https://cdn.midjourney.com/32f08e2c-8188-4a08-bd93-89d22369d3ad/0_0.png"
    },
    {
      "slot": "0_1",
      "remoteUrl": "https://cdn.midjourney.com/32f08e2c-8188-4a08-bd93-89d22369d3ad/0_1.png"
    },
    {
      "slot": "0_2",
      "remoteUrl": "https://cdn.midjourney.com/32f08e2c-8188-4a08-bd93-89d22369d3ad/0_2.png"
    },
    {
      "slot": "0_3",
      "remoteUrl": "https://cdn.midjourney.com/32f08e2c-8188-4a08-bd93-89d22369d3ad/0_3.png"
    }
  ],
  "metadata": {
    "prompt": "",
    "seed": "",
    "model": "",
    "createdAt": "",
    "importedAt": ""
  }
}
```

### 9.4. Métadonnées communes et individuelles

Il faut distinguer deux niveaux.

Métadonnées du job :

- prompt ;
- modèle ;
- paramètres ;
- seed ;
- date de génération si connue ;
- notes générales ;
- tags communs ;
- projet ;
- collection ;
- statut global.

Métadonnées de chaque image :

- titre ;
- note spécifique ;
- statut workflow ;
- sélection favorite ;
- tag spécifique ;
- commentaire ;
- éventuelle décision : garder / rejeter / archiver.

### 9.5. Affichage possible

Dans la racine `Web > Midjourney`, chaque job pourrait apparaître comme une carte ou un groupe.

Exemple :

```txt
Midjourney
└── 32f08e2c-8188-4a08-bd93-89d22369d3ad
    ├── 0_0
    ├── 0_1
    ├── 0_2
    └── 0_3
```

Ou bien dans la grille :

```txt
[Job Midjourney]
+-----------------------------+
| 0_0 | 0_1 |
| 0_2 | 0_3 |
+-----------------------------+
prompt / tags / statut
```

Question ouverte :

> Faut-il afficher un job comme un groupe unique, ou afficher les quatre images comme quatre images individuelles liées par un job parent ?

Hypothèse recommandée :

- pour la première tranche, afficher les quatre images comme des images individuelles ;
- stocker le `job_id` commun ;
- permettre plus tard une vue groupée par job.

Cette approche est plus simple si la grille actuelle attend une liste d’images.

## 10. UX envisagée

### 10.1. Commandes possibles

Menu ou bouton :

```txt
Fichier > Ajouter une image web...
Fichier > Ajouter des images web...
Fichier > Ajouter un job Midjourney...
```

Ou plus simplement au départ :

```txt
Ajouter depuis URL...
```

Puis l’application détecte si c’est une URL Midjourney.

### 10.2. Fenêtre d’ajout générique

Première version simple :

```txt
Ajouter une image web

URL :
[________________________________]

[Ajouter] [Annuler]
```

Version ultérieure :

```txt
Coller une URL ou un identifiant :
[ zone texte ]

Options :
[x] Créer une fiche distante
[ ] Archiver localement maintenant   (désactivé dans la première tranche)
[ ] Regrouper les images Midjourney par job
```

### 10.3. Fenêtre d’ajout par lot

Plus tard :

```txt
Ajouter plusieurs sources web

Collez une URL ou un job ID par ligne :

[ grande zone texte ]

Résultat détecté :
- 12 URLs génériques
- 4 jobs Midjourney
- 2 doublons
- 1 entrée invalide

[Prévisualiser] [Importer]
```

### 10.4. Badges de statut

Les images distantes doivent être clairement identifiées.

Badges possibles :

```txt
Distant
Web
Midjourney
Non archivé
Archivé localement
Cache
```

### 10.5. États d’erreur

À prévoir :

- image inaccessible ;
- URL invalide ;
- format non supporté ;
- serveur distant indisponible ;
- image supprimée ou expirée ;
- erreur réseau ;
- doublon déjà présent.

Messages possibles :

> Image distante indisponible pour le moment.

> Cette URL ne semble pas pointer vers une image compatible.

> Cette image est déjà référencée dans Iconotheque.

## 11. Modèle de données — premières hypothèses

### 11.1. Option A — Ajouter des colonnes à `images`

Si la table `images` représente toute image affichable, on peut l’étendre.

Champs possibles :

- `source_kind` : `local`, `remote`, `midjourney` ;
- `remote_url` ;
- `provider` ;
- `provider_id` ;
- `provider_group_id` ;
- `source_status` : `remote`, `cached`, `archived` ;
- `local_path` ;
- `remote_slot` ;
- `last_checked_at` ;
- `last_known_status`.

Avantage :

- réutilise l’existant ;
- la grille peut afficher local et distant de façon unifiée.

Limite :

- la table `images` risque de mélanger des notions locales et distantes ;
- migration nécessaire ;
- prudence avec les champs obligatoires existants.

### 11.2. Option B — Créer des tables dédiées

Tables possibles :

```txt
remote_sources
remote_images
remote_groups
```

Exemple :

```txt
remote_groups
- id
- provider
- provider_group_id
- title
- notes
- created_at

remote_images
- id
- group_id
- provider
- remote_url
- remote_slot
- source_status
- local_image_id
- created_at
```

Avantage :

- séparation claire ;
- plus propre pour Midjourney ;
- moins de confusion avec les images locales.

Limite :

- demande plus de travail ;
- il faudra adapter l’interface pour agréger local et distant.

### 11.3. Hypothèse recommandée

Ne pas décider trop vite.

Pour une première exploration, il faut demander au développeur d’évaluer :

- la structure actuelle de `images` ;
- les contraintes existantes ;
- ce que la grille attend ;
- la difficulté d’unifier local et distant ;
- la difficulté d’un modèle séparé.

Intuition produit :

> L’utilisateur doit voir local et distant dans une expérience cohérente, mais le stockage peut rester séparé si c’est plus sain.

## 12. Sécurité et validation des URLs

Les images distantes introduisent un nouveau risque.

Il faut prévoir des règles strictes.

### 12.1. Protocoles acceptés

Priorité :

- accepter `https://` ;
- éventuellement accepter `http://` avec avertissement ;
- refuser `file://` ;
- refuser les chemins locaux déguisés ;
- refuser les schémas non prévus.

### 12.2. Types d’images

Formats envisagés :

- PNG ;
- JPG / JPEG ;
- WEBP ;
- GIF éventuellement, mais pas prioritaire.

### 12.3. Téléchargement / affichage

Si l’image est seulement distante, il faut décider comment elle est chargée :

- directement par le renderer ?
- via le main process ?
- via un protocole contrôlé ?
- via une fonction qui valide l’URL avant affichage ?

Question technique importante :

> Faut-il créer un protocole `iconotheque-remote://` ou utiliser une URL distante directement dans le renderer ?

À évaluer par le développeur.

### 12.4. Protection contre les abus

À surveiller :

- URLs énormes ;
- formats non image ;
- redirections ;
- tracking ;
- contenus indisponibles ;
- certificats invalides ;
- liens privés expirables ;
- fuite d’informations via requêtes distantes.

Pour une première version locale/personnelle, rester simple, mais ne pas ignorer ces points.

## 13. Recherche et filtres

Les images distantes doivent pouvoir être retrouvées.

Filtres possibles :

- source locale ;
- source web ;
- fournisseur : Midjourney ;
- statut : distant ;
- statut : archivé ;
- URL invalide ;
- image inaccessible ;
- tag ;
- workflow ;
- collection web.

Recherche possible :

- titre ;
- notes ;
- tags ;
- URL ;
- job ID ;
- prompt si renseigné.

## 14. Exports futurs

### 14.1. Export métadonnées

Même si l’image n’est pas locale, Iconotheque peut exporter ses métadonnées :

- JSON ;
- CSV ;
- HTML ;
- PDF avec liens distants.

### 14.2. Export avec images

Si l’image est distante non archivée, l’export doit être clair :

- soit il inclut uniquement l’URL ;
- soit il tente de télécharger au moment de l’export ;
- soit il exige un archivage local préalable.

Message possible :

> Certaines images de cet export sont distantes. Elles ne seront pas incluses comme fichiers tant qu’elles ne sont pas archivées localement.

## 15. Ce qui n’est pas dans la première tranche

Pour éviter l’effet cathédrale, la première tranche ne doit pas inclure :

- mode édition ;
- déplacement de fichiers ;
- suppression de fichiers ;
- renommage ;
- téléchargement automatique massif ;
- scraping Midjourney ;
- connexion à un compte Midjourney ;
- API Midjourney non officielle ;
- synchronisation ;
- cloud ;
- authentification ;
- archivage local complet ;
- cache persistant complexe ;
- OCR ;
- extraction automatique du prompt ;
- génération d’images ;
- gestion des droits avancée.

## 16. Tranches de développement proposées

### 16.1. Tranche A — Cadrage technique

Version possible : rester en `0.1.2`.

Objectif :

- faire lire ce document au développeur ;
- lui demander un avis technique ;
- identifier le meilleur modèle de données ;
- identifier les impacts UI ;
- identifier les risques.

Livrable développeur possible :

- rapport d’analyse ;
- proposition de modèle ;
- recommandations.

### 16.2. Tranche B — Ouverture de `0.1.3-dev.1`

Objectif :

- créer la branche/version de travail ;
- ne pas encore livrer une stable.

Actions :

- passer `package.json` en `0.1.3-dev.1` ;
- ajouter entrée changelog de travail si souhaité ;
- cadrer le chantier.

### 16.3. Tranche C — Image distante générique minimale

Objectif :

- ajouter une URL distante simple ;
- afficher l’image ;
- créer une fiche ;
- annoter comme une image locale ;
- pas de téléchargement.

Fonctions :

- formulaire URL unique ;
- racine virtuelle `Web` ;
- collection par défaut `Images par URL` ;
- affichage grille ;
- fiche métadonnées ;
- badge `Distant`.

### 16.4. Tranche D — Midjourney minimal

Objectif :

- reconnaître une URL Midjourney ;
- extraire le job ID ;
- reconstruire les quatre URLs ;
- créer quatre images distantes liées par le même job ID.

Fonctions :

- collage URL Midjourney ;
- collage job ID seul ;
- génération des slots `0_0` à `0_3` ;
- badge `Midjourney` ;
- champ `job_id` ;
- filtre `Midjourney`.

### 16.5. Tranche E — Lot Midjourney

Objectif :

- coller plusieurs URLs ou job IDs ;
- regrouper ;
- dédoublonner ;
- créer plusieurs jobs.

Fonctions :

- zone multi-lignes ;
- prévisualisation ;
- rapport d’import ;
- erreurs lisibles.

### 16.6. Tranche F — Cache / archive

Objectif :

- préparer le passage du distant vers local.

À ne faire qu’après stabilisation du modèle.

Fonctions possibles :

- télécharger une image ;
- télécharger les quatre images d’un job ;
- stocker dans un dossier d’archive choisi ;
- conserver le lien source ;
- changer le statut en `archived`.

## 17. Première mission à donner au développeur

Avant de coder, la meilleure mission semble être :

```txt
Lire ce document et produire une analyse technique :
- faisabilité ;
- modèle de données recommandé ;
- impacts UI ;
- impacts sécurité ;
- points à clarifier ;
- première tranche de développement conseillée.
```

Le développeur ne doit pas encore implémenter.

L’objectif est de confronter l’idée produit à l’état réel du code.

## 18. Questions ouvertes

### Produit

- Faut-il appeler la racine virtuelle `Web`, `Distant`, `Sources web`, `Sources distantes` ?
- Faut-il afficher les images distantes avec les images locales ou dans une vue séparée ?
- Une image distante peut-elle appartenir à plusieurs collections ?
- Une collection web doit-elle fonctionner comme un dossier virtuel ?
- Le job Midjourney doit-il apparaître comme un groupe ou comme quatre images individuelles liées ?

### Technique

- Faut-il étendre la table `images` ou créer des tables dédiées ?
- Comment l’interface actuelle reçoit-elle les images ?
- Comment sécuriser l’affichage d’une image distante ?
- Comment gérer les erreurs réseau ?
- Comment éviter les doublons ?
- Comment préserver les performances ?
- Comment préparer une future archive locale ?
- Comment sauvegarder ces nouvelles données ?

### UX

- Où placer la commande d’ajout ?
- Quel badge afficher ?
- Comment expliquer le statut distant ?
- Comment signaler une image indisponible ?
- Comment éviter que l’utilisateur pense que l’image est conservée localement ?

## 19. Recommandation actuelle

La meilleure prochaine étape n’est pas de coder directement.

La meilleure prochaine étape est :

1. faire lire ce document au développeur ;
2. lui demander une analyse technique ;
3. décider du modèle de données ;
4. ouvrir ensuite `0.1.3-dev.1` si la direction est validée ;
5. commencer par l’image distante générique minimale ;
6. ajouter Midjourney ensuite comme cas spécialisé.

## 20. Formule synthétique

> La prochaine évolution d’Iconotheque pourrait introduire des sources web : des images distantes référencées, annotables et classables comme les images locales, mais clairement marquées comme non archivées tant que l’utilisateur ne choisit pas de les télécharger. Midjourney serait un cas spécialisé fondé sur le job ID, capable de reconstituer les quatre images d’un job.
