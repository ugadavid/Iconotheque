# Changelog

## V0.1.3-dev.28 - Copies locales d'images Midjourney

- Ajout du schéma 10, de la clé relative et de la priorité d’affichage des copies locales lorsqu’elles existent.
- Ajout de « Télécharger cette image MJ » pour enregistrer explicitement une image PNG Midjourney sélectionnée dans le cache applicatif.
- Correction de la clé locale pour les slots image `0_0` à `0_3`.
- Ajout du téléchargement explicite des quatre images existantes d'un job MJ depuis l'en-tête de sa carte en vue Jobs.
- Affichage d'un badge discret `Local` lorsque la grille utilise réellement une copie locale d'image Midjourney.
- Harmonisation visuelle et correction du positionnement des badges `Local` et MJ dans les vues Images et Jobs.
- Ajout de l'ouverture du dossier de cache d'un job MJ image depuis son menu contextuel.
- Le téléchargement ne concerne ni les vidéos, ni les jobs complets, ni les fichiers source de l’utilisateur.

## V0.1.3-dev.27 - Classification vidéo des observations Midjourney

- Les cinq jobs vidéo observés et six UUID vidéo validés restent exclusivement dans la bibliothèque vidéo lors de l’import JSON.
- Une réimportation retire simplement leurs slots PNG erronés puis crée ou réutilise les quatre MP4.

## V0.1.3-dev.26 - Correctifs post-import Midjourney JSON

- Rafraîchissement de la source vidéo Midjourney après retrait du catalogue.
- Ajout de `Copier le job ID` dans le menu contextuel des références Midjourney image et vidéo.
- Audit des images reconstruites depuis le JSON : URLs, UUID et slots conformes à l’import manuel ; leur disponibilité CDN reste externe et non vérifiée automatiquement.

## V0.1.3-dev.25 - Import JSON d’observations Midjourney

- Ajout de `Fichier > Importer observations Midjourney JSON...`.
- Lecture locale stricte : jobs image reconstruits depuis leur UUID et jobs vidéo confirmés par leurs quatre MP4.
- Réutilisation de la déduplication et des quatre slots des imports manuels ; aucun accès réseau, prompt ou vignette générée automatiquement.

## V0.1.3-dev.24 - Vignettes vidéo Midjourney sélectionnées

- Ajout d’une action manuelle de génération de vignette pour une vidéo Midjourney sélectionnée ; la vignette est partagée par les quatre slots de son job.
- La frame PNG extraite côté renderer est validée, persistée une seule fois dans le cache applicatif et référencée en schéma 9.
- Les vues plate et Jobs utilisent cette vignette lorsqu’elle existe ; sinon elles gardent le placeholder vidéo.
- Aucun traitement automatique, par lots, JSON, FFmpeg ni cache de vidéo distante générique.

## V0.1.3-dev.23 - Import batch de jobs vidéo Midjourney

- Ajout de l’import manuel de plusieurs jobs MJ vidéo.
- Création dédupliquée des quatre références MP4 `0` à `3` par job.
- Aucun changement de schéma, protocole MP4, import JSON, vidéo Web générique ou vignette locale.

## V0.1.3-dev.22 - Jobs vidéo Midjourney

- Ajout de l’import manuel d’un job MJ vidéo et de ses quatre slots MP4.
- Ajout de `remote_images.media_kind` avec migration idempotente vers le schéma 8 ; les entrées existantes restent des images.
- Séparation des vidéos Midjourney dans leur source virtuelle et lecture contrôlée dans la visionneuse.

## V0.1.3-dev.21 - Retrait des références distantes

Iconotheque permet de retirer des références Web et Midjourney de son catalogue local.

- Ajout de « Retirer d'Iconotheque... » dans le menu contextuel des tuiles distantes.
- Confirmation explicite : catalogue, associations de collections et métadonnées applicatives sont retirés localement, sans action sur les fichiers ni les sources distantes.
- Prise en charge transactionnelle des lots et filtrage renderer des sélections mixtes.
- Refus définitif côté main process de tout identifiant local, absent ou incohérent.
- Aucun changement de schéma, migration, import ou protocole réseau.

## V0.1.3-dev.20 - Canonicalisation documentaire

Iconotheque met à jour ses documents de référence et son aide intégrée.

- README recentré sur l’état fonctionnel courant et le démarrage.
- Ajout de l’architecture et d’un index des rapports de mission.
- Aide intégrée actualisée avec affichage dynamique de la version issue de `package.json`.
- Clarification du caractère historique du gel V0.1.0 et de la roadmap des sources distantes.
- Aucun changement de schéma, aucune migration, aucune modification de logique métier, des imports ou du protocole distant.

## V0.1.3-dev.19 - Polish feedbacks modales

