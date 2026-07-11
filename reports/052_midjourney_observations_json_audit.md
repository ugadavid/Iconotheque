# Mission 052 — Audit du JSON Midjourney observations

## Cadre

- Racine vérifiée : `J:\2026\Iconotheque`.
- Version projet constatée : `0.1.3-dev.24`.
- Fichier audité en lecture seule : `tests/iconotheque-midjourney-observations.json` (89 159 octets).
- Aucun import, accès réseau, écriture SQLite, migration, modification d’interface ou génération de vignette n’a été réalisé.

## Résumé exécutif

Le JSON est un export d’observations du companion, pas un inventaire média complet. Il contient **136 entrées de jobs** Midjourney, toutes identifiées par un UUID valide et sans doublon. Il démontre de façon fiable **5 jobs vidéo** : leurs **20 URL MP4** sont toutes conformes au format déjà pris en charge et couvrent les slots `0`, `1`, `2`, `3` de chaque job.

Les **131 autres jobs** n’ont ni URL CDN ni type observé. Ils sont des **candidats image importables par reconstruction à partir du job ID**, car le cœur sait déjà former les quatre URL PNG `0_0` à `0_3`, mais le fichier ne prouve pas que ces images ont été effectivement observées ni qu’elles sont encore disponibles. Ils ne doivent donc pas être présentés comme des images explicitement trouvées dans l’export.

La mission suivante peut importer ce format sans nouveau modèle de données : elle doit valider et dédupliquer les jobs, déléguer la création aux fonctions existantes, et présenter séparément les cas vidéo observés, image reconstruits et entrées ignorées ou ambiguës.

## Structure observée

Racine :

| Champ | Type constaté | Interprétation probable |
| --- | --- | --- |
| `exportedAt` | ISO 8601 | instant de production de l’export |
| `source` | chaîne | producteur : `iconotheque-mj-collector` |
| `version` | chaîne | version de format : `0.2.0` |
| `jobs` | tableau | agrégation d’observations par job |

Chaque élément de `jobs` contient :

| Champ | Type constaté | Usage futur possible |
| --- | --- | --- |
| `jobId` | UUID | identité stable du job, `provider_id` et `provider_group_id` |
| `firstSeenAt`, `lastSeenAt` | ISO 8601 | provenance/diagnostic uniquement ; ne pas les traiter comme une chronologie fiable sans normalisation |
| `seenCount` | entier | indicateur d’observation, pas une quantité de médias |
| `jobPageUrls` | tableau d’URL Midjourney | trace de provenance et contrôle optionnel du job/index |
| `cdnUrls` | tableau d’objets | médias réellement observés, lorsqu’il existe |
| `observedKinds` | tableau de chaînes | synthèse de types observés ; utile comme contrôle secondaire |

Chaque objet de `cdnUrls` comporte `url`, `kind`, `extension`, `firstSeenAt`, `lastSeenAt`.

## Comptage et typologie vérifiés

| Catégorie | Nombre | Conclusion |
| --- | ---: | --- |
| Entrées `jobs` | 136 | 136 `jobId` uniques et syntaxiquement valides |
| Jobs vidéo confirmés | 5 | `observedKinds = ["video"]`, 4 MP4 valides par job |
| Références vidéo MP4 | 20 | 20 uniques, slots `0`–`3` complets pour les 5 jobs |
| Candidats image | 131 | sans CDN et sans type observé ; import PNG reconstructible mais non attesté par le JSON |
| Jobs sans `jobPageUrls` | 2 | exploitables via `jobId`, mais provenance réduite |
| Entrées média invalides | 0 | aucune URL CDN inattendue dans cet échantillon |
| Images CDN explicitement observées | 0 | aucune URL PNG dans le fichier |

Les 536 URL de page de job présentes sont toutes de la forme `https://www.midjourney.com/jobs/<jobId>?index=<0..3>`. 134 jobs en ont quatre ; deux n’en ont aucune. Les 20 URL vidéo sont toutes de la forme attendue : `https://cdn.midjourney.com/video/<jobId>/<0..3>.mp4`.

## Règles de déduction recommandées

1. Refuser un `jobId` qui n’est pas un UUID Midjourney attendu ; normaliser en minuscules.
2. Pour une entrée contenant des `cdnUrls`, accepter une vidéo uniquement si chaque objet a `kind = "video"`, `extension = "mp4"`, une URL HTTPS `cdn.midjourney.com/video/<jobId>/<slot>.mp4`, et un slot dans `0`–`3` concordant avec le `jobId` parent.
3. Ne qualifier un job de vidéo que si les quatre slots uniques sont présents. Un sous-ensemble doit être signalé comme job vidéo partiel et nécessite une décision explicite : ignorer, ou reconstruire les slots manquants selon les règles déjà utilisées par l’import manuel.
4. Pour un job sans média CDN vidéo, classer `image_candidate`. L’import futur peut réutiliser `createOrReuseMidjourneyJob(jobId)` et reconstruire les PNG `https://cdn.midjourney.com/<jobId>/0_0.png` à `0_3.png`.
5. Toute URL CDN inconnue, extension/type incohérent, mélange image/vidéo, slot hors plage ou UUID divergent doit être ignoré avec un motif explicite, sans repli vers un import Web générique.
6. `jobPageUrls` ne sont pas une source média : elles servent seulement de contrôle de cohérence et de provenance. L’absence de ces URL ne doit pas interdire le job si son UUID est valide.

