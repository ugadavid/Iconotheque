# Mission 055 — Classification JSON Midjourney image/vidéo

## Résultat

Version `0.1.3-dev.27`. La classification conserve une règle de preuve : un job est vidéo seulement lorsque le JSON fournit ses quatre MP4 Midjourney cohérents (`kind: video`, `extension: mp4`, slots `0` à `3`, UUID identique). Les autres UUID sans cette preuve restent des candidats image ; aucun signal local ne permet de les transformer de façon fiable en vidéo.

Le fixture contient donc toujours 131 candidats image et 5 jobs vidéo prouvés. Le constat utilisateur corrige le rapport 054 : une tuile PNG cassée peut effectivement correspondre à un job vidéo mal classé ; l’indisponibilité CDN ne doit pas être déduite sans vérifier sa classification.

## Réparation sûre

Lors d’une réimportation, chaque job vidéo prouvé recherche les références Midjourney image du même `provider_group_id`. Les slots PNG erronés sont retirés du catalogue puis les quatre MP4 sont créés ou réutilisés. La réparation est refusée pour un job dont les images portent des collections, métadonnées, termes ou tags utilisateur : elles sont préservées et le résumé signale le job non réparé. Aucun fichier local ou distant n’est touché.

## Limites

Le JSON ne fournit aucune preuve locale pour d’éventuels autres jobs vidéo sans MP4. Ils ne peuvent pas être réparés automatiquement sans risque. Aucun accès réseau ni génération de vignette n’est réalisé.

## Contrôles

- `npm.cmd run typecheck` : réussi.
- `npm.cmd run test:remote-reference-removal` : réussi (4/4).
- `npm.cmd run build` : réussi.
- `git diff --check` : réussi.
- Recette Electron non réalisée.

## Commit proposé

`fix: classify Midjourney JSON video jobs correctly`
