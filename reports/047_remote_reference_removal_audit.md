# Rapport 047 — Audit du retrait des références distantes

## Résumé exécutif

**Fait vérifié.** L’application ne propose aujourd’hui aucun parcours utilisateur pour retirer complètement une image Web ou Midjourney du catalogue. Elle permet uniquement de retirer une ou plusieurs images d’une collection virtuelle, et de supprimer une collection elle-même.

**Fait vérifié.** Un mécanisme interne `deleteRemoteImageRecordForDev(imageId)` existe dans `electron/main.ts`, mais il n’est utilisé que par l’auto-test activable par `ICONOTHEQUE_REMOTE_SELFTEST=1`. Il n’est exposé ni par IPC, ni par le preload, ni par le renderer. Il ne constitue donc pas une fonctionnalité utilisateur.

**Recommandation.** Ouvrir une mission d’implémentation en `0.1.3-dev.21` afin d’ajouter l’action **« Retirer d’Iconothèque… »**. Elle doit supprimer transactionnellement les données applicatives d’identifiants dont `images.source_kind = 'remote'`, refuser toute image locale côté main process et ne faire ni opération de fichier ni requête réseau.

## Cadre vérifié

- Racine : `J:\2026\Iconotheque`.
- Version technique : `0.1.3-dev.20`.
- Schéma courant : `7` (`SCHEMA_VERSION` dans `electron/main.ts`).
- Rapport `047` libre avant cette mission.
- Aucun code, schéma, IPC, preload, base utilisateur, fichier image ou document existant n’a été modifié. Aucun build, typecheck, lancement Electron, migration ou accès réseau n’a été exécuté.

## Comportement actuel

### Actions déjà disponibles

| Action | Parcours | Effet vérifié |
|---|---|---|
| Retirer de cette collection | Menu contextuel d’image dans une vue collection ; menu Édition | `collections:remove-images` supprime uniquement les lignes ciblées de `collection_images`. L’image et ses métadonnées restent au catalogue. |
| Supprimer la collection | Clic droit sur la collection, puis modale de confirmation | `collections:delete` supprime les associations de la collection puis la collection ; aucune image n’est supprimée. |
| Ajouter à une collection | Menu contextuel, menu Édition, glisser-déposer | Ajoute des associations `collection_images`; n’agit pas sur les images. |

Le retrait de collection accepte les sélections simples et multiples, sans confirmation spécifique. Le menu contextuel est proposé dans une vue collection ; l’action n’est pas une suppression de catalogue. La suppression de collection utilise une modale renderer, mais ne concerne pas les images.

### Absence d’un retrait complet utilisateur

L’inventaire des canaux, du preload, de l’API `window.iconotheque` et du renderer ne révèle aucun canal de retrait d’image distante. Le menu contextuel d’image propose seulement l’ouverture dans la visionneuse, l’ajout à une collection et, dans une collection, « Retirer de cette collection ».

La fonction interne `deleteRemoteImageRecordForDev` :

1. vérifie qu’un enregistrement distant existe pour l’identifiant ;
2. ouvre une transaction ;
3. supprime `remote_images`, `image_terms`, `image_tags`, `image_user_meta`, puis `images` avec `source_kind = 'remote'` ;
4. valide et persiste la base.

Elle n’émet aucune requête réseau ni opération de système de fichiers. Elle n’est toutefois pas adaptée telle quelle à une API publique : son résultat est vide, elle traite un seul identifiant et ne donne ni compte ni diagnostic à l’interface.

## Parcours actuel des collections

```text
App.tsx
  → window.iconotheque.removeImagesFromCollection({ collectionId, imageIds })
  → preload: ipcRenderer.invoke("collections:remove-images", input)
  → main: ipcMain.handle("collections:remove-images", ...)
  → removeImagesFromCollection()
  → DELETE FROM collection_images WHERE collection_id = ? AND image_id = ?
```

Après succès, le renderer recharge les collections et la collection active, puis vide la sélection. Ce parcours est à maintenir distinct de tout retrait du catalogue.

## Carte proposée pour le retrait complet

```text
Menu contextuel renderer / modale de confirmation
  → window.iconotheque.removeRemoteImagesFromCatalog({ imageIds })
  → preload: ipcRenderer.invoke("remote-image:remove-from-catalog", input)
  → main: ipcMain.handle("remote-image:remove-from-catalog", ...)
  → removeRemoteImagesFromCatalog()
  → validation de tous les IDs et de images.source_kind = 'remote'
  → transaction SQLite de nettoyage puis DELETE FROM images
  → résultat structuré au renderer
  → rechargement des vues Web/Midjourney, collections et fermeture de la visionneuse si nécessaire
```

Les noms sont une recommandation, non des éléments déjà implémentés.

## Modèle de données et relations

