# Mission 026 - Analyse technique du cadrage sources web / Midjourney

## Résumé de la mission

Mission d'analyse uniquement, réalisée sur la version stable `0.1.2`.

Le document `ROADMAP_REMOTE_SOURCES_V0.1.3.md` décrit une évolution possible d'Iconotheque vers des images distantes : images par URL, racine virtuelle `Web`, collections web, cas Midjourney, statuts `distant` / `cache` / `archive locale`, et future version de travail `0.1.3-dev.x`.

Aucun code applicatif, schéma SQLite, fichier de version ou élément d'interface n'a été modifié.

## Fichiers lus

- `ROADMAP_REMOTE_SOURCES_V0.1.3.md`
- `db/schema.sql`
- `electron/main.ts`
- `electron/preload.cts`
- `src/types.ts`
- `src/vite-env.d.ts`
- `src/App.tsx`
- `src/components/ImageGrid.tsx`
- `src/components/FolderTree.tsx`
- `src/components/InfoPanel.tsx`
- `src/components/UserMetadataForm.tsx`
- `src/components/BatchMetadataModal.tsx`
- `src/components/StatusBar.tsx`
- `src/components/ImageViewer.tsx`
- `src/components/AdvancedSearchPanel.tsx`

## Zones de code examinées

- Modèle SQLite actuel : `roots`, `folders`, `images`, `image_user_meta`, `terms`, `image_terms`, `app_meta`.
- Initialisation et migration SQLite dans `electron/main.ts`.
- Stockage de la base dans `app.getPath("userData")/Iconotheque/iconotheque.sqlite`.
- Scan local non récursif via `root-folder:list-images`.
- Arborescence locale via `root-folder:build-tree`.
- Persistance des images locales via `persistImagesForFolder`.
- Métadonnées utilisateur via `getImageIdByPath`, `readImageUserMetadata`, `saveImageUserMetadata`, `batchUpdateImageUserMetadata`.
- Recherche avancée et retour d'objets `ImageFile`.
- Protocole sécurisé local `iconotheque-image://image/<id>`.
- API preload exposée au renderer.
- Grille, sélection, visionneuse, panneau droit, status bar et formulaire de métadonnées.

## Synthèse du document de cadrage

Le cadrage propose de permettre à Iconotheque de référencer des images qui ne sont pas encore locales :

- une image distante générique ajoutée par URL ;
- une racine virtuelle `Web` séparée des dossiers locaux ;
- une collection par défaut `Images par URL` ;
- de futures collections web ;
- un cas spécialisé Midjourney fondé sur un `job_id` ;
- une distinction explicite entre référence distante, cache local et archive locale.

Le point produit central est sain : Iconotheque resterait un outil de consultation, annotation, classement et recherche, sans opération destructive sur les fichiers originaux.

## Analyse du modèle de données

### État actuel

La table `images` est fortement liée au monde local :

- `root_id INTEGER NOT NULL` ;
- `folder_id` ;
- `path TEXT UNIQUE NOT NULL` ;
- `file_name` ;
- `folder_path NOT NULL` ;
- `extension`, `size_bytes`, `modified_at`, `preview_id`.

Les métadonnées utilisateur sont bien conçues autour de `image_user_meta.image_id`, ce qui est un bon point pour une future unification. En revanche, les API applicatives récupèrent actuellement cet `image_id` à partir du chemin local avec `getImageIdByPath`.

### Option A - Étendre directement `images`

Avantages :

- réutilisation directe des métadonnées, tags, termes, recherche et grille ;
- expérience UI plus simple à unifier ;
- une image reste une image affichable, quelle que soit sa source.

Risques :

- la table actuelle impose des concepts locaux à toutes les lignes ;
- `root_id`, `path`, `folder_path` et les règles de scan deviennent ambigus pour les images distantes ;
- beaucoup de colonnes deviendraient nullables ou détournées ;
- les contraintes actuelles autour du chemin local risquent de produire une dette technique rapide ;
- l'API renderer parle encore en `imagePath`, ce qui ne convient pas naturellement à une URL distante ou à un job Midjourney.

### Option B - Tables dédiées aux sources distantes

Avantages :

- séparation claire entre fichiers locaux, URLs distantes, collections web et jobs Midjourney ;
- meilleure extensibilité pour `provider`, `provider_id`, `job_id`, `slot`, `source_status`, `last_checked_at`, cache et archive ;
- moins de confusion avec les garanties de sécurité locales ;
- plus robuste pour les évolutions Midjourney.

Risques :

- l'interface doit agréger local et distant ;
- la recherche devra joindre ou fusionner plusieurs sources ;
- les métadonnées existantes ne doivent pas être dupliquées ;
- une table distante totalement séparée compliquerait la réutilisation de `image_user_meta`.

### Recommandation

La recommandation technique est un modèle hybride :

1. conserver `images` comme table catalogue commune des images affichables ;
2. y ajouter seulement le minimum nécessaire pour distinguer la source, par exemple `source_kind` avec valeur par défaut `local` ;
3. créer des tables dédiées pour les détails distants, par exemple `remote_collections`, `remote_images`, et plus tard `remote_groups` ou `midjourney_jobs` ;
4. lier `remote_images.image_id` à `images.id`.

