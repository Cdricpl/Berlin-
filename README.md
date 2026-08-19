# Berlin 2026 — carnet de voyage

Application web hors ligne pour le séjour à Berlin du 10 au 14 septembre 2026,
à l'occasion de la Coupe du monde féminine de basket-ball.

## Contenu

- **Programme** — les cinq journées heure par heure, du départ de Stavelot au retour,
  avec la carte des lieux et un schéma de secours qui fonctionne sans réseau.
- **Trajets** — FlixTrain aller-retour, sièges, et le parking de Cologne.
- **Berlin** — hôtel, itinéraires en transports, titres de transport, budget.
- **Matchs** — Uber Arena, emplacement des places, horaires des quatre rencontres.
- **Manger** — les adresses retenues, classées par moment du séjour.

## Mise en ligne

1. Déposer tous les fichiers à la racine de la branche `main`.
2. Dans le dépôt : **Settings → Pages**.
3. *Source* : **Deploy from a branch**, branche `main`, dossier `/ (root)`.
4. Après une minute, le carnet est disponible à l'adresse indiquée par GitHub,
   de la forme `https://<compte>.github.io/Berlin/`.

## Installation sur le téléphone

Ouvrir l'adresse dans Chrome, puis menu **⋮ → Ajouter à l'écran d'accueil**.
Le carnet s'installe comme une application, avec sa propre icône et sans barre
d'adresse.

## Fonctionnement hors ligne

Un service worker met en cache l'application au premier chargement. Les tuiles
de carte sont conservées au fur et à mesure de la consultation : **parcourir la
carte une fois avant le départ** suffit à la rendre lisible sans réseau à Berlin.
Elles ne sont jamais effacées par une mise à jour.

Le schéma hors ligne, lui, est dessiné dans la page et s'affiche en toutes
circonstances.

## Mise à jour

Modifier `index.html`, pousser sur `main`, c'est tout : **rien à incrémenter,
rien à rafraîchir à la main**.

Le cache répond en premier — la page s'ouvre instantanément, hors ligne
comprise — et le service worker vérifie le réseau derrière. Dès qu'un fichier a
changé, il remplace sa copie et la page se recharge d'elle-même, en gardant
l'onglet ouvert et la position de lecture. Un bref « Carnet mis à jour »
s'affiche en bas.

La vérification a lieu à l'ouverture, au retour au premier plan, au retour du
réseau, et toutes les trente secondes tant que le carnet est visible. Elle
utilise des requêtes conditionnelles : tant que rien ne bouge, le serveur
répond `304` et rien n'est téléchargé.

Deux détails qui font que le cache ne peut pas rester coincé :

- `sw.js` est enregistré avec `updateViaCache: 'none'`, donc toujours relu sur
  le réseau ;
- les vérifications utilisent `cache: 'no-cache'`, ce qui court-circuite le
  `max-age=600` que GitHub Pages applique aux fichiers.

En cas de doute, depuis la console du navigateur :

```js
berlinCache.check();  // forcer une vérification immédiate
berlinCache.clear();  // vider la coquille et la retélécharger (tuiles conservées)
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Toute l'application : structure, styles et scripts |
| `manifest.webmanifest` | Nom, couleurs et icônes de l'application installée |
| `sw.js` | Cache hors ligne et mise à jour automatique |
| `icon-*.png` | Icônes 192 et 512 px, plus une version maskable pour Android |
| `.nojekyll` | Désactive Jekyll sur GitHub Pages : les fichiers sont servis tels quels |
