# Mission 055 — Import JSON MJ des vidéos non qualifiées

## Résultat

Version `0.1.3-dev.27`. La conclusion de 054 est corrigée : les tuiles concernées n’étaient pas des PNG CDN indisponibles, mais des jobs vidéo non qualifiés par le JSON et donc reconstruits à tort comme images.

## Règle corrigée

Un job est importé comme vidéo Midjourney si `observedKinds` contient `video`, si ses `cdnUrls` contiennent une trace MP4 vidéo, ou si son UUID appartient à la liste humaine validée :

- `df8275e1-0bd6-4453-8fbe-957f9bdac58b`
- `5fdd4b78-5313-4fd4-9cfb-075a4d28e7ba`
- `68c08ca1-4c37-4ff0-a75f-5b15f154c946`
- `211acffc-f737-43d2-b6d4-1a10fa36e5f5`
- `ecfeb317-afaf-43ae-80ee-0c089c0c82a8`
- `863ddcf5-2245-484f-8eb2-fad3f1c00f07`

Les jobs vidéo utilisent les slots MP4 `0`–`3` et la source `Web / Midjourney / Vidéos`. Les autres UUID exploitables utilisent les PNG `0_0`–`0_3` dans `Web / Midjourney`.

## Comptage attendu

- 5 jobs vidéo explicitement observés dans le JSON ;
- 6 jobs vidéo non qualifiés ajoutés par règle validée ;
- **11 jobs vidéo** / **44 MP4** ;
- **125 jobs image** / **500 PNG** ;
- 544 références théoriques au total avant déduplication.

## Réparation appliquée

À chaque réimportation, les références image Midjourney du même `provider_group_id` que les 11 jobs vidéo sont retirées du catalogue local puis les MP4 corrects sont créés ou réutilisés. Les données de développement sont déclarées jetables ; aucune conservation spéciale de métadonnées de test n’est appliquée. Aucun fichier local, média original, fichier JSON ou ressource distante n’est modifié.

## Contrôles

- `npm.cmd run typecheck` : réussi.
- `npm.cmd run test:remote-reference-removal` : réussi (4/4).
- `npm.cmd run build` : réussi.
- `git diff --check` : réussi.
- Recette Electron non réalisée.

## Limites

La liste des six UUID est une décision de classification explicite, pas une déduction universelle du JSON. Tout futur job vidéo sans trace MP4 devra être ajouté à une source de vérité comparable ou au format d’observations.

## Commit proposé

`fix: classify unmarked Midjourney video jobs from JSON`
