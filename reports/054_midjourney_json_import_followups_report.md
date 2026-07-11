# Mission 054 — Corrections post-import JSON MJ

## Cadre

- Racine : `J:\2026\Iconotheque`.
- Version : `0.1.3-dev.25` vers `0.1.3-dev.26`.
- Les modifications préexistantes du worktree sont préservées.

## Rafraîchissement après retrait

Cause vérifiée : `handleRemoveRemoteReferences` rechargeait `Web / Images par URL` et `Web / Midjourney`, mais pas l’état distinct `midjourneyVideoScan`. Une vidéo était bien retirée du catalogue, mais la vue `Web / Midjourney / Vidéos` restait sur son état renderer précédent.

Correction : le retrait recharge désormais en parallèle les sources générique, Midjourney image et Midjourney vidéo avant de réinitialiser sélection, compteur et contexte. La suppression reste limitée au catalogue local ; aucun média local ou distant n’est modifié.

## Copier le job ID

Le menu contextuel d’une référence Midjourney image ou vidéo affiche `Copier le job ID` quand `remoteProviderGroupId` est disponible. Le renderer transmet seulement l’identifiant interne de l’entrée ; le processus principal relit l’enregistrement, vérifie fournisseur et UUID, puis écrit le `provider_group_id` normalisé dans le presse-papier. Le slot et l’URL ne sont jamais copiés. L’action est masquée sans job fiable.

## Audit des images indisponibles issues du JSON

Lecture SQLite réalisée en lecture seule sur des entrées image importées : pour l’échantillon, `provider_id`, `provider_group_id`, `remote_slot` et `remote_url` concordent. Exemple de forme vérifiée :

`https://cdn.midjourney.com/<uuid>/0_0.png` à `0_3.png`.

Cette forme est exactement celle produite par `getMidjourneySlotUrl` et par l’import manuel image. Aucun défaut de reconstruction de job ID, slot, URL ou protocole n’a été constaté dans cet audit local. Cause probable des tuiles cassées : le JSON 052 ne contenait aucune URL PNG CDN observée pour ses 131 candidats image ; il autorise une reconstruction par UUID, mais ne garantit pas que chaque PNG reste réellement disponible au CDN. Aucune requête réseau volontaire n’a été effectuée, donc cette disponibilité externe n’est pas affirmée.

Pas de correction d’URL n’est appliquée : elle aurait divergé de la logique manuelle et ne serait pas justifiée par les données observées.

## Fichiers modifiés

- `electron/main.ts`
- `electron/preload.cts`
- `src/App.tsx`
- `src/types.ts`
- `src/vite-env.d.ts`
- `package.json`
- `package-lock.json`
- `CHANGELOG.md`
- `reports/054_midjourney_json_import_followups_report.md`

## Contrôles et recette

- `npm.cmd run typecheck` : réussi.
- `npm.cmd run test:remote-reference-removal` : réussi (4/4).
- `npm.cmd run build` : réussi.
- `git diff --check` : réussi.
- Recette Electron non réalisée dans cette exécution.

## Limites

- Aucun accès réseau ni validation de disponibilité CDN n’est lancé par l’audit ou l’import.
- Le résumé natif de l’import 053 n’est pas modifié : il est hors priorité.
- Les images JSON reconstruites mais indisponibles au CDN restent signalées par le fallback existant ; une mission ultérieure devra décider d’une politique de contrôle, réimport ou de présentation de ces candidats.

## Commit proposé

`fix: polish Midjourney JSON import follow-ups`
