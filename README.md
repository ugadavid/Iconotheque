# Iconothèque

Application desktop personnelle de gestion, exploration, indexation et augmentation d’une photothèque locale.

Nom de code provisoire : **Iconothèque**.

## 1. Vision générale

Iconothèque est une application desktop locale destinée à organiser, explorer, documenter et retrouver facilement une grande collection personnelle d’images.

Le projet répond à un besoin concret : disposer d’un outil fluide, élégant et puissant pour naviguer dans des dizaines de milliers de photos et d’images générées, sans dépendre d’un service cloud, sans déplacer les fichiers originaux, et avec une base documentaire locale progressivement enrichie.

L’application doit permettre de gérer deux grands types d’images :

* les photographies personnelles ;
* les images générées, notamment par Midjourney.

À terme, Iconothèque pourra intégrer une couche d’assistance IA capable de proposer des descriptions, des tags, des catégories, des personnes probables, des styles visuels, des doublons potentiels et des regroupements thématiques.

Le projet doit rester d’abord un outil personnel, fiable, local, sobre et durable.

## 2. Inspiration fonctionnelle

L’inspiration initiale est celle d’un ancien gestionnaire d’images de type ACDSee :

* navigation rapide dans les dossiers ;
* aperçu visuel des images ;
* colonne d’arborescence à gauche ;
* zone principale d’affichage au centre ;
* panneau contextuel d’information à droite ;
* accès immédiat aux métadonnées ;
* capacité à trier, commenter, taguer et retrouver.

L’objectif n’est pas de copier ACDSee, mais de retrouver ce confort d’exploration visuelle dans un outil moderne, personnel et extensible.

## 3. Principe fondamental de sécurité

Dans les premières versions, l’application ne doit jamais modifier, déplacer, supprimer ou renommer les fichiers originaux.

Elle doit uniquement :

* lire les dossiers ;
* indexer les images ;
* générer des miniatures dans un cache local ;
* enregistrer les métadonnées dans une base SQLite ;
* permettre l’ajout de tags, commentaires et statuts dans cette base.

Toute action destructive ou modifiant physiquement les fichiers devra être explicitement conçue, testée et validée dans une version ultérieure.

Règle absolue V0 :

> Les images originales sont sacrées. On les lit, on les indexe, mais on ne les touche pas.

## 4. Objectif V0.1

Créer une première application Electron fonctionnelle permettant de :

* choisir un dossier racine ;
* scanner récursivement les images ;
* afficher l’arborescence des dossiers ;
* afficher les images sous forme de grille de miniatures ;
* sélectionner une image ;
* afficher ses informations dans un panneau latéral ;
* enregistrer les données dans une base SQLite locale ;
* ajouter des tags manuels simples ;
* ajouter un commentaire manuel ;
* retrouver l’état de l’index au redémarrage.

## 5. Interface cible

L’interface principale doit être structurée en trois colonnes.

```text
┌─────────────────────────────────────────────────────────────┐
│ Barre supérieure : dossier courant, recherche, actions       │
├───────────────┬───────────────────────────────┬─────────────┤
│ Arborescence  │ Grille / aperçu des images     │ Infos       │
│ dossiers      │                               │ image       │
│               │                               │ dossier     │
└───────────────┴───────────────────────────────┴─────────────┘
```

### Colonne gauche : arborescence

La colonne gauche doit afficher :

* le dossier racine sélectionné ;
* les sous-dossiers ;
* éventuellement le nombre d’images par dossier ;
* l’état du scan si nécessaire.

### Zone centrale : images

La zone centrale doit afficher :

* une grille de miniatures ;
* le nom des fichiers si utile ;
* la sélection courante ;
* un aperçu agrandi ou une vue dédiée lors du clic/double-clic ;
* une navigation fluide au clavier à terme.

### Colonne droite : informations

Le panneau de droite doit afficher, pour l’image sélectionnée :

* nom du fichier ;
* chemin complet ;
* dossier ;
* extension ;
* taille du fichier ;
* dimensions ;
* date de création si disponible ;
* date de modification ;
* date d’import/indexation ;
* métadonnées EXIF ;
* tags ;
* commentaire ;
* statut ;
* éventuelle note ou favori.

## 6. Formats image prioritaires

