# Mission 058B — Télécharger les 4 images d'un job MJ

## Résultat

- Racine vérifiée : `J:\2026\Iconotheque`.
- Version avant/après : `0.1.3-dev.28`.
- L'en-tête d'une carte de job Midjourney image, en vue `Jobs`, ouvre désormais au clic droit un menu proposant **Télécharger les 4 images du job MJ**.

## Implémentation

- Le renderer transmet le `jobId` de la carte via une API preload typée limitée.
- Le main process relit les quatre références existantes du groupe, exclusivement `midjourney`, `media_kind = image`, avec les slots stricts `0_0`, `0_1`, `0_2`, `0_3`.
- Chaque slot réutilise l'écriture sûre du téléchargement unitaire : URL distante stockée, PNG exigé, fichier temporaire, renommage atomique, puis mise à jour de `local_copy_status` et `local_copy_key`.
- Les copies déjà présentes et réellement existantes sont réutilisées sans requête réseau. Un slot indisponible ou manquant n'empêche pas les autres : le résultat indique les comptes téléchargé, déjà présent et échoué.
- Les fichiers sont placés sous `userData/Iconotheque/midjourney-images/<jobId>/<jobId>_<slot>.png` ; par exemple `<jobId>/<jobId>_0_2.png`.
- La source MJ image est relue après l'opération, ce qui actualise les vues Jobs et plate et active la priorité locale existante.

## Fichiers

- Modifiés : `electron/main.ts`, `electron/preload.cts`, `src/App.tsx`, `src/components/ImageGrid.tsx`, `src/types.ts`, `src/vite-env.d.ts`, `tests/midjourney-local-image-path.test.mjs`, `CHANGELOG.md`.
- Créé : ce rapport.

## Validations

- `npm.cmd run typecheck` : succès.
- `npm.cmd run test:midjourney-local-image-path` : succès (2 tests).
- `npm.cmd run build` : succès.
- `git diff --check` : succès.

Les tests ne déclenchent aucun accès réseau. Le test de helper couvre les quatre slots attendus, le format de clé, les slots invalides et le refus de traversée de chemin. Un test unitaire du téléchargement par job demanderait d'introduire une abstraction de `net.fetch`, SQLite et du système de fichiers, hors périmètre ciblé.

## Recette Electron

Non réalisée dans cet environnement. À vérifier : ouvrir `Web / Midjourney`, passer à `Jobs`, clic droit sur l'en-tête d'un job image, choisir l'action, vérifier le résumé et les quatre PNG sous le dossier applicatif ; puis vérifier les vues Jobs et plate, et la persistance après redémarrage.

## Limites et sécurité

- Pas de téléchargement automatique, par lots de jobs, vidéo, import JSON, badge local ou ouverture dans l'explorateur.
- Aucune modification ou suppression des fichiers média source de l'utilisateur : seules des copies PNG sont écrites dans le cache applicatif dédié.

Message de commit proposé : `feat: download all images for a Midjourney job`
