# Iconotheque V0.1.0 - Gel de demonstration

> **Document historique.** Cette page est une photographie du gel `0.1.0` ; elle ne décrit pas la version courante. Consulter le [README](../README.md) pour l’état fonctionnel actuel.

Date du gel : 2026-07-06

Nature : premiere version locale fonctionnelle, prototype utilisable.

Note de stabilisation : `0.1.0` correspond au gel initial, `0.1.1` a servi de stabilisation transitoire, et `0.1.2` est la version stable post-gel alignee avec la convention patch pair = stable.

## Resume de la version

Iconotheque V0.1.0 permet deja d'ouvrir un dossier racine local, de parcourir son arborescence, d'afficher les images du dossier actif, de les selectionner, de les visualiser et de documenter un catalogue personnel avec des metadonnees stockees localement.

La version est volontairement centree sur l'exploration et la documentation manuelle. Elle ne cherche pas encore a extraire les EXIF, generer des miniatures physiques, detecter les doublons, reconnaitre des personnes ou ajouter de l'IA.

La philosophie reste non destructive : les fichiers originaux sont lus, jamais modifies. Les donnees applicatives et les metadonnees utilisateur sont separees des images et stockees dans une base SQLite locale. Les futures metadonnees IA devront rester une couche distincte, validable et reversible.

## Fonctionnalites disponibles

- Ouverture securisee d'un dossier racine via Electron.
- Arborescence recursive des dossiers.
- Scan non recursif du dossier actif.
- Grille d'images avec affichage via protocole local `iconotheque-image://`.
- Tailles de vignettes : petites, moyennes, grandes.
- Selection simple.
- Selection multiple avec Ctrl/Cmd, Maj et selection globale.
- Edition individuelle de metadonnees.
- Edition de metadonnees par lot.
- Visionneuse avec navigation clavier.
- Recherche simple sur les images chargees.
- Recherche avancee V1.
- Filtres rapides de couleur de workflow.
- Barre de statut.
- Menus applicatifs Fichier, Edition, Affichage, Recherche et Aide.
- SQLite locale avec `schema_version = 3`.

## Metadonnees utilisateur disponibles

- Description.
- Prompt.
- Favori.
- Note.
- Date de reference.
- Source.
- Outil / modele.
- Statut.
- Mode couleur.
- Couleur de workflow.
- Tags.
- Personnes.
- Lieux.
- Collections.
- Projets.

## Raccourcis clavier

- `Ctrl/Cmd+O` : ouvrir un dossier.
- `F5` : rescanner le dossier courant.
- `Ctrl/Cmd+F` : recherche avancee.
- `Ctrl/Cmd+1` : petites vignettes.
- `Ctrl/Cmd+2` : vignettes moyennes.
- `Ctrl/Cmd+3` : grandes vignettes.
- `Ctrl/Cmd+S` : enregistrer les metadonnees.
- Fleches dans la grille : navigation.
- `Home` / `End` dans la grille : debut / fin.
- `Entree` : ouvrir la visionneuse.
- `Echap` : fermer la visionneuse, une modale ou vider la selection multiple selon le contexte.
- Fleches gauche / droite dans la visionneuse : image precedente / suivante.
- `F1` : aide integree Iconotheque.

## Securite et non-destruction

- Aucun fichier original n'est modifie.
- Aucun fichier original n'est deplace.
- Aucun fichier original n'est supprime.
- Aucun fichier original n'est renomme.
- Aucune ecriture n'est faite dans les dossiers photo selectionnes.
- SQLite est stockee dans le dossier applicatif Electron.
- Les metadonnees Iconotheque sont stockees en base locale.
- Le renderer ne recoit pas d'URL `file://` pour les apercus.

## Limites connues

- Pas d'EXIF pour le moment.
- Pas d'IA pour le moment.
- Pas de miniatures physiques ni de cache de thumbnails.
- Pas de hash robuste pour suivre les images deplacees ou renommees.
- Les images sont associees par chemin.
- `sql.js` est utilise pour SQLite V0.
- La recherche simple est limitee aux donnees chargees dans la grille.
- La recherche avancee V1 ne repose pas encore sur FTS.
- Pas de test automatise complet Electron.
- Certaines verifications restent manuelles.

## Chemins importants

- Base SQLite locale : `C:\Users\david\AppData\Roaming\Electron\Iconotheque\iconotheque.sqlite`
- Schema : `db/schema.sql`
- Rapports : `reports/`
- Documentation : `docs/`

## Roadmap courte

- EXIF V0.
- Hash fichier.
- Cache de miniatures.
- Recherche FTS.
- Aide documentaliste IA.
- Detection de doublons.
- Export.
- Packaging installable.
