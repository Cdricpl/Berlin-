/* Service worker du carnet Berlin 2026.

   Mise à jour automatique : il n'y a plus de numéro de version à incrémenter,
   ni de rafraîchissement manuel à faire sur le téléphone.

   - Coquille de l'application : le cache répond en premier, donc l'affichage
     est instantané et fonctionne hors ligne. En parallèle, chaque fichier est
     redemandé au réseau en contournant le cache HTTP du navigateur.
   - Si l'octet a changé, la nouvelle copie remplace l'ancienne et la page est
     prévenue : elle se recharge d'elle-même, en gardant l'onglet et la position.
   - Tuiles de carte : cache permanent, jamais purgé par une mise à jour.
     Une carte parcourue avant le départ reste lisible sans réseau à Berlin. */

var SHELL = 'berlin-shell';
var TILES = 'berlin-tiles';
var KEEP = [SHELL, TILES];

/* Fichiers de l'application, mis en cache dès l'installation. */
var SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

/* Ressources distantes figées par leur numéro de version dans l'URL :
   inutile de les revalider, elles ne changeront jamais à cette adresse. */
var CDN_FILES = [
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

var INDEX = './index.html';

function isTile(url) {
  return url.hostname === 'tile.openstreetmap.org' ||
         url.hostname.lastIndexOf('.tile.openstreetmap.org') ===
           url.hostname.length - '.tile.openstreetmap.org'.length;
}

function isCdn(url) {
  return url.hostname === 'cdnjs.cloudflare.com';
}

/* Demande au réseau en court-circuitant le cache HTTP du navigateur.
   GitHub Pages sert les fichiers avec max-age=600 : sans cela, une mise à jour
   pourrait rester invisible dix minutes.

   'no-cache' oblige à revalider auprès du serveur à chaque fois, mais laisse
   l'ETag faire son travail : tant que rien ne bouge, la réponse est un 304 de
   quelques octets. La vérification régulière ne coûte donc presque rien, ce qui
   compte pour un carnet consulté en itinérance. */
function fromNetwork(url) {
  return fetch(new Request(url, { cache: 'no-cache', credentials: 'same-origin' }));
}

/* Empreinte du corps de la réponse : c'est elle qui dit si un fichier a bougé,
   sans dépendre d'un en-tête ETag que tous les hébergeurs ne donnent pas. */
function fingerprint(res) {
  return res.clone().arrayBuffer().then(function (buf) {
    var b = new Uint8Array(buf), h = 2166136261, i;
    for (i = 0; i < b.length; i++) { h = Math.imul(h ^ b[i], 16777619); }
    return b.length + ':' + (h >>> 0);
  });
}

function differs(a, b) {
  return Promise.all([fingerprint(a), fingerprint(b)]).then(function (f) {
    return f[0] !== f[1];
  });
}

function tellClients(msg) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(function (list) { list.forEach(function (c) { c.postMessage(msg); }); });
}

/* Revalide un fichier de la coquille. Renvoie true si son contenu a changé. */
function revalidate(url) {
  return caches.open(SHELL).then(function (cache) {
    return Promise.all([cache.match(url), fromNetwork(url)]).then(function (r) {
      var cached = r[0], fresh = r[1];
      if (!fresh || !fresh.ok) return false;
      var check = cached ? differs(cached, fresh) : Promise.resolve(false);
      return check.then(function (changed) {
        return cache.put(url, fresh.clone()).then(function () { return changed; });
      });
    });
  }).catch(function () { return false; });
}

/* Passe toute la coquille en revue et prévient la page si quelque chose a bougé. */
function syncShell() {
  return Promise.all(SHELL_FILES.map(revalidate)).then(function (results) {
    var changed = results.some(Boolean);
    if (changed) return tellClients({ type: 'berlin-updated' }).then(function () { return true; });
    return false;
  });
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (cache) {
      /* Échecs tolérés un par un : une ressource distante absente ne doit pas
         faire capoter l'installation entière. */
      var shell = SHELL_FILES.map(function (u) {
        return fromNetwork(u).then(function (res) {
          if (res && res.ok) return cache.put(u, res);
        }).catch(function () {});
      });
      var cdn = CDN_FILES.map(function (u) {
        return cache.add(new Request(u, { mode: 'no-cors' })).catch(function () {});
      });
      return Promise.all(shell.concat(cdn));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      /* Les tuiles d'une ancienne version sont récupérées avant le ménage :
         elles sont trop coûteuses à retélécharger pour être jetées. */
      var oldTiles = keys.filter(function (k) {
        return k !== TILES && k.indexOf('tiles-') === 0;
      });
      return Promise.all(oldTiles.map(function (k) {
        return Promise.all([caches.open(k), caches.open(TILES)]).then(function (c) {
          return c[0].keys().then(function (reqs) {
            return Promise.all(reqs.map(function (rq) {
              return c[0].match(rq).then(function (res) {
                if (res) return c[1].put(rq, res);
              });
            }));
          });
        });
      })).then(function () {
        return Promise.all(keys.map(function (k) {
          if (KEEP.indexOf(k) === -1) return caches.delete(k);
        }));
      });
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  /* Tuiles de carte : cache d'abord, puis téléchargement et conservation. */
  if (isTile(url)) {
    e.respondWith(
      caches.open(TILES).then(function (cache) {
        return cache.match(req).then(function (hit) {
          var net = fetch(req).then(function (res) {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
    return;
  }

  /* Leaflet : URL versionnée, donc cache d'abord sans revalidation. */
  if (isCdn(url)) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          if (res && (res.ok || res.type === 'opaque')) {
            var copy = res.clone();
            caches.open(SHELL).then(function (c) { c.put(req, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;

  /* Navigation : la page vient du cache, donc elle s'ouvre instantanément,
     et la vérification de mise à jour se fait derrière, sans la retarder. */
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match(INDEX).then(function (hit) {
        if (hit) { e.waitUntil(syncShell()); return hit; }
        return fromNetwork(INDEX).then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(SHELL).then(function (c) { c.put(INDEX, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  /* Le reste des fichiers du site : cache d'abord, réseau en secours. */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(SHELL).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return caches.match(INDEX); });
    })
  );
});

self.addEventListener('message', function (e) {
  var data = e.data || {};

  /* La page redemande une vérification : au retour au premier plan, et
     régulièrement tant qu'elle est visible. */
  if (data.type === 'berlin-check') {
    e.waitUntil(syncShell());
    return;
  }

  /* Purge complète de la coquille, tuiles épargnées. */
  if (data.type === 'berlin-clear') {
    e.waitUntil(
      caches.delete(SHELL).then(function () {
        return caches.open(SHELL).then(function (cache) {
          return Promise.all(SHELL_FILES.map(function (u) {
            return fromNetwork(u).then(function (res) {
              if (res && res.ok) return cache.put(u, res);
            }).catch(function () {});
          }));
        });
      }).then(function () { return tellClients({ type: 'berlin-updated' }); })
    );
  }
});
