# Rapport - Etat vide central cliquable

## Objectif

Rendre l'etat vide central cliquable au demarrage, quand aucun dossier racine n'est ouvert, afin de declencher le meme parcours que l'action `Ouvrir un dossier...`.

## Probleme UX observe

L'encadre central affichait naturellement une invitation a selectionner un dossier, mais il n'etait pas cliquable. Le comportement etait donc moins direct que le menu `Fichier`, le raccourci `Ctrl+O` ou le bouton de la status bar.

## Fichiers crees

- `reports/016c_clickable_empty_state_open_folder_report.md`

## Fichiers modifies

- `src/App.tsx`
- `src/components/ImageGrid.tsx`
- `src/styles/app.css`

## Choix techniques

- Reutilisation du handler renderer existant `handleChooseRootFolder`.
- Aucun nouvel IPC ajoute.
- Aucun changement dans Electron main/preload.
- Aucun changement DB, schema SQLite, scan, metadonnees ou workflow color.
- L'etat vide devient cliquable uniquement quand `rootFolder` est nul.
- L'etat `dossier ouvert mais aucune image directe` reste un simple message non cliquable.

## Fonctionnement ajoute

- `ImageGrid` accepte maintenant `onOpenRootFolder`.
- `App` passe `handleChooseRootFolder` a `ImageGrid`.
- Quand aucun dossier n'est ouvert, l'etat vide central devient un bouton.
- Le clic sur cet encadre ouvre le selecteur natif de dossier via l'API existante.
- Le texte secondaire devient `Cliquez ici pour ouvrir un dossier.`
- Ajout d'un feedback discret :
  - curseur pointer ;
  - hover leger ;
  - focus visible ;
  - micro-deplacement au clic.

## Commandes lancees

- `Get-Content reports\016b_workflow_color_border_visibility_report.md`
- `Get-Content src\App.tsx`
- `Get-Content src\components\ImageGrid.tsx`
- `Get-Content src\components\StatusBar.tsx`
- `Get-Content src\styles\app.css`
- `Get-Content electron\main.ts`
- `Get-Content electron\preload.cts`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `rg "file://|pathToFileURL" electron src`

## Verifications effectuees

- `npm.cmd run typecheck` : reussi.
- `npm.cmd run build` : reussi.
- Verification securite :
  - aucune occurrence `file://` dans `electron/` ou `src/` ;
  - aucune occurrence `pathToFileURL` dans `electron/` ou `src/`.
- Verification statique :
  - aucun IPC ajoute ;
  - aucun schema SQLite modifie ;
  - aucune logique Electron modifiee ;
  - l'etat vide cliquable est limite au cas sans dossier ouvert.

## Points non traites

- Pas de test visuel interactif du clic ouvrant le dialogue natif.
- Pas de test manuel de `Ctrl+O`, menu `Fichier`, status bar et ouverture reelle d'un dossier dans cette passe.

## Risques / limites

- Le bouton central reutilise la meme logique que la status bar ; si une selection est deja en cours, `handleChooseRootFolder` ignore l'action.
- Le comportement depend du dialogue natif Electron existant, qui n'a pas ete modifie.

## Recommandations pour la suite

- Tester au lancement de l'application que le clic sur l'encadre central ouvre bien le selecteur natif.
- Valider que l'etat vide non cliquable reste clair quand un dossier ouvert ne contient aucune image directe.