La V0.1 doit prendre en charge :

* `.jpg`
* `.jpeg`
* `.png`
* `.webp`
* `.gif`

Les formats suivants pourront être ajoutés ensuite :

* `.heic`
* `.tiff`
* `.avif`
* autres formats spécifiques si nécessaire.

## 7. Stack technique envisagée

Stack recommandée :

```text
Electron
Vite
React
TypeScript
SQLite
better-sqlite3
sharp
exifr
```

### Rôle des principales briques

Electron :

* application desktop ;
* accès au système de fichiers ;
* packaging multiplateforme à terme.

Vite :

* environnement de développement rapide ;
* bundling moderne.

React :

* interface riche en composants ;
* gestion propre des panneaux, listes, états, formulaires.

TypeScript :

* robustesse du code ;
* meilleure maintenabilité ;
* contrats plus explicites entre les couches.

SQLite :

* base locale légère ;
* pas de serveur ;
* adaptée à un grand catalogue personnel.

better-sqlite3 :

* accès SQLite simple et performant côté Node.

sharp :

* lecture des images ;
* extraction des dimensions ;
* génération de miniatures ;
* génération éventuelle de previews.

exifr :

* extraction des métadonnées EXIF.

## 8. Base de données initiale

Schéma conceptuel initial.

### Table `images`

```text
id
file_path
file_name
folder_path
extension
size_bytes
width
height
created_at
modified_at
imported_at
hash
exif_json
description
rating
status
```

### Table `tags`

```text
id
name
type
created_at
```

Types possibles :

```text
person
place
style
object
event
custom
```

### Table `image_tags`

```text
image_id
tag_id
confidence
source
created_at
```

Sources possibles :

```text
manual
ai
imported
system
```

### Table `folders`

```text
id
path
name
parent_path
image_count
scanned_at
description
```

Ce schéma pourra évoluer, mais doit rester simple dans les premières versions.

## 9. Cache de miniatures

L’application doit générer un cache local de miniatures afin de ne pas charger systématiquement les images originales.

Exemple d’organisation :

```text
/app-data/cache/thumbs/
/app-data/cache/previews/
```

Chaque image indexée peut avoir :

* une miniature légère ;
* éventuellement une preview plus grande ;
* un identifiant dérivé du chemin ou du hash.

La génération de miniatures doit être progressive et robuste : une image illisible ne doit pas interrompre tout le scan.

## 10. Phases du projet

### Phase 1 — Explorer

Objectif : rendre la photothèque navigable.

Fonctions :

* sélection d’un dossier racine ;
* scan récursif ;
* index SQLite ;
* arborescence ;
* grille de miniatures ;
* panneau d’informations ;
* lecture EXIF ;
* cache de miniatures.

### Phase 2 — Cataloguer

Objectif : enrichir manuellement le catalogue.

Fonctions :

* tags manuels ;
* commentaires ;
* favoris ;
* notes ;
* statuts ;
* collections virtuelles ;
* recherche par nom, dossier, tag, commentaire, date ;
* filtres.

Statuts possibles :

```text
à trier
à garder
favorite
à revoir
rejetée
archive
```

### Phase 3 — Augmenter

Objectif : ajouter une couche d’assistance IA.

Fonctions possibles :

* description automatique d’une image ;
* tags suggérés ;
* objets détectés ;
* ambiance ;
* style visuel ;
* distinction photo réelle / image générée ;
* reconnaissance assistée de personnes après validation humaine ;
* détection de doublons ou quasi-doublons ;
* suggestions de collections ;
* recherche sémantique.

## 11. IA et reconnaissance de personnes

La reconnaissance de personnes doit être conçue avec prudence.

Principe recommandé :

* l’application détecte éventuellement des visages ;
* l’utilisateur crée lui-même les fiches personnes ;
* l’utilisateur confirme manuellement les identités ;
* l’application peut ensuite proposer des correspondances probables ;
* aucune identification ne doit être imposée automatiquement.

Exemple :

```text
Visage détecté 1 → Qui est-ce ?
Réponse utilisateur : Mariela.
Image suivante → Proposition : Mariela ? confiance 82 %.
L’utilisateur valide ou corrige.
```

Les données personnelles doivent rester locales autant que possible.

## 12. Images générées

