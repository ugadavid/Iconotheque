# Rapport C001 - Iconotheque MJ Collector V0

## 1. Fichiers crees

- `manifest.json`
- `content-script.js`
- `popup.html`
- `popup.js`
- `popup.css`
- `README.md`
- `REPORT_C001.md`

## 2. Structure de l'extension

L'extension est un compagnon Chrome Manifest V3 isole dans `J:/2026/Iconotheque/companions/mj-collector`.

- `manifest.json` declare le nom, la popup, la permission `storage` et le content script.
- `content-script.js` observe passivement les pages Midjourney autorisees.
- `popup.html`, `popup.js` et `popup.css` fournissent l'interface de copie, export et vidage.
- `README.md` documente l'installation et l'utilisation.

Aucun service worker `background.js` n'a ete ajoute, car la V0 n'en a pas besoin.

## 3. Permissions demandees

Permission Chrome :

- `storage`

Aucune permission large de type `<all_urls>` n'est demandee.

## 4. URLs matchees

Le content script est limite a :

- `https://www.midjourney.com/*`
- `https://cdn.midjourney.com/*`

## 5. Logique d'extraction UUID

L'extraction repose sur une regex UUID :

```js
/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
```

Les IDs detectes sont normalises en minuscules. La regex ne garde que les 36 caracteres du GUID, ce qui ignore naturellement les chemins apres l'UUID et les query strings comme `?index=1`.

## 6. Logique de deduplication

Les jobs sont indexes par `jobId` dans un objet `jobs`.

Si un ID est deja connu :

- `seenCount` est incremente ;
- `lastSeenAt` est mis a jour ;
- `sourceUrls` est enrichi sans doublon, avec une limite de 5 URLs.

## 7. Donnees stockees

Stockage dans `chrome.storage.local`, cle `jobs` :

```json
{
  "jobs": {
    "<job_id>": {
      "jobId": "<job_id>",
      "firstSeenAt": "...",
      "lastSeenAt": "...",
      "seenCount": 3,
      "sourceUrls": ["https://www.midjourney.com/jobs/..."]
    }
  }
}
```

## 8. Donnees non collectees

L'extension ne collecte pas :

- cookies ;
- tokens ;
- prompts ;
- images ;
- chemins locaux ;
- donnees personnelles ;
- contenu prive hors UUID detecte.

Elle ne fait aucune requete reseau supplementaire vers Midjourney.

## 9. Copie et export

La popup propose :

- un compteur de jobs detectes ;
- `Copier les IDs`, qui copie un UUID par ligne ;
- `Exporter TXT`, qui telecharge `iconotheque-midjourney-job-ids.txt` ;
- `Vider la liste`, avec confirmation.

## 10. Tests realises

Tests statiques realises dans le workspace :

- verification de la presence des fichiers attendus ;
- verification JSON de `manifest.json` ;
- verification de syntaxe JavaScript de `content-script.js` ;
- verification de syntaxe JavaScript de `popup.js` ;
- verification que le manifest ne declare que `storage` ;
- verification que les matches sont strictement limites a `www.midjourney.com` et `cdn.midjourney.com`.

Tests manuels Chrome restant a faire :

1. Charger l'extension en mode developpeur.
2. Ouvrir une page contenant `https://cdn.midjourney.com/467f52fc-0aea-4cc8-90c6-6cf438cf35c1/0_0.png`.
3. Verifier que `467f52fc-0aea-4cc8-90c6-6cf438cf35c1` est detecte.
4. Ouvrir ou simuler `https://www.midjourney.com/jobs/3b2baceb-e3db-495b-9854-aa0ae1f27a74?index=1`.
5. Verifier que `3b2baceb-e3db-495b-9854-aa0ae1f27a74` est detecte.
6. Revisiter le meme ID et verifier l'absence de doublon.
7. Verifier que `Copier les IDs` produit un UUID par ligne.
8. Verifier que `Vider la liste` supprime les jobs.
9. Verifier que l'extension ne s'execute pas hors des hosts declares.

## 11. Limites restantes

- Pas d'integration directe avec Iconotheque.
- Pas d'ecriture dans SQLite.
- Pas de serveur local.
- Pas de native messaging.
- Pas de CSV avance.
- Pas de test automatise dans Chrome execute ici.

## 12. Import dans Iconotheque

1. Cliquer sur l'icone de l'extension.
2. Cliquer sur `Copier les IDs`.
3. Dans Iconotheque, ouvrir `Fichier > Ajouter plusieurs jobs Midjourney...`.
4. Coller la liste.
5. Importer.
