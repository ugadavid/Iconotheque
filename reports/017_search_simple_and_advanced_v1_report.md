# Rapport - Recherche simple et recherche avancee V1

## Objectif

Ajouter une recherche simple visible dans l'interface principale et une recherche avancee accessible depuis le menu `Recherche`, sans ajouter de dependance, sans exposer SQLite au renderer et sans modifier les fichiers originaux.

## Fichiers crees

- `src/components/SearchBox.tsx`
- `src/components/AdvancedSearchPanel.tsx`
- `reports/017_search_simple_and_advanced_v1_report.md`

## Fichiers modifies

- `electron/main.ts`
- `electron/preload.cts`
- `src/App.tsx`
- `src/components/ImageGrid.tsx`
- `src/components/StatusBar.tsx`
- `src/styles/app.css`
- `src/types.ts`
- `src/vite-env.d.ts`

## Evolution du schema SQLite

Aucune.

La mission lit les tables existantes :

- `images`
- `roots`
- `image_user_meta`
- `terms`
- `image_terms`

La base n'est pas reinitialisee et aucune migration n'est ajoutee.

## Choix techniques

- Recherche simple faite cote renderer sur les images deja chargees dans le dossier actif.
- Recherche simple limitee aux donnees disponibles dans la grille : nom, extension, chemin.
- Recherche avancee faite cote main process via IPC `search:advanced`.
- Menu `Recherche > Recherche avancee...` ajoute avec le raccourci `CommandOrControl+F`.
- Signal menu vers renderer via `search:advanced-requested`.
- Les resultats avances sont limites aux racines ouvertes et autorisees pendant la session.
- Les previews des resultats avances utilisent le protocole existant `iconotheque-image://`.
- Aucun `file://` n'est expose au renderer.
- Les champs tags/personnes/lieux/collections/projets de la recherche avancee sont des champs texte separes par virgules pour cette V1.
- La DB n'est pas transformee en source principale hors mode recherche avancee.

## Fonctionnement ajoute

- Champ de recherche simple dans l'en-tete de la grille.
- Bouton discret `Effacer` pour la recherche simple.
- Compteur `resultats / total`.
- Etat vide `Aucune image ne correspond a la recherche.` quand le filtre simple ne retourne rien.
- Panneau modal de recherche avancee avec sections :
  - Texte ;
  - Classement ;
  - Dates et origine ;
  - Termes.
- Boutons de recherche avancee :
  - `Rechercher` ;
  - `Reinitialiser` ;
  - `Fermer`.
- Mode resultats de recherche dans la grille.
- Action `Quitter la recherche` pour revenir au dossier actif.
- Status bar enrichie avec `Recherche : N resultat(s)` en mode recherche avancee.
- Selection, panneau droit et visionneuse utilisent la liste affichee, y compris les resultats filtres/recherches.

## Comportement de recherche simple

- Immediate au fil de la frappe.
- Ne lance aucune requete DB.
- Filtre uniquement les images du dossier actif deja scanne.
- Cherche dans :
  - nom de fichier ;
  - extension ;
  - chemin.
- Si l'image selectionnee disparait du resultat filtre, la selection est videe et la visionneuse est fermee.
- La navigation clavier continue d'agir sur la liste filtree.

## Comportement de recherche avancee

- Ouvrable par `Recherche > Recherche avancee...`.
- Ouvrable par `CommandOrControl+F`.
- Interroge SQLite cote main process.
- Criteres V1 :
  - texte libre ;
  - favori uniquement ;
  - note minimale ;
  - statut ;
  - source ;
  - mode couleur ;
  - couleur de workflow ;
  - date de reference debut ;
  - date de reference fin ;
  - tags ;
  - personnes ;
  - lieux ;
  - collections ;
  - projets.
- Le texte libre cherche dans :
  - nom de fichier ;
  - chemin ;
  - extension ;
  - description ;
  - prompt ;
  - source ;
  - outil / modele ;
  - statut ;
  - termes associes.
