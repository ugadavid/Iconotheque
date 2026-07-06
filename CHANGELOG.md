# Changelog

## V0.1 - Gel initial

Iconotheque V0.1 est le premier gel fonctionnel du prototype local.

Principales fonctionnalites livrees :

- Application Electron locale avec renderer Vite, React et TypeScript.
- Ouverture securisee d'un dossier racine.
- Arborescence recursive des dossiers.
- Scan non recursif du dossier actif.
- Grille d'images avec protocole local `iconotheque-image://`.
- Selection simple, selection multiple et navigation clavier.
- Visionneuse avec navigation precedente / suivante.
- Colonnes redimensionnables et layout responsive.
- Tailles de vignettes petites, moyennes et grandes.
- Panneau d'informations fichier et metadonnees utilisateur.
- Edition individuelle et edition par lot.
- SQLite locale `schema_version = 3`.
- Tags, personnes, lieux, collections et projets.
- Description, prompt, source, outil / modele, date de reference, note, favori, statut, mode couleur et couleur de workflow.
- Liseres de workflow dans la grille.
- Recherche simple, recherche avancee et filtres rapides de workflow.
- Menus Fichier, Edition, Affichage, Recherche et Aide.
- Barre de statut.
- Aide integree accessible par F1.

Limites assumees :

- Pas d'EXIF.
- Pas d'IA.
- Pas de miniatures physiques.
- Pas de hash de fichiers.
- Pas de recherche FTS.
- Pas de packaging installable.
