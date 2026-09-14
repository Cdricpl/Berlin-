/* Service worker de la cave.

   Mise à jour automatique : aucun numéro de version à incrémenter, aucun
   rafraîchissement manuel. Le cache répond en premier — affichage instantané,
   hors ligne compris — puis chaque fichier est revalidé en arrière-plan. Si
   l'octet a changé, la nouvelle copie remplace l'ancienne et la page se
   recharge d'elle-même. */

var SHELL = 'cave-shell';
var KEEP = [SHELL];

var SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

var INDEX = './index.html';

/* Court-circuite le cache HTTP du navigateur. GitHub Pages sert les fichiers
   avec max-age=600 : sans cela une mise à jour resterait invisible dix minutes.
   'no-cache' revalide auprès du serveur mais laisse l'ETag faire son travail :
   tant que rien ne bouge, la réponse est un 304 de quelques octets. */
function fromNetwork(url) {
  return fetch(new Request(url, { cache: 'no-cache', credentials: 'same-origin' }));
}

/* Empreinte du corps de la réponse : c'est elle qui dit si un fichier a bougé,
   sans dépendre d'un en-tête que tous les hébergeurs ne donnent pas. */
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

function syncShell() {
  return Promise.all(SHELL_FILES.map(revalidate)).then(function (results) {
    if (results.some(Boolean)) return tellClients({ type: 'cave-updated' }).then(function () { return true; });
    return false;
  });
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (cache) {
      return Promise.all(SHELL_FILES.map(function (u) {
        return fromNetwork(u).then(function (res) {
          if (res && res.ok) return cache.put(u, res);
        }).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      /* Fait au passage le ménage des caches du carnet de Berlin. */
      return Promise.all(keys.map(function (k) {
        if (KEEP.indexOf(k) === -1) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* Navigation : la page vient du cache, la vérification se fait derrière. */
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

  if (data.type === 'cave-check') { e.waitUntil(syncShell()); return; }

  if (data.type === 'cave-clear') {
    e.waitUntil(
      caches.delete(SHELL).then(function () {
        return caches.open(SHELL).then(function (cache) {
          return Promise.all(SHELL_FILES.map(function (u) {
            return fromNetwork(u).then(function (res) {
              if (res && res.ok) return cache.put(u, res);
            }).catch(function () {});
          }));
        });
      }).then(function () { return tellClients({ type: 'cave-updated' }); })
    );
  }
});