Iconotheque harmonise les messages de feedback dans les modales avec un style inline plus discret.

- Ouverture de la version de travail `0.1.3-dev.19`.
- Harmonisation des classes `remote-image-feedback`.
- Attenuation visuelle des warnings et doublons.
- Style plus sobre pour les lignes invalides d'import Midjourney batch.
- Aucun changement fonctionnel, IPC, schema SQLite ou logique d'import.

## V0.1.3-dev.18 - Vue groupee Midjourney par job

Iconotheque ajoute une vue Midjourney regroupee par job, sans modifier le modele de donnees.

- Ouverture de la version de travail `0.1.3-dev.18`.
- Ajout du toggle `Images` / `Jobs` dans `Web / Midjourney`.
- Regroupement renderer par `remoteProviderGroupId`.
- Affichage des slots `0_0`, `0_1`, `0_2`, `0_3` dans des cartes de job.
- Chaque slot reste une image individuelle selectionnable et ouvrable.
- Ajout de `Selectionner les images du job`.
- Drag d'une carte job vers une collection via les `imageId` des slots disponibles.
- Aucun fichier original n'est copie, deplace, renomme, modifie ou supprime.

## V0.1.3-dev.17 - Drag and drop vers collections

Iconotheque ajoute le glisser-deposer d'images vers les collections virtuelles.

- Ouverture de la version de travail `0.1.3-dev.17`.
- Les tuiles d'images peuvent etre glissees vers une collection.
- Une selection multiple glissee vers une collection ajoute toutes les images selectionnees.
- Les collections affichent un survol de drop discret.
- Les ajouts reutilisent `collections:add-images` et les messages existants.
- Aucun fichier original n'est copie, deplace, renomme, modifie ou supprime.

## V0.1.3-dev.16 - Menu contextuel collections

Iconotheque ajoute les actions de gestion non destructives des collections depuis la colonne gauche.

- Ouverture de la version de travail `0.1.3-dev.16`.
- Ajout d'un clic droit sur les collections virtuelles.
- Ajout de `Renommer la collection...` avec validation du nom.
- Ajout de `Supprimer la collection...` avec confirmation explicite.
- La suppression retire uniquement la collection virtuelle et ses associations.
- Aucune image, aucun fichier original, aucune source distante et aucune metadonnee utilisateur ne sont supprimes.

## V0.1.3-dev.15 - Menu contextuel images et collections

Iconotheque ajoute un menu contextuel non destructif sur les images de la grille.

- Ouverture de la version de travail `0.1.3-dev.15`.
- Ajout d'un clic droit sur les tuiles d'image.
- Ajout de `Ajouter a une collection...` depuis le menu contextuel.
- Ajout de `Retirer de cette collection` dans les vues collection.
- Respect de la selection multiple lors du clic droit.
- Ajout de `Ouvrir dans la visionneuse` comme action contextuelle simple.
- Aucune action destructive et aucune modification des fichiers originaux.

## V0.1.3-dev.14 - Correction UX collections virtuelles

Iconotheque corrige le retour immediat apres creation de collection et clarifie les messages d'ajout aux collections.

- Ouverture de la version de travail `0.1.3-dev.14`.
- Correction de la relecture immediate d'une collection nouvellement creee.
- Rafraichissement plus robuste de la liste des collections apres creation.
- Messages plus naturels lors de l'ajout d'images deja presentes dans une collection.
- Ajout du raccourci `Ctrl+Shift+C` / `CommandOrControl+Shift+C` pour `Edition > Ajouter la selection a une collection...`.
- Aucun drag and drop, aucune suppression ou modification des fichiers originaux.

## V0.1.3-dev.13 - Collections virtuelles V0

Iconotheque ajoute une premiere version des collections virtuelles basees sur `images.id`.

- Ouverture de la version de travail `0.1.3-dev.13`.
- Ajout des tables `collections` et `collection_images`.
- Ajout de `Fichier > Nouvelle collection...`.
- Ajout de `Edition > Ajouter la selection a une collection...`.
- Affichage des collections dans la colonne gauche avec compteur.
- Affichage des images locales et distantes d'une collection dans la grille existante.
- Retrait de la selection depuis la collection courante, sans supprimer les images.
- Aucune modification, suppression, copie, renommage ou deplacement des fichiers originaux.

## V0.1.3-dev.12 - Correction UX feedback imports distants

Iconotheque harmonise les messages de feedback des modales d'import distant et corrige l'etat bloque apres une erreur.

- Ouverture de la version de travail `0.1.3-dev.12`.
- Utilisation d'une meme famille visuelle pour succes, warning et erreur.
- Reinitialisation des erreurs lorsqu'un champ d'import est modifie.
- Protection des handlers d'import avec remise a zero de l'etat de chargement en cas d'exception.
- Aucun changement de modele, de cache, d'archive ou de telechargement.

