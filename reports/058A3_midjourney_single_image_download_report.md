# Mission 058A-3 — Téléchargement d'une image MJ sélectionnée

## Contexte et résultat

- Racine vérifiée : `J:\2026\Iconotheque`.
- Version avant/après : `0.1.3-dev.28`.
- La mission ajoute l'action contextuelle **Télécharger cette image MJ** pour une référence Midjourney image sélectionnée. Elle ne traite ni les vidéos ni le téléchargement des quatre slots d'un job.

### Correctif 058A-4

La recette manuelle a révélé un rejet systématique avec « Référence Midjourney invalide » pour les images existantes, par exemple `https://cdn.midjourney.com/ca7c8ec3-d970-4212-b932-0208fa4b49f7/0_2.png`.

Cause exacte : le helper de clé locale validait les slots `0` à `3`, convention des vidéos MJ, alors que les images importées et servies par la visionneuse portent les slots `0_0` à `0_3`. L'URL distante et la validation du job étaient déjà correctes ; la construction de clé retournait donc `null` avant le téléchargement.

La règle est désormais stricte pour ce helper d'images : seuls `0_0`, `0_1`, `0_2` et `0_3` sont acceptés. Exemple de clé : `ca7c8ec3-d970-4212-b932-0208fa4b49f7/ca7c8ec3-d970-4212-b932-0208fa4b49f7_0_2.png`. Les vidéos ne sont pas concernées.

## Flux livré

1. Le renderer affiche l'action uniquement pour une référence distante `midjourney` de type `image`.
2. Le preload expose une API typée limitée, `downloadMidjourneyImage({ imageId })`.
3. Le main process relit la référence depuis SQLite et refuse tout élément non-Midjourney, vidéo, UUID/slot/URL incohérent ou chemin local invalide.
4. Il télécharge le PNG uniquement après cette action explicite, exige une réponse HTTP réussie de type `image/png`, puis écrit un fichier temporaire et le renomme vers la destination définitive.
5. La destination est `userData/Iconotheque/midjourney-images/<jobId>/<jobId>_<slot>.png`. La clé relative est construite par l'utilitaire introduit en 058A-0.
6. Après écriture, `remote_images.local_copy_status` devient `downloaded` et `local_copy_key` reçoit cette clé. L'affichage local prioritaire de 058A-2 est alors rechargé dans la source Midjourney.

En cas d'échec, le fichier cible n'est pas remplacé par un fichier partiel ; un temporaire connu est supprimé quand cela est possible, l'état passe à `failed` et l'affichage distant reste le repli.

## Fichiers de la mission

- Modifiés : `electron/main.ts`, `electron/preload.cts`, `src/App.tsx`, `src/types.ts`, `src/vite-env.d.ts`, `CHANGELOG.md`, `README.md`.
- Créé : ce rapport.

Les changements préexistants du worktree ne sont pas nettoyés ni attribués à cette mission.

## Validations exécutées

- `npm.cmd run typecheck` : succès.
- `npm.cmd run test:midjourney-local-image-path` : succès (2 tests) ; il couvre le format de clé, les UUID/slots invalides et le refus de traversée de chemin.
- `npm.cmd run build` : succès.
- `git diff --check` : succès.

Après le correctif 058A-4, ces quatre contrôles ont été réexécutés avec succès. Le test ciblé vérifie maintenant explicitement la clé d'image `0_2`, la résolution de `0_3` et le rejet de `0` (slot vidéo), `0_4` et d'un UUID invalide.

Les tests automatisés n'effectuent aucun accès réseau. Aucun test unitaire supplémentaire du téléchargement n'a été ajouté : le module main utilise directement `net.fetch`, SQLite et le système de fichiers, sans point d'injection existant ; un tel test nécessiterait une abstraction hors périmètre.

## Recette Electron

Non réalisée dans cet environnement. À vérifier manuellement : ouvrir `Web / Midjourney`, clic droit sur une image PNG au slot `0_0` à `0_3`, choisir l'action, constater le message de succès, vérifier le fichier dans le cache, l'affichage de la tuile et de la visionneuse, puis redémarrer l'application. Vérifier aussi le message d'erreur et le repli distant si le CDN ne répond pas.

## Limites et invariants

- Pas de téléchargement par job, automatique ou par lots ; pas de badge, explorateur, vidéo, import JSON ni nettoyage global.
- Aucun fichier média source de l'utilisateur n'est modifié : seule une copie PNG est écrite dans le cache applicatif dédié.
- Le téléchargement réel n'est jamais exécuté par les tests ; il est autorisé seulement à la suite de l'action explicite dans l'application.

## Suite recommandée

Recette Electron avec une image MJ disponible, puis considérer séparément le téléchargement des quatre slots, le badge local et l'ouverture dans l'explorateur.

Message de commit proposé : `feat: download selected Midjourney image locally`
