# Rapport - SQLite V0 : base locale et schema initial

## Objectif

Mettre en place une premiere base SQLite locale pour Iconotheque, preparer le schema applicatif initial et persister les metadonnees deja calculees cote main process, sans modifier les fichiers originaux.

## Fichiers crees

- `db/schema.sql`
- `reports/014_sqlite_v0_schema_and_persistence_report.md`

## Fichiers modifies

- `package.json`
- `package-lock.json`
- `electron/main.ts`
- `electron/preload.cts`
- `src/App.tsx`
- `src/components/InfoPanel.tsx`
- `src/components/StatusBar.tsx`
- `src/types.ts`
- `src/vite-env.d.ts`

## Dependances ajoutees

- `sql.js`

`better-sqlite3` a ete tente en premier, comme demande, puis retire. Le lancement Electron creait le dossier applicatif mais pas le fichier SQLite, signe d'un probleme d'initialisation native dans Electron. Pour cette V0, `sql.js` a ete retenu comme alternative SQLite sans module natif et sans serveur externe.

## Emplacement de la base

- Base creee dans le dossier applicatif Electron :
  `C:\Users\david\AppData\Roaming\Electron\Iconotheque\iconotheque.sqlite`
- Le chemin est derive de `app.getPath("userData")`, avec un sous-dossier `Iconotheque`.
- Aucune ecriture n'est faite dans les dossiers photo selectionnes.

## Schema cree

Le schema initial est dans `db/schema.sql`.

Tables creees :

- `app_meta`
- `roots`
- `folders`
- `images`
- `tags`
- `image_tags`

La version de schema est stockee dans `app_meta` avec `schema_version = 1`.

## Choix techniques

- Toute ecriture SQLite se fait cote Electron main process.
- Le renderer ne recoit qu'un statut DB minimal via `getDatabaseStatus()`.
- La base SQLite est chargee et sauvegardee explicitement par `sql.js`.
- Le fichier SQLite est exporte vers disque apres les ecritures.
- L'UI continue d'utiliser les resultats en memoire comme source d'affichage principale.
- Les donnees persistantes ajoutees sont uniquement des metadonnees applicatives :
  - racines ouvertes ;
  - dossiers scannes dans l'arborescence ;
  - images directes scannees dans le dossier actif.
- Aucune suppression d'anciennes entrees DB n'est faite dans cette mission.
- Le statut UI affiche maintenant `SQLite creee`, `SQLite erreur` ou `SQLite initialisation`.

## Fonctionnement ajoute

- Initialisation de la DB au demarrage Electron.
- Application du schema si necessaire.
- Enregistrement / mise a jour d'une racine dans `roots` a l'ouverture d'un dossier racine.
- Enregistrement / mise a jour des dossiers dans `folders` pendant la construction de l'arborescence.
- Enregistrement / mise a jour des images directes dans `images` pendant le scan non recursif du dossier actif.
- Mise a jour de `last_scanned_at` pour les racines et dossiers concernes.
- Affichage du statut SQLite dans la status bar.
- Affichage du statut SQLite dans le panneau droit quand aucune image n'est selectionnee.

## Commandes lancees

- `Get-Content C:\Users\david\.codex\attachments\9613fc60-ecc7-4b41-887f-d8c7f9ca3bd0\pasted-text.txt`
- `Get-Content README.md`
- `Get-Content reports/001_initial_electron_setup_report.md`
- `Get-Content reports/002_folder_selection_ipc_report.md`
- `Get-Content reports/002b_blank_window_fix_report.md`
- `Get-Content reports/003_non_recursive_image_scan_report.md`
- `Get-Content reports/003b_secure_local_image_protocol_report.md`
- `Get-Content reports/004_image_selection_info_panel_report.md`
- `Get-Content reports/005_resizable_columns_report.md`
- `Get-Content reports/005b_responsive_resizable_layout_report.md`
- `Get-Content reports/005c_preview_contain_and_column_ratios_report.md`
- `Get-Content reports/006_application_menu_open_folder_report.md`
- `Get-Content reports/007_status_bar_report.md`
- `Get-Content reports/008_rescan_current_folder_report.md`
- `Get-Content reports/009_keyboard_grid_navigation_report.md`
- `Get-Content reports/010_thumbnail_size_controls_report.md`
- `Get-Content reports/011_image_viewer_overlay_report.md`
- `Get-Content reports/012_viewer_polish_report.md`
- `Get-Content reports/013_recursive_folder_tree_navigation_report.md`
- `npm.cmd install better-sqlite3`
- `npm.cmd install sql.js`
- `npm.cmd uninstall better-sqlite3`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- Lancement temporaire Electron avec `npm.cmd start`
- Verification de `C:\Users\david\AppData\Roaming\Electron\Iconotheque\iconotheque.sqlite`
- Verification des tables et de `schema_version` via `sql.js`
- `rg "file://|pathToFileURL" electron src`
- `rg "better-sqlite3" package.json package-lock.json electron src db`
- `git diff --check`

## Verifications effectuees

- `npm.cmd run typecheck` : reussi.
- `npm.cmd run build` : reussi.
- Lancement Electron temporaire : stdout normal, stderr vide.
- La base `iconotheque.sqlite` est creee dans `userData\Iconotheque`.
- Verification SQLite via `sql.js` :
  - tables presentes : `app_meta`, `folders`, `image_tags`, `images`, `roots`, `tags` ;
  - `schema_version = 1`.
- Verification securite : aucune occurrence `file://` ni `pathToFileURL` dans `electron/` et `src/`.
- Verification dependances : aucune occurrence restante de `better-sqlite3`.
- `git diff --check` : pas d'erreur whitespace sur les changements ; avertissement CRLF existant sur `.gitignore`, hors mission.

## Points non traites

- Pas d'edition de tags.
- Pas de commentaires.
- Pas d'EXIF.
- Pas de miniatures physiques.
- Pas d'IA.
- Pas de recherche globale.
- Pas de preferences UI persistees.
- Pas de suppression ou nettoyage complexe en DB.
- Pas d'utilisation de la DB comme source d'affichage principale.
- La verification interactive avec ouverture manuelle d'un dossier racine et alimentation effective de `roots`, `folders` et `images` reste a confirmer dans Electron.

## Risques / limites

- `sql.js` sauvegarde explicitement le fichier SQLite apres ecriture ; c'est robuste pour cette V0, mais moins direct qu'un driver natif comme `better-sqlite3`.
- Pour de tres grands volumes, il faudra evaluer les performances et peut-etre revenir a un driver natif avec une etape de rebuild Electron maitrisee.
- Le fichier DB est local et applicatif, mais aucune strategie de migration avancee n'est encore en place.
- Les anciennes entrees DB ne sont pas supprimees dans cette mission, volontairement.
- `npm install` signale encore 1 vulnerabilite haute deja presente dans l'audit npm.

## Recommandations pour la suite

- Tester manuellement l'ouverture d'un dossier racine et verifier que `roots`, `folders` et `images` sont alimentes.
- Ajouter une petite commande interne de diagnostic DB si les futures missions doivent inspecter la persistance.
- Formaliser une strategie de migration avant le schema V2.
- Evaluer `better-sqlite3` avec rebuild Electron plus tard si les volumes rendent `sql.js` insuffisant.
