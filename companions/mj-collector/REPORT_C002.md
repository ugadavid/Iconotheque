# Rapport C002 - MJ Collector - Export JSON enrichi

## 1. Fichiers modifies

- `manifest.json`
- `content-script.js`
- `popup.html`
- `popup.js`
- `README.md`
- `REPORT_C002.md`

## 2. Nouvelle structure de stockage

Les jobs restent stockes dans `chrome.storage.local`, cle `jobs`, indexes par `jobId`.

```json
{
  "jobs": {
    "<job_id>": {
      "jobId": "<job_id>",
      "firstSeenAt": "...",
      "lastSeenAt": "...",
      "seenCount": 3,
      "jobPageUrls": ["https://www.midjourney.com/jobs/<job_id>?index=2"],
      "cdnUrls": [
        {
          "url": "https://cdn.midjourney.com/<job_id>/0_0.png",
          "kind": "image",
          "extension": "png",
          "firstSeenAt": "...",
          "lastSeenAt": "..."
        }
      ],
      "observedKinds": ["image"]
    }
  }
}
```

Les listes sont limitees : 10 URLs de pages job, 20 URLs CDN et 5 URLs legacy.

## 3. Compatibilite avec C001

Les anciennes entrees C001 peuvent contenir `sourceUrls`.

La migration est legere et effectuee lors de la fusion avec une nouvelle observation :

- URL `/jobs/<uuid>` reconnue : ajout dans `jobPageUrls`.
- URL CDN image/video reconnue : ajout dans `cdnUrls`.
- URL non classee : conservation dans `sourceUrlsLegacy`.

Les exports TXT, la copie des IDs, le compteur et le bouton de vidage restent compatibles.

## 4. Classification image/video/unknown

La fonction `classifyObservedUrl(url)` classe uniquement les URLs reellement observees.

- `https://cdn.midjourney.com/<uuid>/0_0.png` a `0_3.png` : `kind = image`, `extension = png`.
- `https://cdn.midjourney.com/video/<uuid>/<number>.mp4` : `kind = video`, `extension = mp4`.
- `https://www.midjourney.com/jobs/<uuid>...` : `kind = unknown`, stockage dans `jobPageUrls`.
- UUID trouve dans du texte sans URL CDN exploitable : `kind = unknown`, aucune URL CDN inventee.

Une page job ne permet jamais de conclure image ou video.

## 5. Format JSON exporte

Le bouton `Exporter JSON` produit `iconotheque-midjourney-observations.json`.

```json
{
  "exportedAt": "2026-07-08T00:00:00.000Z",
  "source": "iconotheque-mj-collector",
  "version": "0.2.0",
  "jobs": [
    {
      "jobId": "...",
      "firstSeenAt": "...",
      "lastSeenAt": "...",
      "seenCount": 3,
      "jobPageUrls": [],
      "cdnUrls": [],
      "observedKinds": ["image"]
    }
  ]
}
```

## 6. Tests realises

Commandes lancees :

- `node --check companions/mj-collector/content-script.js`
- `node --check companions/mj-collector/popup.js`
- validation JSON de `manifest.json`
- simulation de classification des URLs demandees

Cas verifies par simulation :

- CDN image `https://cdn.midjourney.com/467f52fc-0aea-4cc8-90c6-6cf438cf35c1/0_0.png` donne `kind = image`, `extension = png`.
- CDN video `https://cdn.midjourney.com/video/211acffc-f737-43d2-b6d4-1a10fa36e5f5/1.mp4` donne `kind = video`, `extension = mp4`.
- Page job `https://www.midjourney.com/jobs/5fdd4b78-5313-4fd4-9cfb-075a4d28e7ba?index=2` donne `kind = unknown` et reste une page job.

Tests Chrome manuels restant a faire :

- Charger l'extension non empaquetee.
- Verifier la detection DOM reelle sur Midjourney.
- Verifier l'export JSON depuis la popup.
- Verifier que le TXT reste un UUID par ligne.

## 7. Limites restantes

- Pas d'import JSON cote Iconotheque.
- Pas de support video cote Iconotheque.
- Pas de test navigateur automatise execute ici.
- Les types restent inconnus tant qu'aucune URL CDN image/video explicite n'est observee.

## 8. Confirmations de perimetre

- Pas de requete reseau supplementaire.
- Pas de telechargement.
- Pas de scan hors des hosts declares dans le manifest.
- Pas d'integration directe SQLite/Iconotheque.
- Pas d'API Midjourney.
- Pas de native messaging.