## V0.1.3-dev.11 - Ajustements UX imports distants

Iconotheque ajuste le comportement des modales d'import distant pour mieux distinguer les succes propres des doublons ou cas a relire.

- Ouverture de la version de travail `0.1.3-dev.11`.
- Fermeture automatique des modales lors des succes propres.
- Maintien des modales ouvertes pour doublons, imports partiels, lignes invalides et erreurs.
- Ajout d'un style d'alerte plus visible pour les jobs Midjourney deja presents.
- Aucun changement de modele, de cache, d'archive ou de telechargement.

## V0.1.3-dev.10 - Amelioration UX imports Midjourney

Iconotheque clarifie les messages d'import distant et route les URLs Midjourney collees dans l'ajout web generique vers le parcours Midjourney.

- Ouverture de la version de travail `0.1.3-dev.10`.
- Messages plus explicites pour les jobs Midjourney nouveaux, deja presents ou partiellement presents.
- Resume batch plus lisible avec jobs detectes, images creees, images deja presentes et lignes ignorees.
- Detection des URLs `cdn.midjourney.com` dans `Fichier > Ajouter une image web...`.
- Les URLs Midjourney creent ou reutilisent le job complet dans `Web / Midjourney`, sans entree `generic_url`.
- Aucun cache, aucune archive locale, aucun telechargement persistant et aucune modification des fichiers originaux.

## V0.1.3-dev.9 - Import Midjourney par lot

Iconotheque ajoute un import simple de plusieurs jobs Midjourney a partir d'une liste de job IDs ou d'URLs CDN.

- Ouverture de la version de travail `0.1.3-dev.9`.
- Ajout de `Fichier > Ajouter plusieurs jobs Midjourney...`.
- Parsing ligne par ligne avec validation cote main process.
- Deduplication des jobs saisis et reutilisation des images deja presentes via `remote_images.remote_url`.
- Creation ou reutilisation des quatre slots `0_0` a `0_3` par job valide.
- Aucun cache, aucune archive locale, aucun telechargement persistant, aucun scraping et aucune API Midjourney.

## V0.1.3-dev.8 - Correction affichage images distantes

Iconotheque corrige et rend observable le chargement des images distantes, notamment Midjourney.

- Ouverture de la version de travail `0.1.3-dev.8`.
- Correction du chargement distant via le protocole controle `iconotheque-image://remote/<imageId>`.
- Ajout de logs main process sobres pour les requetes d'images distantes.
- Ajout de headers HTTP plus explicites pour le fetch distant cote main process.
- Ajout d'un etat d'erreur visible dans la grille et la visionneuse lorsqu'une image distante ne charge pas.
- Aucun cache, aucune archive locale, aucun telechargement persistant et aucune URL distante brute comme source principale renderer.

## V0.1.3-dev.7 - Ajout Midjourney minimal

Iconotheque ajoute une premiere integration Midjourney minimale permettant de creer les quatre images distantes d'un job.

- Ouverture de la version de travail `0.1.3-dev.7`.
- Ajout de `Fichier > Ajouter un job Midjourney...`.
- Reconnaissance d'une URL `https://cdn.midjourney.com/<job_id>/<slot>.png` ou d'un UUID/job ID seul.
- Generation des quatre URL `0_0.png`, `0_1.png`, `0_2.png`, `0_3.png`.
- Creation d'images distantes avec `provider = 'midjourney'`, `provider_id`, `provider_group_id` et `remote_slot`.
- Ajout d'une entree minimale `Web / Midjourney`.
- Aucun cache, aucune archive locale, aucun telechargement persistant, aucun scraping et aucune API Midjourney.

## V0.1.3-dev.6 - Premiere image web generique visible

Iconotheque ajoute un premier parcours utilisateur limite pour ajouter et afficher une image web generique par URL HTTPS.

- Ouverture de la version de travail `0.1.3-dev.6`.
- Ajout de `Fichier > Ajouter une image web...`.
- Ajout d'une vue minimale `Web > Images par URL`.
- Validation stricte des URL HTTPS et formats image supportes.
- Affichage distant via le protocole controle `iconotheque-image://remote/...`.
- Metadonnees utilisateur conservees via l'identite catalogue `images.id`.
- Aucun cache, aucune archive locale, aucun telechargement persistant, aucune integration Midjourney.

## V0.1.3-dev.5 - Parcours distant interne de test

Iconotheque ajoute un premier parcours technique interne pour valider le modele des images distantes, sans interface utilisateur publique.

