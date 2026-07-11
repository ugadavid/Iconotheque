# Iconotheque MJ Collector

Iconotheque MJ Collector est une petite extension Chrome experimentale pour reperer les job IDs Midjourney visibles pendant la navigation, les dedupliquer localement, puis les copier ou les exporter afin de les importer dans Iconotheque.

Le compagnon est separe du coeur Electron/Iconotheque. Il ne modifie pas Iconotheque, n'ecrit pas dans sa base SQLite et n'est pas integre au build Electron/Vite.

## Installation en mode developpeur

1. Ouvrir `chrome://extensions`.
2. Activer `Mode developpeur`.
3. Cliquer sur `Charger l'extension non empaquetee`.
4. Choisir le dossier `J:/2026/Iconotheque/companions/mj-collector`.

## Utilisation

1. Naviguer sur Midjourney.
2. Ouvrir des pages de jobs ou des pages contenant des images CDN Midjourney.
3. L'extension detecte les job IDs visibles sur les pages autorisees.
4. Cliquer sur l'icone de l'extension.
5. Choisir le mode de collecte si besoin.
6. Utiliser `Scanner cette page`, `Copier les IDs`, `Exporter TXT` ou `Exporter JSON`.
7. Dans Iconotheque, ouvrir `Fichier > Ajouter plusieurs jobs Midjourney...`.
8. Coller la liste, puis importer.

Le format copie/exporte est un UUID par ligne :

```text
467f52fc-0aea-4cc8-90c6-6cf438cf35c1
3b2baceb-e3db-495b-9854-aa0ae1f27a74
```

## TXT ou JSON

`Copier les IDs` et `Exporter TXT` produisent une liste simple, un UUID par ligne. C'est le format compatible avec l'import batch actuel d'Iconotheque.

`Exporter JSON` conserve les observations enrichies :

- URLs de pages jobs reellement vues ;
- URLs CDN reellement vues ;
- classification `image` ou `video` uniquement quand une URL CDN explicite permet de le dire ;
- `unknown` pour les jobs vus seulement via une page `/jobs/<uuid>` ou du texte.

Le JSON est prevu pour un futur import Iconotheque plus riche, notamment image/video. L'extension ne devine jamais le type depuis une page job seule.

## Modes de collecte

Le mode par defaut est `Auto cible`.

### Manuel uniquement

L'extension ne collecte rien automatiquement. Utiliser `Scanner cette page` pour lancer volontairement un scan de la page Midjourney courante.

### Auto cible

Mode recommande. L'extension collecte automatiquement seulement sur :

- `https://www.midjourney.com/jobs/<uuid>...`
- `https://cdn.midjourney.com/...`

Elle ne lance pas de scan automatique large sur `https://www.midjourney.com/imagine`.

### Auto large

Conserve le comportement puissant des versions precedentes : scan automatique sur les pages Midjourney autorisees et observation des mutations DOM.

Le mode Auto large peut detecter beaucoup d'IDs sur certaines pages Midjourney riches comme Imagine.

### Scanner cette page

Le bouton `Scanner cette page` est disponible dans tous les modes. Il scanne uniquement l'onglet courant deja charge et ajoute les IDs trouves au stockage local.

Il permet de recuperer volontairement les IDs d'une page comme `/imagine`, meme quand le mode courant est `Manuel uniquement` ou `Auto cible`.

## Ce qui est collecte

- Les UUIDs Midjourney visibles dans `window.location.href`.
- Les UUIDs dans les attributs `href` des liens.
- Les UUIDs dans les attributs `src` des images, videos et balises `source`.
- Les UUIDs dans les attributs `poster`.
- Les URLs CDN Midjourney reellement presentes dans le DOM.
- Les UUIDs dans certains attributs contenant `midjourney.com`.
- Les UUIDs dans le texte visible de la page.
- Les nouveaux liens, images et textes ajoutes dynamiquement au DOM.

Les IDs sont normalises en minuscules. Les pages jobs sont conservees dans `jobPageUrls`. Les URLs CDN reconnues sont conservees dans `cdnUrls`.

## Ce qui n'est pas collecte

- Cookies.
- Tokens.
- Prompts.
- Images.
- Chemins locaux.
- Donnees personnelles.
- Contenu prive hors UUID detecte.

L'extension ne clique pas automatiquement, ne telecharge pas d'images, n'appelle pas d'API Midjourney, ne sonde pas le CDN et ne fait pas de requete reseau supplementaire vers Midjourney.

## Permissions et perimetre

Permission Chrome demandee :

- `storage`

Pages autorisees :

- `https://www.midjourney.com/*`
- `https://cdn.midjourney.com/*`

L'extension ne demande pas `<all_urls>`.

## Stockage local

Les jobs sont stockes dans `chrome.storage.local` sous la cle `jobs`.

Structure :

```json
{
  "jobs": {
    "<job_id>": {
      "jobId": "<job_id>",
      "firstSeenAt": "2026-07-08T00:00:00.000Z",
      "lastSeenAt": "2026-07-08T00:00:00.000Z",
      "seenCount": 1,
      "jobPageUrls": ["https://www.midjourney.com/jobs/<job_id>?index=1"],
      "cdnUrls": [
        {
          "url": "https://cdn.midjourney.com/<job_id>/0_0.png",
          "kind": "image",
          "extension": "png",
          "firstSeenAt": "2026-07-08T00:00:00.000Z",
          "lastSeenAt": "2026-07-08T00:00:00.000Z"
        }
      ],
      "observedKinds": ["image"]
    }
  }
}
```

Les jobs sont dedupliques par `jobId`. Si un ID est revu, `seenCount` augmente et `lastSeenAt` est mis a jour. Les listes `jobPageUrls` et `cdnUrls` sont limitees pour eviter une croissance inutile.

Les anciennes entrees C001 avec `sourceUrls` sont migrees progressivement : les URLs jobs deviennent `jobPageUrls`, les URLs CDN reconnues deviennent `cdnUrls`, et les autres valeurs sont conservees dans `sourceUrlsLegacy` si necessaire.

## Export JSON

Le fichier `iconotheque-midjourney-observations.json` contient :

```json
{
  "exportedAt": "2026-07-08T00:00:00.000Z",
  "source": "iconotheque-mj-collector",
  "version": "0.3.0",
  "jobs": []
}
```

Chaque job exporte ses dates d'observation, son compteur, ses pages jobs, ses URLs CDN observees et ses types reellement observes.

## Limites V0.3

- Pas d'import direct dans Iconotheque.
- Pas d'ecriture SQLite.
- Pas de native messaging.
- Pas de serveur local.
- Pas de CSV avance.
- Interface volontairement simple.
- Tests Chrome reels a faire manuellement apres chargement de l'extension.
