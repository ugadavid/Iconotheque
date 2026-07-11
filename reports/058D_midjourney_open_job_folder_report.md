# Mission 058D — Ouvrir le dossier local d'un job MJ

## Résultat

- Racine vérifiée : `J:\2026\Iconotheque`.
- Version avant/après : `0.1.3-dev.28`.
- Le menu contextuel des images Midjourney et des cartes Jobs image propose **Ouvrir le dossier du job MJ...**.

## Comportement

- L'action est visible pour une image MJ ou un contexte de job MJ image, en vue Images comme en vue Jobs. Elle est absente pour les vidéos, images Web génériques et images locales.
- Le renderer transmet uniquement le `jobId` déjà associé à la référence ; le main process revalide l'UUID et résout le dossier avec le helper de chemin MJ.
- Le dossier ciblé est `userData/Iconotheque/midjourney-images/<jobId>/`.
- S'il est absent, seul ce dossier de cache applicatif est créé. Aucun téléchargement, aucune écriture en base et aucun fichier média utilisateur ne sont modifiés.
- Le main process ouvre ensuite ce chemin avec `shell.openPath`; une erreur est renvoyée et affichée au renderer si l'ouverture échoue.

## Fichiers

- Modifiés : `electron/midjourney-local-image-path.ts`, `electron/main.ts`, `electron/preload.cts`, `src/App.tsx`, `src/types.ts`, `src/vite-env.d.ts`, `tests/midjourney-local-image-path.test.mjs`, `CHANGELOG.md`.
- Créé : ce rapport.

## Validations

- `npm.cmd run typecheck` : succès.
- `npm.cmd run test:midjourney-local-image-path` : succès (3 tests), dont la résolution/refus du dossier de job.
- `npm.cmd run build` : succès.
- `git diff --check` : succès.

La recette automatisée n'appelle pas `shell.openPath` et n'ouvre donc pas l'Explorateur Windows.

## Recette Electron

Non réalisée dans cet environnement. À vérifier : clic droit sur une image MJ, puis sur une carte ou un slot en vue Jobs, choix de l'action et ouverture du bon dossier. Vérifier également l'absence de l'action dans `Web / Midjourney / Videos`.

## Limites

- Pas de téléchargement, modification DB, vidéo, import JSON ou refonte de menu.
- L'action ouvre le dossier de cache du job, même avant téléchargement, afin de permettre d'accéder à son emplacement stable.

Message de commit proposé : `feat: open Midjourney job folder from context menu`
