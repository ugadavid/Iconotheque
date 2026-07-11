# Mission 051B-1 — Persistance minimale d’une vignette vidéo MJ sélectionnée

## Cadre vérifié

- Racine : `J:\2026\Iconotheque`.
- Version avant et après : `0.1.3-dev.24` ; la version de travail déjà ouverte par 051A est conservée, conformément au périmètre.
- Les changements antérieurs du worktree ont été préservés.

## Résultat

Une vidéo Midjourney cataloguée peut désormais recevoir une vignette PNG persistante, uniquement à la demande de l’utilisateur. Le menu contextuel d’une tuile vidéo MJ propose **Générer la vignette vidéo**. Le renderer réutilise `src/videoThumbnailProbe.ts`, puis transmet le PNG au processus principal. Celui-ci valide le payload, écrit le fichier dans le cache applicatif et enregistre son état dans SQLite.

Correctif 051B-2 : la vignette est désormais associée au job (`provider_group_id`) et non au seul slot déclencheur. Les quatre vidéos `0` à `3` du job reçoivent la même clé, et les vues plate et Jobs servent le même PNG contrôlé.

Les vues plate et Jobs affichent la vignette via le protocole contrôlé lorsqu’elle est disponible. En son absence ou si le fichier de cache est indisponible, elles conservent le placeholder vidéo existant. L’action temporaire `DEV : tester la vignette vidéo` a été remplacée par cette action utilisateur ; la modale garde seulement un retour de succès ou d’échec et un aperçu non persistant supplémentaire.

## Migration et cache

- Schéma : passage de **8** à **9**.
- `remote_images` reçoit `video_thumbnail_status` (`missing`, `generated`, `failed`) et `video_thumbnail_key`.
- Les entrées existantes reçoivent `missing` lors de la migration.
- Cache : `userData/Iconotheque/video-thumbnails/mj-video-job-<jobId>.png`.
- Le nom repose sur le job Midjourney validé ; un PNG est partagé par les quatre slots. Aucun dossier source utilisateur ni fichier média original n’est modifié.
- Adaptation idempotente : au démarrage, une ancienne clé par slot encore associée à un fichier est renommée vers la clé du job, puis propagée aux slots existants du job. Les anciennes références sans fichier gardent leur fallback placeholder et pourront être régénérées manuellement.
- Le protocole n’expose une vignette que pour une entrée `remote`, `midjourney`, `media_kind = video`, marquée `generated`, avec la clé attendue. Un fichier absent répond 404 et la grille conserve le placeholder.

## Fichiers modifiés ou créés

- `db/schema.sql`
- `electron/main.ts`
- `electron/preload.cts`
- `src/types.ts`
- `src/vite-env.d.ts`
- `src/App.tsx`
- `src/components/ImageGrid.tsx`
- `src/styles/app.css`
- `CHANGELOG.md`
- `README.md`
- `docs/ARCHITECTURE.md`
- `reports/051_midjourney_video_thumbnails_report.md`

## Limites conservées

- Pas de génération automatique, en masse ou par lots.
- Pas d’import JSON, FFmpeg, dépendance externe, vidéo Web générique ou lecteur dans les grilles.
- La visionneuse MP4 et son protocole ne sont pas modifiés.
- Le retrait d’une référence distante supprime désormais au mieux le PNG uniquement lorsqu’aucun slot ne le référence encore ; un échec de nettoyage peut seulement laisser un fichier orphelin inoffensif.
- Aucun test réseau volontaire n’est exécuté.

## Contrôles

- `npm.cmd run typecheck` : réussi.
- `npm.cmd run test:remote-reference-removal` : réussi (4/4). Il couvre la suppression transactionnelle distante ; le nettoyage de cache ajouté après une suppression réussie reste un best effort du processus principal.
- `npm.cmd run build` : réussi.
- `git diff --check` : réussi.
- Aucun test automatisé additionnel : l’écriture de cache dépend du chemin `userData` Electron et le flux de canvas doit être validé sur une vidéo MJ réelle.

## Recette Electron

La recette 051B-1 a été validée par l’utilisateur pour la génération, la persistance et l’affichage. La recette spécifique 051B-2 n’a pas été réalisée dans cette exécution : ouvrir `Web / Midjourney / Vidéos`, générer depuis un slot, vérifier les quatre slots en vue plate puis Jobs, et vérifier que l’aperçu de la modale reste contenu. La lecture MP4 n’est pas revalidée, conformément à la décision de mission.

## Invariants

Les originaux et dossiers utilisateur ne sont ni modifiés, ni déplacés, ni supprimés. Seul un PNG dérivé est écrit dans le cache applicatif après une action explicite. Le main process applique les contrôles de type, de fournisseur, de type média, de taille, d’encodage PNG et de clé de cache.

## Commit proposé

`fix: apply Midjourney video thumbnails per job`
