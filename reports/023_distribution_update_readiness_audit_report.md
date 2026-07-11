# Rapport - Audit preparatoire distribution et mises a jour futures

## Resume de la mission

Audit de l'architecture actuelle d'Iconotheque v0.1.0 pour verifier qu'elle ne bloque pas une future distribution ni une future strategie de mises a jour.

Aucune fonctionnalite n'a ete ajoutee. Aucun packaging, auto-update, systeme de migration ou changement de modele de donnees n'a ete mis en place.

## Fichiers verifies

- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `tsconfig.json`
- `electron/tsconfig.json`
- `electron/main.ts`
- `electron/preload.cts`
- `src/App.tsx`
- `src/vite-env.d.ts`
- `src/types.ts`
- `src/components/InfoPanel.tsx`
- `src/components/StatusBar.tsx`
- `db/schema.sql`
- `CHANGELOG.md`
- `docs/DEMO_FREEZE_V0.1.md`
- `reports/022_v0.1.0_manual_recipe_and_menu_edit_report.md`

## Verifications effectuees

- Recherche des chemins absolus et references a l'environnement de developpement.
- Verification de l'emplacement de la base SQLite.
- Verification des ecritures disque.
- Verification des caches et miniatures physiques.
- Verification des scripts `typecheck`, `build`, `start`, `dev:renderer`, `dev:electron`.
- Relecture de la separation Electron main / preload / renderer.
- Verification de `contextIsolation` et `nodeIntegration`.
- Verification des canaux IPC.
- Verification du protocole `iconotheque-image://`.
- Verification de l'absence de `file://` et `pathToFileURL`.
- Verification du versionnage `0.1.0`.
- Verification du schema SQLite et de la version de schema.
- `npm.cmd run typecheck`.
- `npm.cmd run build`.
- Lancement court Electron avec `npm.cmd start`.
- Arret des processus Electron de test.

## Constats

### Separation code / donnees utilisateur

- La base SQLite est stockee dans `app.getPath("userData")`, sous `Iconotheque/iconotheque.sqlite`.
- Sur l'environnement actuel, le chemin documente est :
  `C:\Users\david\AppData\Roaming\Electron\Iconotheque\iconotheque.sqlite`.
- Les metadonnees utilisateur sont stockees dans cette base locale.
- Les images originales restent dans leurs dossiers source.
- Aucun cache de miniatures physiques n'existe actuellement.
- Le registre des previews `iconotheque-image://` est en memoire uniquement.
- Les ecritures disque reperees concernent la base SQLite locale et la creation du dossier applicatif de donnees.

### Chemins et dependances locales

- Aucun chemin applicatif critique vers `J:\2026\Iconotheque` n'est code en dur dans le code source.
- Les references absolues trouvees sont principalement dans les rapports historiques et la documentation de gel.
- Le code utilise `__dirname` pour localiser :
  - `preload.cjs` ;
  - `../dist/index.html` ;
  - `../db/schema.sql`.
- Le schema SQL est donc lu depuis le dossier de l'application compilee. C'est acceptable en developpement et en build local, mais devra etre explicitement pris en compte lors d'un packaging.
- Aucun usage de `process.cwd()` n'a ete identifie dans le code applicatif.

### Configuration Electron

- La separation main / preload / renderer est en place.
- `contextIsolation` est active.
- `nodeIntegration` est desactive.
- Le renderer passe par une API preload minimale `window.iconotheque`.
- Les canaux IPC sont explicites et orientes action :
  - selection de dossier ;
  - scan ;
  - arborescence ;
  - statut DB ;
  - metadonnees ;
  - recherche ;
  - notifications de menu ;
  - disponibilite de l'edition par lot.
- Le protocole `iconotheque-image://` evite d'exposer des URLs `file://` au renderer.
- Aucune occurrence `file://` ou `pathToFileURL` n'a ete trouvee dans `electron/` ou `src/`.

### Versionnage

- `package.json` indique `0.1.0`.
- `package-lock.json` indique `0.1.0` pour le package racine.
- `CHANGELOG.md` contient `V0.1.0 - Gel initial`.
- `docs/DEMO_FREEZE_V0.1.md` documente `Iconotheque V0.1.0`.
- L'aide integree affiche `Iconotheque V0.1.0`.
- La suite `0.1.1`, `0.1.2`, `0.2.0` pourra etre suivie proprement.

### Migrations futures

- Le schema contient les tables :
  - `app_meta` ;
  - `roots` ;
  - `folders` ;
  - `images` ;
  - `tags` ;
  - `image_tags` ;
  - `image_user_meta` ;
  - `terms` ;
  - `image_terms`.
- Le main process definit `SCHEMA_VERSION = "3"`.
- La version de schema est stockee dans `app_meta` avec la cle `schema_version`.
- Une migration simple existe deja pour ajouter `image_user_meta.workflow_color` si la colonne manque.
- Il n'existe pas encore de systeme general de migrations ordonnees.
- Toute evolution importante du schema en v0.2 devra prevoir une strategie explicite avant modification.

### Sauvegarde / restauration futures

Pour preserver les donnees utilisateur actuelles, il faudrait sauvegarder :

- `iconotheque.sqlite` dans le dossier `userData/Iconotheque`.

Elements a ne pas sauvegarder obligatoirement en v0.1.0 :

- `dist/` ;
- `dist-electron/` ;
- `node_modules/` ;
- cache de previews en memoire ;
- fichiers originaux, qui restent dans leurs emplacements propres.

Si des miniatures physiques ou caches persistants sont ajoutes plus tard, il faudra definir s'ils sont regenerables ou a sauvegarder.

### Scripts de developpement et build