- Les resultats sont limites a 500 images.
- Les resultats affichent les donnees necessaires a la grille :
  - nom ;
  - chemin ;
  - extension ;
  - taille ;
  - date de modification ;
  - URL preview applicative ;
  - couleur de workflow.

## Limites connues

- Recherche simple ne cherche pas encore dans les metadonnees utilisateur, car elles ne sont pas enrichies dans toutes les tuiles du dossier actif.
- Les champs de termes avances sont de simples champs texte separes par virgules, pas encore des chips avec autocompletion.
- La recherche avancee ne parcourt que les racines ouvertes et autorisees dans la session courante.
- Les resultats avances sont limites a 500 entrees.
- Pas de FTS SQLite dans cette V1.
- Pas de test interactif complet avec une phototheque reelle dans cette passe.

## Commandes lancees

- `Get-Content C:\Users\david\.codex\attachments\194165d4-6e6f-44d7-9811-77a59a8f790d\pasted-text.txt`
- `Get-Content README.md`
- `Get-Content reports\014_sqlite_v0_schema_and_persistence_report.md`
- `Get-Content reports\015_user_metadata_v1_report.md`
- `Get-Content reports\016_user_metadata_ux_polish_and_workflow_color_report.md`
- `Get-Content reports\016b_workflow_color_border_visibility_report.md`
- `Get-Content reports\016c_clickable_empty_state_open_folder_report.md`
- `Get-Content db\schema.sql`
- `Get-Content electron\main.ts`
- `Get-Content electron\preload.cts`
- `Get-Content src\App.tsx`
- `Get-Content src\components\TopBar.tsx`
- `Get-Content src\components\ImageGrid.tsx`
- `Get-Content src\components\StatusBar.tsx`
- `Get-Content src\components\InfoPanel.tsx`
- `Get-Content src\components\UserMetadataForm.tsx`
- `Get-Content src\styles\app.css`
- `Get-Content src\types.ts`
- `Get-Content src\vite-env.d.ts`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- Lancement temporaire Electron avec `npm.cmd start`
- `rg "file://|pathToFileURL" electron src`
- Verification des processus Electron restants

## Verifications effectuees

- `npm.cmd run typecheck` : reussi.
- `npm.cmd run build` : reussi.
- Lancement Electron temporaire : stdout normal, stderr vide.
- Verification securite :
  - aucune occurrence `file://` dans `electron/` ou `src/` ;
  - aucune occurrence `pathToFileURL` dans `electron/` ou `src/`.
- Aucun processus Electron applicatif de test laisse actif.
- Verification statique :
  - pas de dependance ajoutee ;
  - pas de schema SQLite modifie ;
  - pas d'ecriture dans les dossiers photo ;
  - IPC minimal ajoute pour la recherche avancee.

## Points non traites

- Pas de test manuel complet avec ouverture de dossier reel.
- Pas de test manuel de recherche simple par nom dans l'application.
- Pas de test manuel du menu `Recherche > Recherche avancee...`.
- Pas de test manuel de `CommandOrControl+F`.
- Pas de test manuel des filtres favoris, note, statut, source, workflow color ou termes.
- Pas de recherche simple dans description/tags tant que ces donnees ne sont pas chargees dans les tuiles.
- Pas de sauvegarde de criteres de recherche.

## Risques / limites

- Les performances de la recherche avancee reposent sur des requetes `LIKE` simples et pourront etre limitees sur de tres grosses bases.
- Les criteres termes utilisent une correspondance partielle normalisee, ce qui est pratique mais moins strict qu'une selection de termes par id.
- Les previews de recherche avancee sont ajoutees au registre memoire du protocole image ; un futur nettoyage plus fin pourra etre utile si les recherches deviennent massives.

## Recommandations pour la suite

- Tester la recherche avancee sur une base contenant deja plusieurs metadonnees utilisateur.
- Ajouter ensuite des chips/autocompletion aux champs de termes avances.
- Enrichir progressivement les images du dossier actif avec un resume de metadonnees pour etendre la recherche simple.
- Envisager une recherche FTS SQLite dans une mission dediee si les volumes deviennent importants.