Pour chaque référence distante, `images.id` est l’identité commune. `images.source_kind` vaut réellement `local` ou `remote`; les références Web génériques et Midjourney sont des lignes `remote`, distinguées par `remote_images.provider` (`generic_url` ou `midjourney`). Midjourney n’a pas de table de jobs : `provider_id`, `provider_group_id` et `remote_slot` sont des colonnes de `remote_images`.

| Table liée à `images.id` | Clé étrangère / cascade constatée | Effet d’un `DELETE images` seul |
|---|---|---|
| `remote_images` | `image_id → images(id)`, sans `ON DELETE` | Bloqué tant que la ligne existe ; suppression explicite nécessaire. |
| `local_images` | `image_id → images(id)`, sans `ON DELETE` | Bloqué si une ligne existait ; la validation distante doit empêcher ce cas. |
| `image_user_meta` | `image_id → images(id)`, sans `ON DELETE` | Bloqué tant que les métadonnées existent ; suppression explicite nécessaire. |
| `image_tags` | `image_id → images(id)`, sans `ON DELETE` | Bloqué tant que les liens existent ; suppression explicite nécessaire. Les lignes globales de `tags` ne doivent pas être supprimées. |
| `image_terms` | `image_id → images(id)`, sans `ON DELETE` | Bloqué tant que les liens existent ; suppression explicite nécessaire. Les lignes globales de `terms` ne doivent pas être supprimées. |
| `collection_images` | `image_id → images(id) ON DELETE CASCADE` | Nettoyé automatiquement lors de la suppression de `images`; une suppression explicite reste possible pour rendre l’intention visible. |

`roots` et `folders` ne sont pas liés à une référence distante. Les champs favori, état de workflow et informations Midjourney sont dans `image_user_meta` et `remote_images`, donc couverts par ce nettoyage. Aucun cache ni archive locale de référence distante n’est actuellement implémenté.

**Déduction.** La suppression de `images` seule n’est pas suffisante : les relations sans cascade la feraient échouer avec les clés étrangères actives. Une transaction explicite est indispensable. Les associations de collections sont déjà protégées par cascade, mais les supprimer explicitement avant `images` faciliterait les vérifications et resterait sans risque.

## Frontière de sécurité local / distant

**Fait vérifié.** Le type TypeScript et le schéma limitent `sourceKind` / `source_kind` à `local` et `remote`. Les objets d’interface portent déjà `sourceKind`, `remoteProvider`, `remoteProviderGroupId` et `remoteSlot`. Les vues Web filtrent par fournisseur, mais la vue courante, une URL ou le fournisseur ne constituent pas une autorisation suffisante.

**Recommandation à trois niveaux.**

1. Le renderer masque l’action si l’image cliquée est locale et ne prépare que les IDs affichés comme `sourceKind === 'remote'`.
2. Le renderer peut signaler une sélection mixte et n’envoyer que son sous-ensemble distant après confirmation explicite.
3. Le main process déduplique et valide tous les IDs reçus dans `images`, exige `source_kind = 'remote'` et la présence de l’enregistrement `remote_images`. Tout ID local, absent ou incohérent provoque un refus avant toute écriture de la requête ; aucune décision ne dépend de l’URL, de la vue active, de l’état du serveur ou du fournisseur.

Cette dernière validation est l’invariant décisif : même un appel IPC forgé ne peut pas supprimer une image locale.

## Expérience utilisateur recommandée

### Socle minimal

Ajouter au menu contextuel existant de la grille l’action « **Retirer d’Iconothèque…** » quand l’image cliquée est distante. Elle doit rester séparée de « Retirer de cette collection », qui n’apparaît que pour la vue collection.

La modale de confirmation peut réemployer le langage et les styles de confirmation de collection :

> Retirer 1 référence d’Iconothèque ?
>
> La référence sera retirée du catalogue et de toutes ses collections. Ses métadonnées applicatives seront supprimées. Aucun fichier local, contenu Web ou contenu Midjourney ne sera supprimé ni modifié.

Employer le pluriel pour plusieurs références. Le terme recommandé est plus précis que « Supprimer l’image » : il décrit une suppression de référence locale sans prétendre supprimer une ressource hors de l’application.

### Sélections et vues

- **Une référence distante :** l’action retire cet ID après confirmation.
- **Plusieurs références distantes sélectionnées :** l’action retire le sous-ensemble sélectionné, en une transaction.
- **Sélection mixte :** l’action est visible seulement depuis une tuile distante ; la confirmation indique le nombre de références distantes à retirer et le nombre d’images locales conservées. Le renderer n’envoie que les IDs distants. Le main process reste strict et refuse un payload contenant une locale.
- **Ressource cassée, vidéo ou inaccessible :** aucun chargement ni test réseau ne doit être effectué ; l’opération SQLite doit aboutir de la même manière.
- **Collections :** le retrait complet enlève l’image de toutes les collections via la cascade (ou le nettoyage explicite recommandé), puis recharge les compteurs et la collection active.
- **Visionneuse :** le socle peut limiter l’action au menu de grille. Si l’action est ajoutée dans la visionneuse ultérieurement, celle-ci doit se fermer ou sélectionner une image encore présente immédiatement après succès.
- **Vue Midjourney Jobs :** chaque slot conserve son menu contextuel existant. Le bouton « Sélectionner les images du job » permet le retrait en lot des slots réellement présents. Retirer un slot laisse un groupe partiel et affiche les slots manquants ; retirer tous les slots fait disparaître le groupe. Il n’existe pas d’entité job séparée à nettoyer.

