# Rapport 046 — Canonicalisation documentaire

## Cadre vérifié

- Racine active : `J:\2026\Iconotheque`.
- Version avant mission : `0.1.3-dev.19`.
- Version après mission : `0.1.3-dev.20`.
- Dernière version stable documentée : `0.1.2`.
- Schéma courant constaté dans `electron/main.ts` : `7`.

## Résultat

Le README devient la porte d’entrée de l’état fonctionnel courant. L’aide intégrée reflète les fonctions locales, Web, Midjourney et les collections virtuelles, tout en rappelant les invariants non destructifs et les limites des sources externes. Les documents de gel et de roadmap sont explicitement requalifiés comme historiques.

L’aide affiche la version technique par import de `package.json` dans le bundle renderer. Cette solution s’appuie sur `resolveJsonModule`, déjà configuré dans TypeScript, et ne nécessite ni IPC, ni preload, ni dépendance.

## Fichiers créés

- `docs/ARCHITECTURE.md`
- `reports/README.md`
- `reports/046_documentation_canonicalization_report.md`

## Fichiers modifiés

- `README.md`
- `src/components/HelpPanel.tsx`
- `docs/DEMO_FREEZE_V0.1.md`
- `ROADMAP_REMOTE_SOURCES_V0.1.3.md`
- `docs/VERSIONING.md`
- `package.json`
- `package-lock.json`
- `CHANGELOG.md`

## Décisions documentaires appliquées

- `package.json` est rappelé comme source canonique de la version technique ; le README distingue version de travail et stable.
- Le schéma 3 est laissé dans les documents du gel historique ; l’architecture indique le schéma courant 7.
- Le README, le changelog, l’architecture et les rapports reçoivent des rôles distincts.
- La roadmap contient une matrice réalisée / partiellement réalisée / restant, reconstruite à partir du code, du changelog et des rapports.
- L’identité de catalogue est clarifiée : elle repose sur `images.id`, alors qu’une image locale demeure dépendante de son chemin source.

## Index des rapports

L’audit préalable a relevé 54 rapports numérotés du cœur Iconothèque (`001` à `045`, avec rapports complémentaires suffixés `b` ou `c`) avant la création de ce rapport. Après inclusion de `046_documentation_canonicalization_report.md`, le total courant du cœur est de 55 rapports. Le companion Midjourney conserve séparément 3 rapports (`C001` à `C003`). L’index regroupe les phases `001–020`, `021–025`, `026–038` et `039–045` sans présenter les rapports comme l’état courant.

## Vérifications effectuées

- Cohérence de version confirmée entre `package.json`, le package racine de `package-lock.json`, le changelog, le README et l’import dynamique de l’aide.
- Recherche documentaire effectuée pour les anciennes références à V0.1.0, `0.1.3-dev.19`, schéma 3 et identité par chemin ; les occurrences historiques légitimes sont conservées dans leur contexte.
- `npm.cmd run typecheck` : réussi.
- `npm.cmd run build` : réussi.

## Vérifications non effectuées

- Aucune recette interactive Electron consolidée.
- Aucun lancement de migration, aucun accès ni changement de base utilisateur.
- Aucun test réseau, aucun packaging et aucune installation de dépendance.

## Périmètre confirmé

Cette mission ne modifie ni la base utilisateur, ni `db/schema.sql`, ni les migrations, IPC, preload, réseau, logique d’import, protocole distant, collections ou logique métier. Les fichiers originaux et les rapports historiques existants n’ont pas été modifiés.

## Limites et suite recommandée

Les migrations anciennes, le protocole réseau, le cache, l’archivage et le packaging restent des sujets à auditer ou réaliser. La prochaine mission recommandée est une recette fonctionnelle consolidée des nouveautés récentes.

## Message de commit proposé

`docs: canonicalize current project documentation`
