# Mission 058A-3 — Téléchargement d'une image MJ sélectionnée

## Contexte et résultat

- Racine vérifiée : `J:\2026\Iconotheque`.
- Version avant/après : `0.1.3-dev.28`.
- La mission ajoute l'action contextuelle **Télécharger cette image MJ** pour une référence Midjourney image sélectionnée. Elle ne traite ni les vidéos ni le téléchargement des quatre slots d'un job.

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

Les tests automatisés n'effectuent aucun accès réseau. Aucun test unitaire supplémentaire du téléchargement n'a été ajouté : le module main utilise directement `net.fetch`, SQLite et le système de fichiers, sans point d'injection existant ; un tel test nécessiterait une abstraction hors périmètre.

## Recette Electron

Non réalisée dans cet environnement. À vérifier manuellement : ouvrir `Web / Midjourney`, clic droit sur une image PNG, choisir l'action, constater le message de succès, vérifier le fichier dans le cache, l'affichage de la tuile et de la visionneuse, puis redémarrer l'application. Vérifier aussi le message d'erreur et le repli distant si le CDN ne répond pas.

## Limites et invariants

- Pas de téléchargement par job, automatique ou par lots ; pas de badge, explorateur, vidéo, import JSON ni nettoyage global.
- Aucun fichier média source de l'utilisateur n'est modifié : seule une copie PNG est écrite dans le cache applicatif dédié.
- Le téléchargement réel n'est jamais exécuté par les tests ; il est autorisé seulement à la suite de l'action explicite dans l'application.

## Suite recommandée

Recette Electron avec une image MJ disponible, puis considérer séparément le téléchargement des quatre slots, le badge local et l'ouverture dans l'explorateur.

Message de commit proposé : `feat: download selected Midjourney image locally`