- Ouverture de la version de travail `0.1.3-dev.5`.
- Ajout d'une validation syntaxique prudente des URL distantes HTTPS.
- Ajout de fonctions internes pour creer, relire et supprimer une image distante de test.
- Ajout d'un auto-test main process activable par `ICONOTHEQUE_REMOTE_SELFTEST=1`.
- Aucun import URL public, aucune racine Web, aucun affichage distant et aucun acces reseau.

## V0.1.3-dev.4 - Reconstruction du catalogue images neutre

Iconotheque reconstruit le modele `images` comme catalogue commun neutre, les details locaux etant portes par `local_images`.

- Ouverture de la version de travail `0.1.3-dev.4`.
- Reconstruction du schema `images` autour de `id`, `source_kind`, `created_at` et `updated_at`.
- Conservation de `local_images` comme source de verite pour les chemins et attributs locaux.
- Adaptation du scan local pour dedoublonner via `local_images.path`.
- Aucune image distante, import URL, racine Web ou integration Midjourney.

## V0.1.3-dev.3 - Normalisation modele image local/distant

Iconotheque poursuit la preparation du modele image avec un catalogue commun et une table dediee aux details locaux.

- Ouverture de la version de travail `0.1.3-dev.3`.
- Ajout de la table `local_images` liee a `images.id`.
- Migration des informations locales existantes depuis `images` vers `local_images`.
- Adaptation des lectures et ecritures locales pour utiliser `local_images`.
- Conservation temporaire des anciennes colonnes locales dans `images` pour compatibilite de migration.
- Aucune image distante, import URL, racine Web ou integration Midjourney.

## V0.1.3-dev.2 - Preparation modele sources locales/distantes

Iconotheque prepare le modele de donnees pour distinguer les images locales et les futures images distantes, sans changement utilisateur visible.

- Ouverture de la version de travail `0.1.3-dev.2`.
- Ajout de `images.source_kind` pour distinguer `local` et `remote`.
- Ajout d'une table dediee `remote_images` liee a `images.id`.
- Les images locales existantes et nouvellement scannees restent marquees `local`.
- Aucune importation URL, racine Web, integration Midjourney ou recuperation reseau.

## V0.1.3-dev.1 - Preparation identite image stable

Iconotheque ouvre la version de travail `0.1.3-dev.1` pour preparer les futures sources web sans ajouter de fonctionnalite utilisateur.

- Ouverture de la version de travail `0.1.3-dev.1`.
- Ajout preparatoire d'une identite stable d'image exposee au renderer.
- Preparation technique pour de futures sources web.
- Comportement local inchange.
- Aucune commande d'import URL, racine Web ou integration Midjourney.

## V0.1.2 - Stable post-gel

Iconotheque V0.1.2 stabilise officiellement le socle post-gel selon la convention de versionnage pair/stable.

- Adoption de la convention de versionnage interne.
- Documentation ajoutee dans `docs/VERSIONING.md`.
- Clarification : `0.1.1` etait une version de stabilisation transitoire.
- Aucune nouvelle fonctionnalite.
- Aucun changement d'architecture.

## V0.1.1 - Stabilisation post-gel

Iconotheque V0.1.1 cloture la phase de stabilisation post-gel de la v0.1.0.

- Harmonisation documentaire autour du libelle `V0.1.0`.
- Correction du menu `Edition > Modifier la selection par lot...`, maintenant actif uniquement a partir de deux images selectionnees.
- Audit preparatoire pour une future distribution et une future strategie de mises a jour.
- Aucune nouvelle fonctionnalite majeure.

## V0.1.0 - Gel initial

Iconotheque V0.1.0 est le premier gel fonctionnel du prototype local.

Principales fonctionnalites livrees :

- Application Electron locale avec renderer Vite, React et TypeScript.
- Ouverture securisee d'un dossier racine.
- Arborescence recursive des dossiers.
- Scan non recursif du dossier actif.
- Grille d'images avec protocole local `iconotheque-image://`.
- Selection simple, selection multiple et navigation clavier.
- Visionneuse avec navigation precedente / suivante.
- Colonnes redimensionnables et layout responsive.
- Tailles de vignettes petites, moyennes et grandes.
- Panneau d'informations fichier et metadonnees utilisateur.
- Edition individuelle et edition par lot.
- SQLite locale `schema_version = 3`.
- Tags, personnes, lieux, collections et projets.
- Description, prompt, source, outil / modele, date de reference, note, favori, statut, mode couleur et couleur de workflow.
- Liseres de workflow dans la grille.
- Recherche simple, recherche avancee et filtres rapides de workflow.
- Menus Fichier, Edition, Affichage, Recherche et Aide.
- Barre de statut.
- Aide integree accessible par F1.

Limites assumees :

- Pas d'EXIF.
- Pas d'IA.
- Pas de miniatures physiques.
- Pas de hash de fichiers.
- Pas de recherche FTS.
- Pas de packaging installable.
