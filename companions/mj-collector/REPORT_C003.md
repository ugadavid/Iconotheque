# Rapport C003 - MJ Collector - Modes de collecte controlables

## 1. Fichiers modifies

- `manifest.json`
- `content-script.js`
- `popup.html`
- `popup.css`
- `popup.js`
- `README.md`
- `REPORT_C003.md`

## 2. Modes ajoutes

Trois modes sont disponibles dans la popup :

- `Manuel uniquement` : aucune collecte automatique.
- `Auto cible` : collecte automatique seulement sur page job directe ou CDN Midjourney.
- `Auto large` : comportement large des versions precedentes.

## 3. Mode par defaut

Le mode par defaut est `Auto cible`, soit la valeur stockee `targeted`.

Ce mode est plus rassurant pour l'usage normal, car il evite le scan automatique large sur des pages riches comme `/imagine`.

## 4. Cle de stockage

Le reglage est stocke dans `chrome.storage.local` :

```json
{
  "collectionMode": "targeted"
}
```

Valeurs possibles :

- `manual`
- `targeted`
- `broad`

Si aucune valeur n'existe, le collector utilise `targeted`.

## 5. Logique de scan automatique

### manual

- Pas de scan automatique initial.
- Pas de `MutationObserver` actif.
- Scan seulement via `Scanner cette page`.

### targeted

- Scan automatique si l'URL courante est une page job directe : `https://www.midjourney.com/jobs/<uuid>...`.
- Scan automatique si l'URL courante est sur `https://cdn.midjourney.com/...`.
- `MutationObserver` actif seulement sur ces pages ciblees.
- Pas de scan automatique large sur `/imagine`.

### broad

- Scan automatique sur les hosts Midjourney declares dans le manifest.
- `MutationObserver` actif.
- Comportement large conserve pour les pages riches.

## 6. Bouton Scanner cette page

La popup envoie un message `scanCurrentPage` au content script de l'onglet actif.

Le content script :

1. scanne la page courante deja chargee ;
2. ajoute les observations au stockage local ;
3. renvoie un resume :
   - `detectedCount`
   - `newCount`
   - `existingCount`

Le bouton fonctionne dans tous les modes et permet de scanner volontairement une page `/imagine`.

Aucun service worker `background.js` n'a ete ajoute.

## 7. Permissions finales

Le manifest reste minimal :

- `permissions`: `["storage"]`
- content script limite a :
  - `https://www.midjourney.com/*`
  - `https://cdn.midjourney.com/*`

Aucune permission `<all_urls>`, `webRequest`, `scripting` ou host supplementaire n'a ete ajoutee.

La popup utilise `chrome.tabs.query` et `chrome.tabs.sendMessage` pour contacter le content script actif, sans ajout de permission `tabs`.

## 8. Tests realises

Commandes lancees :

- `node --check companions/mj-collector/content-script.js`
- `node --check companions/mj-collector/popup.js`
- validation JSON de `manifest.json`

Verifications statiques :

- version manifest `0.3.0` ;
- permission unique `storage` ;
- matches limites a `www.midjourney.com` et `cdn.midjourney.com`.

Tests manuels Chrome restant a faire :

1. En mode `manual`, ouvrir une page Midjourney et verifier qu'aucune collecte automatique ne se lance.
2. Cliquer `Scanner cette page` et verifier que les IDs sont ajoutes.
3. En mode `targeted`, verifier que `/imagine` ne lance pas de scan automatique large.
4. En mode `targeted`, verifier qu'une page `/jobs/<uuid>` et une page CDN collectent automatiquement.
5. En mode `broad`, verifier que le comportement large est conserve.
6. Verifier que le mode choisi persiste apres fermeture/reouverture de la popup.
7. Verifier que Copier les IDs, Exporter TXT, Exporter JSON et Vider fonctionnent toujours.

## 9. Limites restantes

- Pas de test navigateur automatise execute ici.
- Le scan manuel depend de la presence du content script, donc des hosts declares dans le manifest.
- Pas d'import direct cote Iconotheque.

## 10. Confirmations de perimetre

- Pas de requete reseau supplementaire.
- Pas de telechargement.
- Pas de scan hors Midjourney.
- Pas d'integration SQLite/Iconotheque.
- Pas d'API Midjourney.
- Pas de collecte de cookies, tokens ou prompts.
