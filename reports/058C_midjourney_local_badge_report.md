# Mission 058C — Badge Local pour images MJ téléchargées

## Résultat

- Racine vérifiée : `J:\2026\Iconotheque`.
- Version avant/après : `0.1.3-dev.28`.
- Les images Midjourney effectivement servies depuis une copie locale affichent désormais le badge discret **Local**.

## Information propagée

- `toRemoteImageFile` calcule `usesLocalCopy` à partir de l'URL de preview locale réellement obtenue.
- Cette valeur vaut `true` uniquement quand la référence est une image MJ, que son état et sa clé locale sont valides, que le fichier existe, et que la preview locale peut être créée.
- Si le fichier est absent ou si la preview locale ne peut pas être résolue, `imageSrc` et `usesLocalCopy` reviennent simultanément au chemin distant : aucun faux badge n'est affiché.

## Interface

- Vue plate : badge `Local` en haut à gauche de la preview, sans masquer le badge source/slot MJ ni la sélection.
- Vue Jobs : badge `Local` en haut à droite de chaque slot concerné, tandis que le badge de slot reste en bas à gauche.
- Les vidéos et les entrées utilisant le fallback distant n'affichent jamais ce badge.

### Correctif 058C-2

La vue Jobs appliquait au badge `Local` le sélecteur générique `.midjourney-slot > span`, qui fixe `left` et `bottom`. Combinées avec ses règles `top` et `right`, ces quatre coordonnées étiraient la boîte absolue sur la tuile et créaient le grand rond observé.

Le sélecteur spécialisé `.midjourney-slot > .midjourney-local-copy-badge` rétablit explicitement `left: auto` et `bottom: auto`. Les badges Local, MJ/slot et de la vue Images utilisent désormais le même fond vert bleuté opaque `#216c65`, avec texte blanc, hauteur compacte et capitales.

### Correctif 058C-3

La vue Images utilise les classes `.image-source-badge` et `.image-local-copy-badge`, distinctes des spans de slots Jobs. La règle plus tardive et plus spécifique `.image-tile span` écrasait leur couleur blanche par `#526068` et leur taille par `12px`, d'où la faible lisibilité qui subsistait après 058C-2.

Les sélecteurs `.image-preview > .image-source-badge` et `.image-preview > .image-local-copy-badge` restaurent en fin de cascade le texte blanc, le fond `#216c65`, la taille compacte `10px` et les propriétés de troncature adaptées. La vue Jobs n'est pas modifiée.

## Fichiers

- Modifiés : `electron/main.ts`, `electron/preload.cts`, `src/types.ts`, `src/components/ImageGrid.tsx`, `src/styles/app.css`, `CHANGELOG.md`.
- Créé : ce rapport.

## Validations

- `npm.cmd run typecheck` : succès.
- `npm.cmd run build` : succès.
- `git diff --check` : succès.

Après le correctif 058C-2, ces trois contrôles ont été réexécutés avec succès.

Après le correctif 058C-3 de la vue Images, ils ont de nouveau été réexécutés avec succès.

Aucun test spécialisé n'a été ajouté : l'indicateur est une projection directe du chemin de preview déjà couvert par la logique de priorité locale. Aucun accès réseau n'est déclenché.

## Recette Electron

Non réalisée dans cet environnement. À vérifier : télécharger une image MJ, constater le badge en vue plate ; télécharger les quatre images d'un job et constater les quatre badges en vue Jobs ; vérifier l'absence de badge sur une image non téléchargée et dans la bibliothèque vidéo.

La recette CSS 058C-2 n'a pas été réalisée ici : elle doit confirmer le texte blanc lisible des badges `Local` et MJ/slot, ainsi que le format compact du badge Local dans les slots Jobs.

La recette CSS 058C-3 n'a pas été réalisée ici : elle doit confirmer en vue Images la lisibilité des badges `Local` et `MJ 0_0` à `MJ 0_3`, puis l'absence de régression en vue Jobs.

## Limites et sécurité

- Pas d'explorateur, nouveau téléchargement, automatisation, traitement vidéo ou import JSON.
- Aucun fichier source utilisateur n'est modifié ; le badge reflète seulement une copie dans le cache applicatif MJ.

Message de commit proposé : `feat: show local badge for downloaded Midjourney images`
