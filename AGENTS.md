# AGENTS.md — Règles permanentes du projet Iconothèque

## 1. Portée de ce document

Ces règles s’appliquent à toutes les missions réalisées dans le dépôt Iconothèque.

Avant chaque mission :

1. vérifier que la racine active est bien `J:\2026\Iconotheque` ;
2. lire ce fichier intégralement ;
3. lire les éventuels fichiers `AGENTS.md` plus spécifiques présents dans les sous-dossiers concernés ;
4. lire les documents et rapports explicitement cités dans la mission ;
5. inspecter l’état Git avant toute modification.

Les instructions spécifiques de la mission complètent ces règles. En cas de contradiction explicite, signaler le conflit avant d’agir.

---

## 2. Principe fondamental de non-destruction

Iconothèque est une application de catalogage. Elle ne doit jamais modifier les fichiers image originaux de l’utilisateur.

Sauf demande humaine exceptionnellement explicite, il est interdit de :

- modifier un fichier image original ;
- déplacer un fichier original ;
- renommer un fichier original ;
- supprimer un fichier original ;
- modifier l’organisation des dossiers source ;
- écrire des métadonnées dans les fichiers originaux.

Les opérations réalisées dans le catalogue, les collections virtuelles ou la base applicative ne doivent pas être présentées comme des opérations sur les fichiers originaux.

Une référence Web ou Midjourney peut être retirée du catalogue local uniquement lorsqu’une mission l’autorise explicitement. Cela ne doit provoquer aucune suppression ni modification sur le serveur distant.

---

## 3. Base utilisateur et données réelles

Ne jamais utiliser la base utilisateur réelle pour fabriquer, altérer ou supprimer des données de test.

Sans autorisation explicite, il est interdit de :

- lancer une migration sur la base utilisateur ;
- réinitialiser la base utilisateur ;
- supprimer la base utilisateur ;
- injecter des données de test dans la base utilisateur ;
- modifier manuellement son contenu ;
- remplacer la base par une base de démonstration.

Les tests de base de données doivent utiliser :

- une base temporaire ;
- une copie explicitement isolée ;
- un environnement de test prévu par le projet ;
- ou un mécanisme d’auto-test existant et sûr.

Toute mission modifiant le schéma ou les migrations doit documenter :

- la version du schéma avant et après ;
- la stratégie de migration ;
- les données concernées ;
- les risques ;
- la sauvegarde ou le retour arrière ;
- les tests réalisés sur une base isolée.

---

## 4. Respect strict du périmètre

Ne pas élargir spontanément une mission.

Il est notamment interdit de profiter d’une mission ciblée pour entreprendre :

- une refactorisation générale ;
- une réorganisation esthétique sans rapport direct ;
- un changement d’architecture non demandé ;
- une mise à jour de dépendances ;
- une migration ;
- une modification du protocole réseau ;
- un changement du companion Chrome ;
- une fonctionnalité supplémentaire seulement « pratique » ;
- une correction sans rapport avec l’objectif.

Une anomalie hors périmètre peut être signalée dans le rapport, mais elle ne doit pas être corrigée sans autorisation.

Toute modification d’un fichier non prévu par la mission doit être strictement nécessaire et justifiée.

---

## 5. Modifications existantes et sécurité Git

Le dépôt peut contenir des modifications préexistantes appartenant à l’utilisateur ou à une mission précédente.

Toujours :

- inspecter l’état Git avant de travailler ;
- préserver les modifications hors périmètre ;
- éviter d’écraser un fichier modifié sans comprendre les changements présents ;
- inspecter le diff final ;
- distinguer les changements de la mission des changements antérieurs.

Ne jamais utiliser une commande destructive telle que :

- `git reset --hard` ;
- `git clean -fd` ;
- restauration globale de fichiers ;
- suppression massive de changements.

Ne pas créer de commit et ne pas pousser vers un dépôt distant, sauf demande explicite de la mission.

À défaut, proposer seulement un message de commit à la fin.

---

## 6. Versionnage

La source canonique de la version technique est :

`package.json`

Lorsque la mission ouvre une nouvelle version, vérifier et mettre à jour de manière cohérente les emplacements réellement concernés, notamment :

- `package.json` ;
- le package racine de `package-lock.json` ;
- `CHANGELOG.md` ;
- le README si la version de travail y est affichée ;
- tout affichage applicatif dérivé de la version.

Ne jamais ajouter un nouveau numéro de version codé en dur dans l’interface si une source technique commune peut être utilisée.

Ne pas modifier les versions historiques légitimes présentes dans :

- les anciennes entrées du changelog ;
- les rapports ;
- les documents de gel ;
- les documents explicitement historiques.

Ne pas ouvrir une nouvelle version si la mission ne le demande pas ou si aucun comportement ou livrable versionné ne le justifie.

---

## 7. Sources documentaires canoniques

Les rôles documentaires sont répartis ainsi :

| Information | Source canonique |
|---|---|
| Version technique | `package.json` |
| État fonctionnel courant | `README.md` |
| Historique des versions | `CHANGELOG.md` |
| Architecture et invariants | `docs/ARCHITECTURE.md` |
| Convention de version | `docs/VERSIONING.md` |
| Schéma et migrations réelles | code concerné et `db/schema.sql` |
| Travail effectué pendant une mission | `reports/*.md` |
| Companion Midjourney | `companions/mj-collector/README.md` et son manifest |

Ne pas transformer un rapport historique en description canonique de l’état courant.

Ne pas réécrire rétroactivement l’histoire du projet pour la faire correspondre à l’état actuel.

Lorsque le comportement utilisateur change, vérifier si les documents suivants doivent être actualisés :

