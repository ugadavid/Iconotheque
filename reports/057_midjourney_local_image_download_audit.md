# Mission 057 — Audit import local des images Midjourney

## Cadre et résultat

- Racine vérifiée : `J:\2026\Iconotheque`.
- Version constatée : `0.1.3-dev.27`.
- Audit uniquement : aucun code, schéma, base SQLite, fichier média ou interface n’a été modifié.

La prochaine mission peut livrer une tranche verticale simple : téléchargement explicite d’un slot PNG Midjourney vers le cache applicatif, persistance d’un état/clé dans `remote_images`, puis priorité à cette copie locale via le protocole existant. Aucun nouveau système générique de téléchargement n’est nécessaire.

## État actuel vérifié

`remote_images` porte déjà les informations suffisantes pour une image MJ :

| Information | Emplacement actuel |
| --- | --- |
| Identité catalogue | `images.id` / `remote_images.image_id` |
| URL distante PNG | `remote_images.remote_url` |
| Fournisseur | `remote_images.provider = 'midjourney'` |
| Job ID stable | `provider_id` et `provider_group_id` |
| Slot image | `remote_slot` (`0_0` à `0_3`) |
| Type | `media_kind = 'image'` |

L’import manuel reconstruit `https://cdn.midjourney.com/<jobId>/<slot>.png`. `toRemoteImageFile` place aujourd’hui cette référence sous `iconotheque-image://remote/<imageId>`, dans `imageSrc` et `previewUrl`. La grille et la visionneuse consomment `imageSrc` : modifier cette valeur côté main suffit donc à donner priorité à une copie locale dans les deux vues, sans logique renderer parallèle.

Le protocole `iconotheque-image://` est déjà l’endroit approprié : il sert les aperçus locaux enregistrés et les références distantes après validation. Une nouvelle branche locale MJ, autorisée seulement pour une entrée MJ image cataloguée, préserve la frontière main/preload/renderer.

## Stockage recommandé

Utiliser un dossier applicatif stable et visible :

`userData/Iconotheque/midjourney-images/<jobId>/<jobId>_<slot>.png`

Exemple :

`userData/Iconotheque/midjourney-images/32f0…3ad/32f0…3ad_0_2.png`

Le sous-dossier **par job ID** est préférable à une organisation par date ou préfixe : il est déterministe, lisible, évite un dossier plat, regroupe naturellement les quatre slots et rend l’action « ouvrir le dossier du job » évidente. Un préfixe supplémentaire ne devient utile qu’à une échelle beaucoup plus grande ; il serait prématuré ici.

Ces fichiers sont des copies dérivées téléchargées explicitement, jamais des originaux utilisateur. Leur suppression manuelle reste possible sans danger pour les fichiers source utilisateur.

## Proposition DB minimale

Ajouter à `remote_images`, avec migration idempotente :

| Colonne | Valeurs / rôle |
| --- | --- |
| `local_copy_status` | `missing`, `downloaded`, `failed` ; défaut `missing` |
| `local_copy_key` | clé relative sûre, par exemple `<jobId>/<jobId>_<slot>.png` |
| `local_copy_updated_at` | traçabilité minimale optionnelle |

Des colonnes sur `remote_images` sont plus simples qu’une table dédiée : relation un-à-un avec le slot distant, aucune collection de versions ni information de transfert à modéliser. La clé est préférable à un chemin absolu : le cache reste déplaçable avec `userData` et le main reconstruit le chemin sûr.

Si la DB indique `downloaded` mais que le fichier manque, retourner immédiatement au fallback distant et, idéalement, rétablir `missing` lors de la prochaine action explicite ou lecture contrôlée. Ne jamais afficher un chemin arbitraire provenant de la DB.

## Flux technique recommandé

1. Renderer demande une action par `imageId` seulement.
2. Main relit l’entrée, vérifie `remote`, `midjourney`, `media_kind = image`, UUID/slot/URL PNG attendue.
3. Main télécharge avec les mêmes restrictions de domaine, MIME PNG, timeout et taille maximale que le protocole distant ; aucune URL fournie par le renderer n’est utilisée.
4. Écriture atomique dans un fichier temporaire du dossier du job, puis renommage ; mise à jour DB seulement après succès.
5. `toRemoteImageFile` choisit `iconotheque-image://mj-local/<imageId>` quand état, clé et fichier sont valides ; sinon `iconotheque-image://remote/<imageId>`.
6. Le handler protocolaire `mj-local` relit l’entrée et sert uniquement le chemin calculé depuis la clé validée.

Le fichier déjà présent et valide doit être traité comme succès idempotent : pas de second téléchargement, statut confirmé `downloaded`. Un échec CDN, MIME invalide, taille excessive ou écriture échouée retourne un résultat structuré et, si utile, marque `failed`; l’interface conserve le fallback distant.

## UX proposée

Dans le menu contextuel d’une **image MJ** :

- `Télécharger cette image MJ` ;
- `Ouvrir le dossier du job...` si au moins une copie locale du job existe.

Dans l’en-tête de la **vue Jobs** ou le menu contextuel de la carte job :

- `Télécharger les 4 images du job MJ` ;
- `Ouvrir le dossier du job...`.

Le téléchargement par job exécute les quatre opérations contrôlées et retourne un résumé `créées / déjà présentes / échecs`. Ce n’est pas une génération automatique ni un téléchargement massif.

La tuile peut recevoir un badge discret `Local` (ou une petite icône de disque) lorsque `local_copy_status = downloaded` **et** que le fichier existe. La priorité locale est implicite visuellement car c’est déjà l’image affichée ; le badge sert seulement d’information. Il doit apparaître dans les vues plate et Jobs.

L’action Explorateur doit ouvrir **le dossier du job**, plutôt que le dossier racine ou le fichier isolé : c’est le contexte utile des quatre slots. Le main doit refuser tout dossier hors de `midjourney-images`.

## Gestion des erreurs et limites

- CDN indisponible : résultat d’erreur, pas de fichier partiel, fallback distant intact.
- Téléchargement partiel du job : les slots réussis restent locaux, le résumé nomme les échecs ; aucune suppression des succès.
- Fichier supprimé manuellement : fallback distant et badge absent ; une nouvelle action retélécharge.
- Fichier existant : vérification de son emplacement/format attendu, puis succès idempotent.
- Retrait d’Iconothèque : la mission suivante doit décider si le cache est supprimé. Pour une première tranche, conserver un fichier orphelin est sûr ; un nettoyage best-effort explicite peut suivre.
- Les vidéos MJ restent hors de cette mission : elles ont déjà un cache de vignette distinct et ne doivent pas utiliser ce flux PNG.

## Découpage recommandé

1. Migration schema 10 et helpers main de chemin/validation, avec tests sur base isolée.
2. Téléchargement d’un slot + protocole local + priorité d’affichage + badge, recette Electron avec succès, erreur et fichier manquant.
3. Téléchargement des quatre slots, résumé, ouverture sécurisée du dossier de job et nettoyage éventuel lors du retrait catalogue.

## Validation et suite

Les constats reposent sur la lecture de `db/schema.sql`, `electron/main.ts`, `src/types.ts`, `src/components/ImageGrid.tsx`, `src/components/ImageViewer.tsx` et `docs/ARCHITECTURE.md`. Aucun build ni recette Electron n’est requis ou revendiqué : aucun code n’a été modifié.

## Commit proposé

`docs: audit local download for Midjourney images`