Scripts existants :

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd start`
- `npm.cmd run dev:renderer`
- `npm.cmd run dev:electron`

Il n'existe pas encore de script de packaging, de signature, d'installation ou d'auto-update.

## Points rassurants

- Les donnees utilisateur ne sont pas stockees dans le dossier du depot.
- La base SQLite est dans `app.getPath("userData")`, emplacement approprie pour survivre aux mises a jour applicatives.
- Les fichiers originaux ne sont pas modifies, renommes, deplaces ou supprimes.
- Le renderer n'a pas d'acces direct a Node.
- Les previews locales passent par un protocole controle.
- Le versionnage applicatif et documentaire est coherent en `0.1.0`.
- Le build et le typecheck passent.

## Points a surveiller

- `db/schema.sql` est lu comme fichier externe relatif a `dist-electron/main.js`. Lors d'un futur packaging, il faudra s'assurer que `db/schema.sql` est inclus dans les ressources de l'application ou embarquer le schema autrement.
- `app.getPath("userData")` utilise le nom d'application Electron courant. Tant que l'application n'est pas packagée avec un nom/appId stables, le chemin peut rester `Electron/Iconotheque` en developpement.
- Le protocole preview garde un registre en memoire. Cela convient pour v0.1.0, mais une strategie de nettoyage plus fine pourrait etre utile si les recherches et scans deviennent massifs.
- Le schema versionne existe, mais le systeme de migration reste minimal.
- `sql.js` exporte et reecrit le fichier SQLite complet a chaque persistance ; c'est acceptable pour v0.1.0, mais a surveiller si le catalogue grossit.

## Risques pour une future distribution

- Packaging incomplet si `db/schema.sql` ou le WASM `sql.js` ne sont pas inclus correctement.
- Chemin `userData` potentiellement different quand le nom d'application ou l'appId seront fixes.
- Absence actuelle de configuration `electron-builder`, `electron-forge`, signature, icone, appId ou scripts installables.
- Necessite de verifier le comportement du protocole `iconotheque-image://` en application packagée.

## Risques pour les futures mises a jour

- Evolution du schema sans migration ordonnee pourrait casser les bases existantes.
- Les images sont associees par chemin ; un deplacement ou renommage externe des images rompra l'association.
- Sans backup automatique, une migration ratee pourrait abimer la base utilisateur.
- Sans appId stable, le dossier de donnees pourrait changer entre developpement et version distribuée.

## Recommandations concretes pour la suite

Avant une premiere distribution :

- Choisir un outil de packaging, par exemple Electron Forge ou electron-builder.
- Definir un `appId`, un nom produit et une icone stables.
- Verifier que `db/schema.sql` et `sql-wasm.wasm` sont bien inclus dans l'application packagée.
- Documenter le chemin exact de `userData` en version packagée.
- Tester `iconotheque-image://` en build packagé.

Avant toute evolution DB v0.2 :

- Mettre en place une liste de migrations ordonnees.
- Lire la version courante depuis `app_meta.schema_version`.
- Faire une sauvegarde de `iconotheque.sqlite` avant migration.
- Tester migration depuis une base v0.1.0 existante.

Pour une future strategie de sauvegarde :

- Sauvegarder prioritairement `iconotheque.sqlite`.
- Considerer les caches futurs comme regenerables sauf decision contraire.
- Ajouter plus tard une commande d'export manuel des metadonnees si besoin.

## Resultat de la verification manuelle du menu Edition

La verification manuelle demandee n'a pas ete refaite dans cette mission.

Etat connu :

- La mission 022 a corrige statiquement le menu `Edition > Modifier la selection par lot...`.
- Le menu est desactive par defaut.
- Le renderer envoie `setBatchEditAvailable(selectedBatchImages.length >= 2)`.
- `npm.cmd run typecheck`, `npm.cmd run build` et un lancement court Electron passent apres cette correction.

Point a verifier manuellement :

- menu grise avec 0 image selectionnee ;
- menu grise avec 1 image selectionnee ;
- menu actif a partir de 2 images selectionnees.

## Commandes lancees

- `Get-Content package.json`
- `Get-Content package-lock.json`
- `Get-Content electron\main.ts`
- `Get-Content electron\preload.cts`
- `Get-Content db\schema.sql`
- `Get-Content CHANGELOG.md`
- `Get-Content vite.config.ts`
- `Get-Content tsconfig.json`
- `Get-Content electron\tsconfig.json`
- `Get-Content docs\DEMO_FREEZE_V0.1.md`
- `Get-Content reports\022_v0.1.0_manual_recipe_and_menu_edit_report.md`
- `Get-Content src\vite-env.d.ts`
- `rg -n "J:\\|J:/|C:\\Users|AppData|process\.cwd|__dirname|app\.getPath|userData|dist-electron|dist/index|sql-wasm|schema\.sql|iconotheque\.sqlite|\.iconotheque-cache|tmp|temp|cache|thumb|preview" . --glob "!node_modules/**" --glob "!dist/**" --glob "!dist-electron/**"`
- `rg -n "file://|pathToFileURL|nodeIntegration|contextIsolation|protocol\.handle|registerSchemesAsPrivileged|ipcMain\.|ipcRenderer\.|contextBridge" electron src --glob "!dist/**"`
- `rg -n "schema_version|SCHEMA_VERSION|ALTER TABLE|CREATE TABLE|app_meta|migrateDatabaseSchema|PRAGMA" electron db src`
- `rg -n "writeFileSync|mkdirSync|readFileSync|readFile\(|readdir\(|stat\(|unlink|rename|rmSync|rmdir|copyFile|createWriteStream" electron src`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `rg -n "electron-builder|electron-forge|autoUpdater|update-electron-app|publish|nsis|appId|asar|extraResources|build" package.json electron src`
- Lancement court Electron avec `npm.cmd start`
- Verification et arret des processus Electron de test
