# Mission 053 — Import JSON Midjourney observations

## Cadre

- Racine : `J:\2026\Iconotheque`.
- Version : `0.1.3-dev.24` vers `0.1.3-dev.25`.
- Le worktree préexistant a été préservé.

## Résultat

L’action `Fichier > Importer observations Midjourney JSON...` ouvre un sélecteur de fichier JSON, lit le fichier localement dans le processus principal, puis affiche un résumé natif. Le renderer est seulement notifié après succès pour rafraîchir les bibliothèques `Web / Midjourney` et `Web / Midjourney / Vidéos`.

Le parseur vérifie la présence de `jobs`, valide chaque UUID, déduplique les job IDs et classe :

- **vidéo** : une observation vidéo contenant exactement les quatre MP4 Midjourney valides des slots `0` à `3` ; 
- **image** : un UUID valide qui n’est pas classé vidéo et ne contient aucune entrée CDN inattendue ; les quatre PNG sont reconstruits par la logique manuelle existante ;
- **ignoré** : UUID invalide, observation vidéo partielle/incohérente, URL/extension/type inattendu ou structure d’entrée non exploitable.

L’import réutilise `createOrReuseMidjourneyJob` et `createOrReuseMidjourneyVideoJob`. Ces fonctions existantes produisent les URLs et slots attendus puis dédupliquent avec `remote_url`. Aucune logique de téléchargement, de validation réseau, de vignette vidéo, de prompt ou de vidéo Web générique n’est ajoutée.

## Résultat attendu sur le fixture audité

`tests/iconotheque-midjourney-observations.json` contient 136 jobs uniques : 131 images reconstruites, 5 vidéos confirmées et 0 entrée ignorée. L’import peut donc créer au plus 544 références distantes, moins celles déjà présentes.

## Fichiers modifiés

- `electron/main.ts`
- `electron/preload.cts`
- `src/App.tsx`
- `src/vite-env.d.ts`
- `package.json`
- `package-lock.json`
- `CHANGELOG.md`
- `README.md`
- `reports/053_midjourney_observations_json_import_report.md`

## Contrôles

- `npm.cmd run typecheck` : réussi.
- `npm.cmd run build` : réussi.
- `git diff --check` : réussi.
- Aucun test spécialisé n’a été ajouté : le parseur est intégré au processus principal afin de réutiliser sans duplication les primitives d’import existantes. Le fixture et ses comptages ont été validés lors de l’audit 052 par lecture locale, sans réseau.

## Recette Electron

Non réalisée dans cette exécution. À vérifier : sélectionner le fixture depuis l’action Fichier, contrôler le résumé `136 / 131 / 5`, les compteurs des deux sources, un job dans chacune des vues Images/Jobs et l’absence de génération automatique de vignette.

## Limites et invariants

- Seuls les JSON d’observations respectant la structure auditée sont pris en charge.
- Les dates d’observation ne sont ni importées ni utilisées.
- Les fichiers médias utilisateur, les originaux et le fichier JSON choisi ne sont jamais modifiés.
- La disponibilité réelle des URLs distantes n’est pas testée et aucun accès réseau volontaire n’est effectué.

## Commit proposé

`feat: import Midjourney observations JSON`
