# Cave à vin

Inventaire de cave, utilisable hors ligne, installable sur le téléphone.

## Ce que ça fait

- **Cave** — la liste des références, avec recherche insensible aux accents et
  filtres par couleur. Chaque ligne porte sa couleur, son emplacement et l'état
  de son apogée.
- **Le geste courant est le plus rapide** : boire une bouteille, c'est un appui
  sur le `−` de sa ligne. Pas de formulaire à rouvrir.
- **Apogée** — en renseignant une fenêtre de dégustation, chaque bouteille est
  signalée « à garder », « à boire » ou « apogée dépassée », et le compteur
  d'en-tête dit combien de bouteilles sont à leur apogée.
- **Photo de l'étiquette** — une vignette par ligne, dépliable en plein écran.
  Le bouton *Photographier* ouvre l'appareil photo du téléphone ; l'image est
  réduite à 480 px et compressée avant d'être enregistrée, faute de quoi trois
  clichés suffiraient à saturer le stockage. Les étiquettes du relevé initial
  sont livrées avec l'application et fonctionnent hors ligne.
- **Ajouter** — cuvée, producteur, millésime, couleur, appellation, quantité,
  emplacement, fenêtre d'apogée, photo, notes.
- **Réglages** — export et import JSON, remise à zéro.

## Où sont les données

Dans le stockage local du navigateur, sur cet appareil, et **nulle part
ailleurs**. C'est ce qui permet de fonctionner sans réseau et sans compte, mais
cela veut dire trois choses :

1. La cave n'est pas synchronisée entre le téléphone et l'ordinateur.
2. Effacer les données du site efface la cave.
3. **L'export JSON est la seule sauvegarde.** Faites-le de temps en temps.

L'import ajoute les bouteilles du fichier à la cave en place, sans écraser. Les
photos prises depuis l'application voyagent dans l'export ; celles du relevé
initial sont de simples chemins de fichiers.

Une jauge dans les réglages montre la place occupée. Si le stockage déborde au
moment d'enregistrer, la bouteille est conservée et c'est sa photo qui est
abandonnée, avec un message : mieux vaut perdre une image qu'une référence.

## Mise à jour

Modifier `index.html`, pousser sur `main`, c'est tout : rien à incrémenter,
rien à rafraîchir à la main.

Le cache répond en premier — la page s'ouvre instantanément, hors ligne
comprise — et le service worker vérifie le réseau derrière. Dès qu'un fichier a
changé, il remplace sa copie et la page se recharge d'elle-même, en gardant
l'onglet ouvert et la position de lecture.

La vérification a lieu à l'ouverture, au retour au premier plan, au retour du
réseau, et toutes les trente secondes tant que la page est visible. Elle utilise
des requêtes conditionnelles : tant que rien ne bouge, le serveur répond `304`
et rien n'est téléchargé.

En cas de doute, depuis la console du navigateur :

```js
caveCache.check();  // forcer une vérification immédiate
caveCache.clear();  // vider le cache de l'application et le retélécharger
```

Vider le cache de l'application ne touche pas aux bouteilles : elles sont dans
le stockage local, pas dans le cache.

## Mise en ligne

Les fichiers vont à la racine de `main`, puis **Settings → Pages → Deploy from a
branch → `main` → `/ (root)`**. Les chemins sont relatifs, l'application
fonctionne donc sous un sous-dossier.

## Installation sur le téléphone

Ouvrir l'adresse dans Chrome, puis **⋮ → Ajouter à l'écran d'accueil**.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Toute l'application : structure, styles et scripts |
| `manifest.webmanifest` | Nom, couleurs et icônes de l'application installée |
| `sw.js` | Cache hors ligne et mise à jour automatique |
| `icon-*.png` | Icônes 192 et 512 px, plus une version maskable pour Android |
| `etiquettes/` | Les 27 photos d'étiquettes du relevé initial, réduites à 640 px |
| `.nojekyll` | Désactive Jekyll sur GitHub Pages : les fichiers sont servis tels quels |

## Avant

Ce dépôt a d'abord porté un carnet de voyage pour Berlin, en septembre 2026. Il
est conservé intact sur la branche `archive/berlin-2026`.