## Atomicité, erreurs et résultat recommandé

La méthode main process doit ouvrir une transaction après validation préalable du lot. Elle doit utiliser uniquement des requêtes paramétrées et, dans cet ordre recommandé :

1. vérifier l’existence et le type distant de tous les IDs dédupliqués ;
2. `DELETE FROM collection_images WHERE image_id IN (...)` (facultatif techniquement, explicite fonctionnellement) ;
3. supprimer `image_terms`, `image_tags`, `image_user_meta` et `remote_images` pour les IDs ;
4. `DELETE FROM images WHERE id IN (...) AND source_kind = 'remote'` ;
5. vérifier que le nombre supprimé correspond au lot, valider, persister et retourner `removedImageIds` / `removedCount`.

Au premier ID invalide, local, absent ou sans `remote_images`, annuler l’opération entière et retourner une erreur claire, sans suppression partielle. Le renderer ne doit pas compter sur cette protection pour filtrer les locales, mais elle la complète. Les termes et tags sans relation ne doivent pas être purgés dans le socle : leur éventuel nettoyage global relève d’un autre sujet.

## Portée minimale de la mission d’implémentation

### Indispensable

- `electron/main.ts` : type de résultat, canal `remote-image:remove-from-catalog`, méthode transactionnelle publique et handler IPC.
- `electron/preload.cts`, `src/types.ts`, `src/vite-env.d.ts` : exposer et typer la méthode strictement.
- `src/App.tsx` : état de confirmation, filtrage renderer, appel, rechargement de `loadGenericRemoteImages`, `loadMidjourneyImages`, `loadCollections` et de la collection active ; nettoyer sélection, menu et visionneuse.
- Éventuellement `src/styles/app.css` uniquement si la modale existante ne peut pas être réemployée sans style additionnel.
- Tests ciblés sur une base de test isolée : refus local, suppression distante avec métadonnées, termes/tags et collections, lot distant, rollback sur ID invalide, aucun appel réseau et aucune opération fichier.
- Recette manuelle : URL Web cassée, slot Midjourney, sélection multiple, sélection mixte, vue collection, job partiel puis vide, visionneuse mise à jour.

### Facultatif

- Ajouter la même action à la visionneuse.
- Ajouter un résultat détaillé permettant d’afficher les références exclues d’une sélection mixte.
- Ajouter une action « Retirer ce job Midjourney » ; elle dépasse le socle car les jobs ne sont que des regroupements dérivés.

### Hors périmètre

- Suppression d’images locales ou de fichiers.
- Modification du schéma ou migration.
- Cache, archivage, appel réseau, requête destructive vers Web/Midjourney.
- Modification du companion Chrome.

## Décisions humaines restantes

Les principes de sûreté sont déjà validés. Restent à confirmer :

1. accepter le comportement recommandé pour les sélections mixtes (retirer les seules références distantes avec un avertissement) ou préférer désactiver l’action tant qu’une locale est sélectionnée ;
2. décider si la première version doit inclure l’action dans la visionneuse ou se limiter au menu contextuel de grille ;
3. confirmer que les lignes `tags` et `terms` désormais sans association doivent être conservées, comme recommandé.

## Prompt autonome proposé pour la mission suivante

> Dans `J:\2026\Iconotheque`, ouvre `0.1.3-dev.21` et implémente uniquement le retrait complet de références distantes du catalogue. Ajoute une action « Retirer d’Iconothèque… » au menu contextuel d’une tuile distante, avec une confirmation expliquant que les métadonnées et associations de collection sont supprimées localement, sans action sur fichiers, Web ni Midjourney. Expose une méthode IPC/preload typée qui reçoit des `imageIds`. Côté main process, déduplique, valide avant écriture que tous les IDs existent, sont `images.source_kind = 'remote'` et possèdent `remote_images`, puis réalise une transaction paramétrée supprimant les associations `collection_images`, `image_terms`, `image_tags`, `image_user_meta`, `remote_images` et enfin `images`. Refuse intégralement le lot au moindre ID local, absent ou incohérent. Ne modifie ni schéma, ni migrations, ni logique locale, ni réseau, ni companion. Après succès, recharge les vues Web/Midjourney, les collections et la vue collection active, vide les sélections et ferme la visionneuse si son image est retirée. Ajoute des tests isolés et une recette manuelle pour URL cassée, Midjourney, lot, sélection mixte et collections.
