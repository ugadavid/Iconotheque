# Rapports de mission

Ce dossier contient actuellement **55 rapports Markdown** du cœur d’Iconothèque : les **54** rapports qui existaient avant la mission 046, plus son rapport. Ils sont des traces historiques de missions ; ils ne remplacent ni le [README](../README.md), ni le [changelog](../CHANGELOG.md), ni le code.

Le companion Chrome Midjourney conserve séparément **3 rapports** (`C001` à `C003`) dans [`companions/mj-collector`](../companions/mj-collector/). Ils concernent le companion, pas le cœur Electron.

## Retrouver les grandes phases

- `001` à `020` : construction du prototype local et gel V0.1.
- `021` à `025` : stabilisation, préparation de distribution et convention de versionnage.
- `026` à `038` : cadrage puis sources Web, modèle local/distant et imports Midjourney.
- `039` à `045` : collections virtuelles, interactions de collection, glisser-déposer, vue Midjourney groupée et polish des retours d’import.
- Les suffixes `b` et `c` désignent des rapports complémentaires dans une même séquence ; ils expliquent pourquoi le dossier contient plus de fichiers que de numéros de mission principaux.

La mission `046` ajoute la canonicalisation documentaire et son rapport associé.

## Nature des vérifications

Un rapport peut citer une inspection de code, un typecheck, un build ou une recette manuelle. La présence du code, un typecheck ou un build ne valent pas recette interactive Electron. Les contrôles automatisés et les vérifications manuelles doivent être lus comme deux catégories distinctes, à partir du rapport concerné.

Pour l’état courant, consulter d’abord le [README](../README.md), puis `package.json` pour la version technique et le code pour le comportement effectif.
