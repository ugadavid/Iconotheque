# Architecture d’Iconothèque

Ce document décrit l’architecture actuellement constatée dans le code. Les sources techniques détaillées restent `electron/main.ts` et `db/schema.sql`.

## Couches

- **Electron main** (`electron/main.ts`) : initialise l’application, les menus, la base SQLite, les scans locaux, les opérations d’import et le protocole d’image contrôlé.
- **Preload** (`electron/preload.cts`) : expose au renderer une API limitée via `contextBridge`, avec isolation de contexte et sans intégration Node dans la page.
- **Renderer** (`src/`) : interface React/Vite ; il pilote les interactions et consomme l’API exposée, sans accès direct au système de fichiers ni à SQLite.

## Données et identité

La base applicative est créée dans le répertoire Electron `userData`, sous `Iconotheque/iconotheque.sqlite`. Le catalogue commun `images` porte l’identité stable `images.id` et le type de source. `local_images` contient les détails des fichiers locaux ; `remote_images` contient les URL et attributs des références distantes. Les métadonnées utilisateur et les termes sont reliés à `images.id`.

Les collections sont virtuelles : `collections` et `collection_images` associent des identifiants d’images, sans déplacer ni dupliquer les fichiers ou sources.

## Images et protocole

Le protocole `iconotheque-image://` est géré par le processus principal. Il lit les aperçus locaux enregistrés, les vignettes PNG de vidéos Midjourney du cache applicatif, ou récupère une image distante identifiée par son `imageId`; le renderer ne traite pas l’URL distante brute comme source principale d’affichage.

## Schéma et migrations

Le numéro de schéma courant est **9** (`SCHEMA_VERSION` dans `electron/main.ts`), enregistré dans `app_meta.schema_version`. Les détails distants portent aussi `remote_images.media_kind` (`image` ou `video`) et, pour les seules vidéos Midjourney, un état et une clé de vignette locale. Les données historiques reçoivent `image` et l’état de vignette `missing`. Le cache est placé sous `userData/Iconotheque/video-thumbnails`, avec un nom stable dérivé du `provider_group_id` Midjourney : un seul PNG est partagé par les slots d’un job, sans écriture dans les dossiers source. Au démarrage, le schéma SQL est appliqué avec des créations idempotentes puis une migration applicative vérifie des colonnes et tables historiques, complète les données locales et reconstruit si nécessaire l’ancien catalogue `images`.

Les migrations anciennes sont donc intégrées au démarrage et ne constituent pas un framework de migration versionné distinct. Elles doivent être auditées sur une copie de base avant toute évolution à risque.

## Invariants et limites

- Les originaux ne sont jamais modifiés, déplacés, renommés ou supprimés par Iconothèque.
- Une image locale dépend encore de son chemin source ; un changement externe peut la rendre indisponible.
- Les sources distantes ne disposent actuellement ni de cache persistant ni d’archivage local, hors vignettes PNG explicitement générées pour les vidéos Midjourney, et dépendent du réseau et du serveur source.
- Les contrôles de réseau, les migrations anciennes, l’archivage, le cache et le packaging demandent encore des audits ou travaux dédiés.

Voir aussi [le schéma SQL](../db/schema.sql), le [README](../README.md) et la [roadmap historique](../ROADMAP_REMOTE_SOURCES_V0.1.3.md).
