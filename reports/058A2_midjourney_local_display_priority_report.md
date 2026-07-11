# Mission 058A-2 — Affichage local prioritaire MJ

## Résultat

La priorité locale est branchée dans `electron/main.ts`, dans `toRemoteImageFile`. Pour une entrée `remote_images` Midjourney image, le main vérifie :

1. `local_copy_status = 'downloaded'` ;
2. une `local_copy_key` présente ;
3. une clé valide résolue par `resolveMidjourneyLocalImagePath` sous `userData/Iconotheque/midjourney-images` ;
4. l’existence physique du PNG.

Si ces conditions sont réunies, `imageSrc` et `previewUrl` utilisent une URL locale contrôlée via le registre d’aperçus existant. La grille et la visionneuse consomment déjà `imageSrc`, donc elles reçoivent cette priorité sans changement renderer. Sinon elles gardent `iconotheque-image://remote/<imageId>` et l’affichage distant existant.

## Fichiers modifiés

- `electron/main.ts`
- `reports/058A2_midjourney_local_display_priority_report.md`

## Contrôles

- `npm.cmd run typecheck` : réussi.
- `git diff --check` : réussi.
- Aucun test additionnel : le test 058A-0 couvre la validation/résolution de clé ; la présence physique dépend du registre main et n’est pas injectable sans élargir cette tranche.
- Build non exécuté : aucun code renderer/bundle n’est modifié.

## Hors périmètre

Aucun téléchargement, IPC, menu contextuel, badge, Explorateur, import JSON, mutation DB durant l’affichage, protocole dédié ou vidéo n’a été ajouté.

## Commit proposé

`chore: prefer local Midjourney image copies when present`