Cela garde les métadonnées, tags, termes, workflow colors et recherche autour d'un `image_id` commun, tout en évitant de surcharger `images` avec toutes les particularités web et Midjourney.

Avant toute implémentation, il faudra aussi faire évoluer l'API applicative pour ne plus considérer `path` comme l'identité universelle de l'image. Un champ stable du type `id`, `imageId` ou `catalogKey` dans `ImageFile` paraît nécessaire.

## Analyse UI

La première tranche UI la plus simple serait :

- afficher une racine virtuelle `Web` dans la colonne gauche ;
- ajouter une collection par défaut `Images par URL` ;
- afficher les images distantes dans la grille existante ;
- ajouter un badge compact `Web` ou `Distant` ;
- réserver `Midjourney` à une tranche suivante.

Composants probablement concernés :

- `src/types.ts` : enrichir `ImageFile` avec une identité stable et un type de source ;
- `src/App.tsx` : gérer une source active locale ou virtuelle ;
- `src/components/FolderTree.tsx` : afficher une racine virtuelle en plus de l'arborescence disque ;
- `src/components/ImageGrid.tsx` : badges de source et état d'erreur image distante ;
- `src/components/InfoPanel.tsx` : statut distant, URL source, message de non-archivage ;
- `src/components/UserMetadataForm.tsx` : charger/sauver les métadonnées via identité stable plutôt que chemin local ;
- `src/components/StatusBar.tsx` : indiquer source web / distant ;
- `src/components/ImageViewer.tsx` : afficher les images distantes via URL applicative contrôlée.

La grille actuelle peut probablement afficher une image distante si elle reçoit un `previewUrl` utilisable. Le vrai sujet est donc moins la grille elle-même que l'identité de l'image, la source active, et le protocole d'affichage.

## Analyse sécurité

Les images distantes introduisent des risques nouveaux qui n'existent pas avec le protocole local actuel.

Points à traiter avant développement :

- valider les URLs avec une vraie analyse `URL`, pas par simple chaîne ;
- accepter en priorité `https://` ;
- décider si `http://` est autorisé, et avec quel avertissement ;
- refuser explicitement `file://`, `data:`, `javascript:`, `ftp:` et tout schéma non prévu ;
- refuser les chemins locaux déguisés ;
- limiter les formats à `.jpg`, `.jpeg`, `.png`, `.webp`, éventuellement `.gif` ;
- vérifier si possible le `Content-Type` renvoyé ;
- gérer les redirections, notamment les redirections vers un schéma interdit ;
- prévoir timeout, erreur DNS, 403, 404, certificat invalide, serveur lent ;
- prévoir une taille maximale de réponse pour éviter les téléchargements énormes ;
- afficher un état lisible si l'image distante est indisponible.

Il est recommandé de ne pas exposer directement l'URL distante comme `src` durable dans le renderer pour la première version sérieuse. Une approche plus cohérente avec l'architecture actuelle serait de faire servir les images distantes via le main process, par exemple avec une route contrôlée du protocole existant ou un protocole voisin :

- `iconotheque-image://remote/<id>` ;
- ou `iconotheque-remote://image/<id>`.

Le main process pourrait alors :

- ne servir que des URLs déjà validées et enregistrées ;
- contrôler les schémas ;
- contrôler les types MIME ;
- gérer les erreurs réseau ;
- préparer plus tard un cache sans changer l'interface renderer.

Ce choix évite aussi de réintroduire indirectement un équivalent non contrôlé du problème `file://`.

## Analyse Midjourney

Le cas Midjourney semble techniquement intégrable, mais il ne devrait pas être la première tranche.

Le cadrage fournit une règle exploitable :

- l'URL `https://cdn.midjourney.com/<job_id>/0_1.png` contient un `job_id` ;
- le job produit quatre slots : `0_0.png`, `0_1.png`, `0_2.png`, `0_3.png` ;
- un job ID seul peut permettre de reconstruire les quatre URLs.

Techniquement, l'intégration serait assez simple si elle se limite à :

- reconnaître un UUID ;
- reconnaître une URL `cdn.midjourney.com` ;
- extraire le `job_id` et le slot ;
- générer quatre fiches distantes liées par le même groupe ;
- afficher les quatre images comme quatre images individuelles dans la grille.

La vue groupée par job peut attendre. L'architecture actuelle attend une liste plate d'`ImageFile`, donc afficher quatre images individuelles liées par un `provider_group_id` est plus simple qu'introduire tout de suite une carte composite de job.

Risques spécifiques :

- les URLs CDN peuvent expirer ou devenir indisponibles ;
- le format d'URL Midjourney peut changer ;
- certaines images peuvent être privées ou nécessiter un contexte d'authentification ;
- le job-level metadata et l'image-level metadata doivent rester distincts.

## Recommandation pour la première tranche

Pour une future `0.1.3-dev.1`, la tranche la plus saine et limitée serait :

