# Convention de versionnage Iconotheque

## Principe general

Iconotheque utilise une convention interne compatible avec SemVer et npm :

```text
MAJOR.MINOR.PATCH
MAJOR.MINOR.PATCH-prerelease.N
```

Le projet peut rester longtemps en `0.x`. Une version `1.0.0` ne sera visee que lorsque le comportement utilisateur, le stockage et les migrations seront suffisamment stabilises. Il n'y a pas besoin de forcer artificiellement une `1.0`.

## Versions stables

Les versions stables utilisent un numero de patch pair.

Exemples autorises :

- `0.1.0`
- `0.1.2`
- `0.1.4`
- `0.2.0`
- `0.2.2`

Une version stable correspond a un etat demonstrable, coherent et documente. Elle peut etre une version de gel, de stabilisation, ou plus tard une version distribuable.

## Versions de travail

Les versions de travail utilisent un numero de patch impair avec un suffixe compatible SemVer.

Exemples autorises :

- `0.1.3-dev.1`
- `0.1.3-dev.42`
- `0.1.5-alpha.7`
- `0.2.1-dev.3`

Ces versions signalent un travail en cours. Elles ne doivent pas etre presentees comme une base stable, meme si elles peuvent etre testables localement.

## Regle pair / impair

- Patch pair sans suffixe : version stable.
- Patch impair avec suffixe : version de travail.
- Patch impair sans suffixe : a eviter.

Exemples :

- `0.1.2` : stable.
- `0.1.3-dev.1` : travail en cours apres `0.1.2`.
- `0.1.4` : stable suivante.

## Exemples a eviter

Versions a eviter dans `package.json` :

- `0.1.1` comme version durable stable.
- `0.1.3` sans suffixe.
- `0.1.2.1`
- `0.1.2.42`
- `0.1.2-dev-42`

Les versions a quatre nombres ne sont pas compatibles SemVer pour npm. Si un compteur de build est necessaire, utiliser un suffixe compatible SemVer ou un champ separe.

Exemples preferables :

- `0.1.3-dev.42`
- `0.1.3-alpha.7`
- `0.1.2+build.42` si le contexte accepte les metadonnees SemVer.

## Version technique et version affichee

La version technique canonique est celle de `package.json`. Elle doit rester compatible SemVer ; les autres affichages et documents s’alignent sur elle.

La version affichee dans l'interface peut etre plus lisible si necessaire, par exemple :

- `Iconotheque V0.1.2`
- `Iconotheque V0.1.3 dev 4`

Si la version affichee differe de la version technique, la documentation doit expliquer clairement la correspondance.

## Convention actuelle

- `0.1.0` : gel initial V0.1.
- `0.1.1` : stabilisation transitoire post-gel.
- `0.1.2` : stable post-gel alignee avec la convention patch pair.
- `0.1.3-dev.20` : version de travail ouverte par la mission de canonicalisation documentaire.

La dernière version stable documentée est `0.1.2`. La convention pair/impair ci-dessus est une convention propre au projet, et non une règle SemVer universelle.
