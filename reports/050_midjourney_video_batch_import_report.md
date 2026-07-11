# Rapport 050 — Import batch de jobs Midjourney vidéo

- Racine vérifiée : `J:\2026\Iconotheque`.
- Version : `0.1.3-dev.22` vers `0.1.3-dev.23`.

## Résultat

L’action Fichier « Ajouter plusieurs jobs MJ video... » ouvre une modale acceptant un job ID Midjourney par ligne. Les IDs sont normalisés en minuscules, dédupliqués, puis chaque job crée ou réutilise les quatre références MP4 `0`, `1`, `2`, `3` avec `source_kind = remote`, fournisseur Midjourney et `media_kind = video`.

Le flux réutilise la source virtuelle vidéos, séparée des images Midjourney, ainsi que les vues plate et Jobs existantes. Aucun import JSON, support vidéo Web générique, vignette locale ou modification du protocole MP4 n’a été ajouté.

## Fichiers modifiés

- `electron/main.ts`
- `electron/preload.cts`
- `src/App.tsx`
- `src/vite-env.d.ts`
- `package.json`
- `package-lock.json`
- `CHANGELOG.md`

## Validations

- `npm.cmd run typecheck` : réussi.
- `npm.cmd run build` : réussi.
- `git diff --check` : réussi.

## Limites

Aucune recette Electron ni accès réseau n’a été effectué. Les vidéos restent limitées aux jobs Midjourney ; les imports JSON et les vignettes locales restent hors périmètre.

Message de commit proposé : `feat: add batch import for Midjourney video jobs`
