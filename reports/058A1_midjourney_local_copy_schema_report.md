# Mission 058A-1 — Migration DB pour copie locale MJ

## Résultat

- Version ouverte : `0.1.3-dev.28`.
- Schéma : passage de 9 à **10**.
- Table : `remote_images` reçoit `local_copy_status` et `local_copy_key`.
- Valeur par défaut : `local_copy_status = 'missing'`; les valeurs admises sont `missing`, `downloaded`, `failed`.
- `local_copy_key` est nullable et est destiné à recevoir la clé relative validée par l’utilitaire 058A-0, par exemple `<jobId>/<jobId>_0.png`.

La migration vérifie l’existence de chaque colonne avant `ALTER TABLE`, puis normalise les valeurs nulles ou vides vers `missing`. Elle est donc idempotente sur les bases existantes et les nouvelles bases reçoivent les colonnes directement par `db/schema.sql`.

## Fichiers modifiés

- `db/schema.sql`
- `electron/main.ts`
- `package.json`
- `package-lock.json`
- `CHANGELOG.md`
- `reports/058A1_midjourney_local_copy_schema_report.md`

## Contrôles

- `npm.cmd run typecheck` : réussi.
- `git diff --check` : réussi.
- Aucun test SQLite isolé ajouté : le projet n’expose pas de point de migration indépendant du démarrage main. Les contrôles de colonnes et la normalisation suivent le mécanisme de migration idempotent existant.
- Build non exécuté : cette tranche ne modifie aucun rendu ni bundle renderer.

## Hors périmètre confirmé

Aucun téléchargement, IPC, action contextuelle, grille, visionneuse, protocole image, vidéo ou import JSON n’a été modifié.

## Commit proposé

`chore: add schema for Midjourney local image copies`
