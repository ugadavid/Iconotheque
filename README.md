# Iconothèque

Application Electron locale pour cataloguer, explorer, documenter, rechercher et organiser des images locales ou distantes.

- Version de travail : `0.1.3-dev.28`
- Dernière version stable documentée : `0.1.2`

## État fonctionnel actuel

Iconothèque conserve son principe non destructif : elle ne modifie, ne déplace, ne renomme ni ne supprime les fichiers image originaux. Les informations de catalogue et les métadonnées utilisateur sont enregistrées dans sa base locale.

Les fonctions présentes dans le code comprennent notamment :

- ouverture d’un dossier racine, arborescence, scan du dossier actif, grille, sélection multiple, visionneuse et recherche ;
- métadonnées, tags, personnes, lieux, projets, favoris et états de workflow ;
- import d’une image Web par URL HTTPS et affichage distant contrôlé ;
- import d’un job Midjourney seul ou par lot, avec vues par images ou par jobs ;
- téléchargement manuel d’une image Midjourney PNG sélectionnée dans le cache applicatif, avec affichage local prioritaire et repli distant ;
- import manuel de jobs vidéo Midjourney, séparés dans `Web / Midjourney / Vidéos`, avec génération manuelle d’une vignette locale par vidéo sélectionnée ;
- import local d’un export JSON d’observations Midjourney, avec séparation des jobs image et vidéo ;
- collections virtuelles fondées sur l’identité de catalogue `images.id`, acceptant images locales et distantes, avec création, renommage, suppression, menus contextuels et glisser-déposer.
- retrait transactionnel de références Web ou Midjourney du catalogue local, sans action sur les fichiers ni les sources distantes.

Le companion Chrome expérimental [MJ Collector](companions/mj-collector/README.md) est séparé de l’application Electron. Il collecte des identifiants de jobs Midjourney dans Chrome pour les exporter puis les importer par lot dans Iconothèque ; il n’écrit pas dans la base Iconothèque.

## Démarrer en développement

Dans deux terminaux ouverts à la racine du projet :

```powershell
npm.cmd run dev:renderer
npm.cmd run dev:electron
```

Les contrôles disponibles sont :

```powershell
npm.cmd run typecheck
npm.cmd run build
```

## Limites connues

- Les sources distantes dépendent de leur URL, du serveur distant et de la connexion ; elles ne sont ni mises en cache ni archivées localement, à l’exception des vignettes PNG générées explicitement pour les vidéos Midjourney.
- Les images locales restent référencées par leur chemin source : si un fichier est déplacé, renommé ou supprimé hors d’Iconothèque, il peut devenir indisponible.
- Pas d’EXIF, d’IA, de miniatures physiques, de recherche FTS, de packaging installable ou de recette interactive consolidée des fonctionnalités récentes.
- Le code, le typecheck et le build ne remplacent pas une validation manuelle dans Electron.

## Architecture en bref

Electron sépare le processus principal (fichiers, base SQLite, protocoles et menus), le preload sécurisé (API exposée au renderer) et le renderer React/Vite. La base utilisateur est stockée dans le répertoire `userData` d’Electron, sous `Iconotheque/iconotheque.sqlite`. Les détails techniques et les invariants sont décrits dans [l’architecture](docs/ARCHITECTURE.md).

## Sources de référence

- [README](README.md) : état fonctionnel courant et démarrage.
- [package.json](package.json) : version technique canonique.
- [CHANGELOG](CHANGELOG.md) : historique des versions.
- [Architecture](docs/ARCHITECTURE.md) : architecture, schéma et invariants.
- [Convention de versionnage](docs/VERSIONING.md) : convention interne.
- [Rapports de mission](reports/README.md) : traces historiques, non substitutives au code.
- [Gel V0.1.0](docs/DEMO_FREEZE_V0.1.md) et [roadmap sources distantes](ROADMAP_REMOTE_SOURCES_V0.1.3.md) : documents historiques.

## Vision future

Les intentions futures (cache ou archivage distant, exports plus riches, EXIF, IA, FTS, packaging) ne sont pas des fonctions validées de la version actuelle. Elles restent à cadrer et à réaliser.
