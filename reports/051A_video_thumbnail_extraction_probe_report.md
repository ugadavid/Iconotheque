# Rapport 051A — Prototype d’extraction de vignette vidéo

## Résultat

Le prototype `src/videoThumbnailProbe.ts` charge explicitement une URL vidéo `iconotheque-image://`, attend ses métadonnées, se positionne à `0.2 s` (ou au milieu si plus courte), dessine une frame dans un canvas et retourne un PNG data URL en mémoire. Il n’écrit ni base, ni cache, ni fichier.

Le protocole existant est un schéma sécurisé/standard et renvoie `Access-Control-Allow-Origin: *` pour les médias distants. Le prototype utilise `crossOrigin = "anonymous"`; le test Electron déterminera définitivement si Chromium autorise le canvas pour ce flux, notamment après les requêtes Range MP4.

## Test Electron proposé

Depuis une vidéo MJ cataloguée, appeler dans DevTools :

```js
import('/src/videoThumbnailProbe.ts').then(({ probeMidjourneyVideoFrame }) => probeMidjourneyVideoFrame('iconotheque-image://remote/<id>'))
```

Vérifier un résultat `ok: true`, des dimensions non nulles et un data URL PNG. Un `SecurityError` indique un blocage CORS/canvas à résoudre avant toute mission de cache.

## Déclencheur temporaire 051A-2

Dans `Web / Midjourney / Videos`, faire un clic droit sur une tuile vidéo Midjourney et choisir **« DEV : tester la vignette vidéo »**. La modale temporaire affiche soit les dimensions et la longueur du data URL avec son aperçu en mémoire, soit un message d’échec précis. Ce déclencheur ne crée ni fichier, ni cache, ni ligne DB ; il doit être retiré ou remplacé lors de la mission de persistance.

## Limites et recommandation

La faisabilité est préparée mais non validée interactively dans Electron. Si ce probe réussit, la vraie mission 051 pourra ajouter l’état DB, le cache applicatif et une action utilisateur explicite. Aucun FFmpeg, cache, migration ni UX principale n’a été ajouté ici.

## Contrôles

- `npm.cmd run typecheck` : réussi.
- `npm.cmd run build` : réussi.
- `git diff --check` : réussi.

Les contrôles ont été relancés après l’ajout du déclencheur : typecheck, build et diff check réussis. La recette Electron avec une vidéo réelle reste à effectuer par l’utilisateur pour conclure la faisabilité CORS/canvas.

Message de commit proposé : `chore: probe Midjourney video thumbnail extraction`
