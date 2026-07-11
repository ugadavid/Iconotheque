# Mission 058A-0 — Utilitaire de chemins locaux MJ

## Résultat

- Fichier créé : `electron/midjourney-local-image-path.ts`.
- `getMidjourneyLocalImageKey(jobId, slot)` valide un UUID et un slot `0` à `3`, puis retourne exactement `<jobId>/<jobId>_<slot>.png` en minuscules.
- `resolveMidjourneyLocalImagePath(rootDirectory, localCopyKey)` n’accepte que cette forme de clé et la résout sous le dossier racine fourni ; les traversées de chemin sont refusées.

La configuration Electron compile explicitement ce module et un test Node couvre la construction, les validations et la résolution sûre.

## Portée et limites

Aucune DB, migration, IPC, téléchargement, affichage, vidéo ou version n’a été ajouté. Le résidu incomplet `localCopyStatus`/`localCopyKey` dans le type main a été retiré : il n’était ni stocké ni résolu et empêchait le typecheck.

## Contrôles

- `npm.cmd run typecheck` : réussi.
- `npm.cmd run test:midjourney-local-image-path` : réussi (2/2).
- `git diff --check` : réussi.
- Build non exécuté conformément au périmètre minimal ; le module Electron est néanmoins compilé par le test spécialisé.

## Commit proposé

`chore: add Midjourney local image path helper`