## Comparaison avec les imports manuels existants

Le cœur accepte déjà un UUID seul pour les jobs image ou vidéo, construit les quatre slots image `0_0`–`0_3` et les quatre slots vidéo `0`–`3`, et déduplique par URL distante. Les MP4 constatés correspondent exactement à `validateMidjourneyVideoUrl` et `getMidjourneyVideoSlotUrl`.

Les images du JSON ne correspondent pas à une URL image réellement fournie : l’import futur devra donc prendre une décision de politique claire, celle proposée ici étant la reconstruction à partir de l’UUID avec une mention « job image reconstruit depuis observation », plutôt que de prétendre importer une URL PNG observée.

## Métadonnées et limites

Métadonnées utiles à conserver ultérieurement, si le modèle de données l’autorise : `jobId`, type média déduit, URL observées, slots observés, `exportedAt`, `seenCount`, dates d’observation et éventuellement une indication de provenance du fichier. Le JSON ne contient **ni prompt, ni paramètres de génération, ni dimensions, ni statut de job, ni auteur** : ces informations ne peuvent pas être importées.

Sur 121 jobs, `firstSeenAt` est postérieur à `lastSeenAt`. Les libellés ne doivent donc pas être interprétés comme une relation chronologique fiable ; au besoin, conserver les deux valeurs brutes ou utiliser `min`/`max` seulement pour l’affichage.

## Risques et validations à imposer

- Déduplication : le fichier ne contient pas de doublon de job ni de CDN, mais la base peut déjà contenir les mêmes URL ; réutiliser la déduplication existante par `remote_url`.
- Jobs partiels : l’échantillon vidéo est complet, mais le futur parseur doit détecter les slots manquants et les doublons.
- Images ambiguës : 131 entrées sans URL CDN ne prouvent pas l’existence actuelle des PNG ; prévoir un compteur et un libellé distincts.
- Vidéos confondues : ne pas déduire une vidéo seulement depuis l’UUID ; exiger le format MP4/slot ou la décision explicite de reconstruire un job vidéo.
- Champs instables : vérifier strictement `source`, `version`, la forme du tableau et les types avant toute lecture ; ignorer les champs inconnus.
- Pas d’accès réseau pendant le parsing ni les tests. La disponibilité réelle des URLs reste une question séparée.

## Stratégie d’import proposée

1. Lecture/validation pure et locale du format, produisant trois listes : `videoConfirmed`, `imageCandidates`, `ignored` avec raisons.
2. Écran de prévisualisation : compteurs, avertissements de jobs partiels et choix explicite d’inclure les candidats image reconstruits.
3. Import main process transactionnel par job, en appelant les primitives Midjourney existantes : vidéos confirmées vers les quatre MP4 ; images retenues vers les quatre PNG reconstruits.
4. Résumé structuré : créés, déjà existants, ignorés, partiels et erreurs. Aucun appel réseau de validation n’est nécessaire.

## Découpage conseillé pour la mission d’implémentation

1. Parseur typé, validation et tests unitaires avec ce JSON et des variantes invalides, sans UI ni SQLite utilisateur.
2. IPC main process et import transactionnel, réutilisant les fonctions de jobs existantes ; tests sur base isolée.
3. Modale de sélection/prévisualisation et messages de résultat, sans génération automatique de vignettes.

## Méthode de lecture et de comptage

- `Get-Item tests\iconotheque-midjourney-observations.json` puis `Get-Content ... -TotalCount 120` pour l’en-tête et un échantillon.
- Script local `node -e` avec `JSON.parse` pour compter les jobs, champs, UUID, URL, types, extensions et slots ; aucune écriture ni requête réseau.
- `rg` et lecture de `electron/main.ts` pour comparer les formats au validateur et aux constructeurs d’URL manuels existants.

## Validations réalisées et non réalisées

L’audit de structure, de cardinalité et de conformité syntaxique des URL a été réalisé localement. Aucun build, typecheck ou test applicatif n’est requis : aucun fichier de code n’a été modifié. Aucune recette Electron, import, migration, écriture DB ou requête réseau n’a été exécuté.

## Invariants et suite

Le JSON et les fichiers utilisateur n’ont pas été modifiés. La mission ne touche pas au catalogue ni aux médias originaux ou distants. La prochaine étape recommandée est le parseur pur et testé décrit ci-dessus.

## Commit proposé

`docs: audit Midjourney observations JSON`