- `README.md` ;
- `CHANGELOG.md` ;
- aide intégrée ;
- `docs/ARCHITECTURE.md` si l’architecture ou un invariant change.

Éviter de dupliquer inutilement la même information dans plusieurs documents.

---

## 8. Rapports de mission

Les rapports existants sont des traces historiques immuables.

Ne jamais modifier un ancien rapport, sauf demande corrective explicite portant précisément sur ce rapport.

À la fin d’une mission d’implémentation ou d’audit documenté :

1. vérifier le prochain numéro réellement disponible ;
2. ne jamais écraser un rapport existant ;
3. créer le rapport demandé dans `reports/` ;
4. expliquer tout écart entre le numéro attendu et le numéro réellement utilisé.

Un rapport doit indiquer, selon la nature de la mission :

- la racine vérifiée ;
- la version avant et après ;
- le résultat obtenu ;
- les fichiers créés ;
- les fichiers modifiés ;
- les décisions appliquées ;
- les contrôles effectués ;
- les résultats des tests ;
- les recettes manuelles réellement réalisées ;
- les vérifications non réalisées ;
- les limites et risques restants ;
- la confirmation des invariants de sécurité ;
- la prochaine étape recommandée ;
- un message de commit proposé.

Distinguer clairement :

- les faits vérifiés dans le code ;
- les déductions ;
- les recommandations ;
- les tests automatisés ;
- le typecheck ;
- le build ;
- la recette interactive.

La présence du code, un typecheck réussi ou un build réussi ne constituent pas une validation fonctionnelle interactive.

---

## 9. Tests et vérifications

Les vérifications doivent être proportionnées aux modifications réalisées.

Pour une mission modifiant du code TypeScript ou React, exécuter au minimum, lorsqu’ils existent :

```powershell
npm.cmd run typecheck
npm.cmd run build
```

Exécuter également les tests pertinents déjà disponibles.

Lorsqu’un comportement est ajouté ou corrigé :

ajouter ou adapter un test ciblé si l’architecture le permet raisonnablement ;
tester le cas nominal ;
tester les erreurs importantes ;
tester les invariants de sécurité ;
vérifier les non-régressions directement liées.

Ne pas installer un nouveau framework de tests pour une modification ciblée sans autorisation.

Ne pas déclarer une recette manuelle réussie si elle n’a pas réellement été effectuée.

Si une vérification est impossible ou dangereuse dans l’environnement disponible, l’indiquer explicitement au lieu de l’inventer.

Sous Windows, utiliser les commandes adaptées au projet, notamment npm.cmd lorsque nécessaire.

## 10. Réseau et dépendances

Ne pas effectuer d’accès Web, d’appel réseau réel, d’installation ou de mise à jour de dépendance sauf si la mission l’exige explicitement.

Ne pas modifier les comportements suivants sans demande explicite :

téléchargement distant ;
validation des URL ;
redirections ;
délais réseau ;
contrôle MIME ;
protocole iconotheque-image:// ;
imports Web ;
imports Midjourney.

Lorsqu’un test réseau réel n’est pas effectué, le signaler comme tel.

## 11. Architecture et frontières de sécurité

Respecter la séparation existante :

Electron main : fichiers, SQLite, protocoles, opérations privilégiées ;
preload : API limitée et typée exposée au renderer ;
renderer : interface React sans accès direct à SQLite ou au système de fichiers.

Le renderer ne constitue jamais une frontière de sécurité suffisante.

Toute opération sensible doit être validée définitivement dans le main process, notamment :

type et forme des paramètres ;
existence des identifiants ;
autorisation de l’opération ;
distinction entre image locale et référence distante ;
atomicité des écritures.

Utiliser :

des requêtes paramétrées ;
des transactions pour les opérations liées ;
un rollback en cas d’échec ;
des résultats structurés et typés.

Ne jamais exposer au renderer :

une requête SQL arbitraire ;
un accès direct à la base ;
un accès général au système de fichiers ;
un mécanisme permettant de contourner les invariants non destructifs.

## 12. Companion Chrome

Le companion Midjourney situé dans companions/mj-collector est un projet séparé du cœur Electron.

Ne pas le modifier pendant une mission portant sur le cœur Iconothèque, sauf demande explicite.

Réciproquement, une mission du companion ne doit pas modifier le cœur Electron sans autorisation explicite.

Les versions, rapports et documentations du companion restent distincts de ceux du cœur.

## 13. Style d’implémentation

Privilégier :

la solution minimale répondant au besoin réel ;
les conventions déjà présentes dans le projet ;
la réutilisation des composants existants ;
les types explicites ;
les messages utilisateur courts et non ambigus ;
les opérations atomiques ;
les diffs faciles à relire.

Éviter :

les abstractions prématurées ;
les nouveaux systèmes génériques pour un seul usage ;
les dépendances supplémentaires ;
la duplication de logique sensible ;
les commentaires décrivant un comportement différent du code ;
les formulations laissant croire qu’Iconothèque agit sur un original ou un serveur distant lorsqu’elle agit seulement sur son catalogue.

## 14. Clôture de mission

Avant de répondre :

inspecter le diff final ;
vérifier que seuls les fichiers nécessaires ont été touchés ;
vérifier la cohérence de version si elle a changé ;
exécuter les contrôles demandés ;
confirmer ce qui n’a pas été testé ;
créer le rapport demandé ;
proposer un message de commit sans créer le commit.

La réponse finale doit rester concise et contenir :

le résultat ;
la version finale ;
les principaux fichiers créés ou modifiés ;
les contrôles exécutés et leurs résultats ;
les recettes non réalisées ;
les limites éventuelles ;
le chemin du rapport ;
le message de commit proposé.
