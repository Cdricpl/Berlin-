# Instructions pour Claude Code

Contexte : dépôt GitHub nommé `Berlin`, destiné à héberger un carnet de voyage
hors ligne (PWA) via GitHub Pages.

## Tâche

Déployer le contenu de cette archive à la racine du dépôt `Berlin`, puis activer
GitHub Pages.

## Contraintes

1. **Les sept fichiers vont à la RACINE du dépôt**, pas dans un sous-dossier.
   Si `index.html` se retrouve dans `Berlin/index.html` à l'intérieur du dépôt,
   Pages sert une page vide et la portée du service worker casse.
2. **Ne pas modifier les chemins relatifs.** `manifest.webmanifest`, `sw.js` et
   les icônes sont référencés en relatif (`./`) pour fonctionner sous
   `https://<compte>.github.io/Berlin/`.
3. **Ne pas ajouter de build, de bundler ni de dépendance npm.** L'application
   est volontairement en fichiers statiques, sans étape de compilation.
4. **Ne pas remplacer Leaflet par une autre bibliothèque de cartographie.**
   Il est chargé depuis cdnjs et mis en cache par le service worker.

## Étapes

```bash
git clone https://github.com/<compte>/Berlin.git
cd Berlin
# copier ici les fichiers de l'archive
git add .
git commit -m "Carnet de voyage Berlin 2026 (PWA hors ligne)"
git push origin main
```

Puis activer Pages :

```bash
gh api -X POST repos/<compte>/Berlin/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```

Ou manuellement : **Settings → Pages → Deploy from a branch → `main` → `/ (root)`**.

## Vérifications attendues après déploiement

- `https://<compte>.github.io/Berlin/` affiche le carnet.
- `https://<compte>.github.io/Berlin/manifest.webmanifest` renvoie du JSON.
- `https://<compte>.github.io/Berlin/sw.js` renvoie du JavaScript
  avec l'en-tête `Content-Type: text/javascript`.
- Dans les outils de développement, onglet Application : le service worker
  est `activated` et le manifeste liste bien trois icônes.
- Après une modification de `index.html` poussée sur `main`, un onglet resté
  ouvert se recharge de lui-même dans les trente secondes, sans `Ctrl+F5`.
- La bannière d'installation apparaît dans Chrome sur Android.

## Pour toute modification ultérieure de `index.html`

Rien à faire de plus que pousser le fichier. Il n'y a plus de `VERSION` à
incrémenter : le service worker compare l'empreinte de chaque fichier de la
coquille au fichier publié, remplace ce qui a changé et demande à la page de se
recharger seule. Voir la section « Mise à jour » du README.

Ne pas réintroduire de nom de cache versionné : les caches `berlin-shell` et
`berlin-tiles` sont volontairement stables, c'est ce qui permet aux tuiles de
carte déjà téléchargées de survivre à une mise à jour.