Iconothèque doit aussi permettre de gérer les images générées par Midjourney ou d’autres outils.

Métadonnées utiles possibles :

* outil de génération ;
* prompt si disponible ;
* style ;
* ambiance ;
* sujet ;
* usage potentiel ;
* projet associé ;
* version ;
* collection ;
* date de génération ;
* image source éventuelle.

Tags utiles pour images générées :

```text
Midjourney
portrait
concept art
fantasy
dark fantasy
science-fiction
cinematic
architecture
landscape
character design
reference
illustration
```

## 13. Recherche cible à terme

Exemples de recherches visées :

```text
photos avec Mariela et ma mère
images Midjourney dark fantasy avec ruines
photos de vacances avec mer et ciel bleu
portraits générés en lumière dorée
photos de famille autour d’une table
images à revoir non taguées
fichiers sans EXIF
doublons probables
```

La recherche doit d’abord être simple, puis devenir progressivement sémantique.

## 14. Méthode de travail avec Codex

Chaque intervention de Codex doit être limitée, explicite et documentée.

Codex doit toujours :

1. comprendre l’objectif de l’itération ;
2. modifier uniquement les fichiers nécessaires ;
3. éviter les changements massifs non demandés ;
4. préserver les fichiers originaux et les données utilisateur ;
5. créer ou mettre à jour un fichier de rapport dans un dossier `reports/`.

## 15. Rapports d’itération

Chaque mission confiée à Codex doit produire un rapport Markdown dans le dossier :

```text
reports/
```

Convention de nommage recommandée :

```text
001_initial_electron_setup_report.md
002_sqlite_index_report.md
003_thumbnail_cache_report.md
004_exif_extraction_report.md
```

Chaque rapport doit préciser :

* objectif de la mission ;
* fichiers créés ;
* fichiers modifiés ;
* choix techniques ;
* fonctionnement ajouté ;
* points non traités ;
* risques éventuels ;
* vérifications effectuées ;
* commandes lancées ;
* recommandations pour la suite.

Structure type :

```markdown
# Rapport — Titre de la mission

## Objectif

## Fichiers créés

## Fichiers modifiés

## Fonctionnement ajouté

## Choix techniques

## Vérifications effectuées

## Points non traités

## Risques / limites

## Suite recommandée
```

## 16. Règles de développement

Règles générales :

* ne pas déplacer les images originales ;
* ne pas supprimer les images originales ;
* ne pas renommer les images originales ;
* ne pas écrire dans les dossiers photo sans demande explicite ;
* garder les données applicatives dans un dossier dédié ;
* documenter les choix ;
* privilégier des itérations courtes ;
* tester après chaque étape ;
* produire un rapport après chaque mission.

## 17. Organisation possible du projet

Structure initiale envisagée :

```text
iconotheque/
├── README.md
├── package.json
├── electron/
│   ├── main.ts
│   └── preload.ts
├── src/
│   ├── App.tsx
│   ├── components/
│   ├── styles/
│   └── services/
├── db/
│   ├── schema.sql
│   └── migrations/
├── reports/
│   └── 001_initial_setup_report.md
└── docs/
    ├── ARCHITECTURE.md
    ├── CODEX_WORKFLOW.md
    └── ROADMAP.md
```

Cette structure pourra évoluer selon les choix techniques retenus.

## 18. Première mission recommandée

Créer le squelette initial de l’application.

Objectif :

* initialiser une application Electron + Vite + React + TypeScript ;
* afficher une fenêtre desktop ;
* créer une interface en trois colonnes ;
* ajouter un bouton de sélection de dossier ;
* préparer l’architecture pour le scan d’images ;
* créer le dossier `reports/` ;
* produire un premier rapport d’itération.

La V0.1 ne doit pas encore chercher à tout faire. Elle doit poser une base propre, testable et extensible.

## 19. Philosophie du projet

Iconothèque doit être :

* locale ;
* rapide ;
* élégante ;
* robuste ;
* non destructive ;
* progressivement augmentée ;
* adaptée à une photothèque réelle et désordonnée ;
* pensée comme un outil de mémoire visuelle personnelle.

Le but n’est pas seulement de voir des images, mais de retrouver, comprendre, relier et valoriser une archive personnelle accumulée au fil du temps.