1. introduire une identité d'image stable côté renderer, sans supprimer le support du chemin local ;
2. préparer le modèle catalogue minimal : `images.source_kind = local` par défaut et table dédiée `remote_images` liée à `images.id` ;
3. créer une collection web par défaut `Images par URL` ;
4. ajouter une seule commande `Ajouter depuis URL...` ;
5. valider une URL `https://` directe vers une image compatible ;
6. créer une fiche distante ;
7. afficher l'image distante dans la grille via un protocole contrôlé par le main process ;
8. permettre les métadonnées existantes sur cette image ;
9. afficher un badge `Distant` ou `Web`.

À ne pas inclure dans cette première tranche :

- import par lot ;
- Midjourney ;
- cache persistant ;
- archive locale ;
- téléchargement vers un dossier utilisateur ;
- scraping ;
- authentification ;
- synchronisation ;
- refonte complète de la recherche ;
- vue groupée par job.

Si cette tranche paraît encore trop large, il serait préférable de faire d'abord une petite tranche technique préparatoire : ajouter l'identité stable `imageId` / `catalogKey` aux retours `ImageFile` et adapter les métadonnées à cette identité, tout en gardant un comportement strictement identique pour les images locales.

## Risques identifiés

- Dépendance actuelle forte au chemin local comme identité d'image.
- Table `images` encore structurée autour des dossiers locaux.
- Métadonnées appelées par `imagePath` dans le preload et le renderer.
- Arborescence gauche construite depuis le disque, pas encore prévue pour des nœuds virtuels.
- Recherche avancée centrée sur la table `images` locale.
- Risque de fuite d'informations ou de tracking si le renderer charge directement des URLs distantes.
- Gestion des erreurs réseau à concevoir dès le début pour éviter une grille fragile.
- Future confusion UX entre image distante, cache local et archive locale si les badges ne sont pas explicites.

## Questions ouvertes

- Nom produit de la racine : `Web`, `Distant`, `Sources web` ou `Sources distantes` ?
- Faut-il accepter `http://` ou imposer strictement `https://` ?
- Une image distante peut-elle appartenir à plusieurs collections web ?
- Le cache sera-t-il automatique, manuel, ou absent en v0.1.3 ?
- Quelle est l'identité publique d'une image côté renderer : `imageId`, `catalogKey`, `sourceKey` ?
- Les recherches doivent-elles mélanger local et distant immédiatement ?
- Où afficher l'URL source sans encombrer le panneau droit ?
- Pour Midjourney, faut-il stocker les métadonnées communes du job dès la première tranche Midjourney ?
- Les URLs Midjourney doivent-elles être considérées comme simples URLs tant que le cas spécialisé n'est pas implémenté ?

## Commandes lancées

- `Get-Content -Raw ROADMAP_REMOTE_SOURCES_V0.1.3.md`
- `Get-Content -Raw db\schema.sql`
- `rg -n "SCHEMA_VERSION|app\.getPath|schema\.sql|selectedRootFolders|imagePreviewRegistry|createPreviewUrl|registerImageProtocol|LIST_IMAGES_CHANNEL|BUILD_FOLDER_TREE_CHANNEL|ADVANCED_SEARCH_CHANNEL|ipcMain|protocol|persistImagesForFolder|getImageIdByPath|readImageUserMetadata|saveImageUserMetadata|batchUpdateImageUserMetadata|buildFolderTreeNode|selectRootFolder|openRootFolderFromMenu" electron\main.ts`
- `rg -n "ImageFile|RootFolder|FolderTreeNode|previewUrl|workflowColor|UserMetadata|selectedImage|selectedImagePaths|listImagesInRootFolder|buildFolderTree|advancedSearch|getImageUserMetadata|saveImageUserMetadata|batchUpdateImageUserMetadata" src\types.ts src\App.tsx src\components\*.tsx src\vite-env.d.ts electron\preload.cts`
- `rg -n "ImageFile|previewUrl|selected|badge|workflow|onOpen|onSelect|path|metadata|batch|source|folder|tree|empty" src\components`
- `Get-Content -Raw src\types.ts`
- `Get-Content -Raw src\vite-env.d.ts`
- `Get-Content -Raw electron\preload.cts`
- Lectures ciblées de plages de lignes dans `electron\main.ts`.

## Vérifications effectuées

- Lecture complète du document de cadrage.
- Vérification du schéma SQLite existant.
- Vérification de la localisation de la base locale.
- Vérification des points d'entrée IPC actuels.
- Vérification du fonctionnement conceptuel du protocole `iconotheque-image://`.
- Vérification des types exposés au renderer.
- Vérification des composants dépendants de `ImageFile.path`.

Aucun `npm.cmd run typecheck` ou `npm.cmd run build` n'a été lancé, car la mission ne modifie aucun fichier de code.

## Confirmation d'absence de modification de code

Aucun fichier de code n'a été modifié.

Aucune modification n'a été apportée :

- au schéma SQLite ;
- à l'interface ;
- à `package.json` ;
- à `package-lock.json` ;
- à la version projet ;
- aux IPC existants ;
- au protocole image ;
- à la base locale.

Seul ce rapport Markdown a été créé.
