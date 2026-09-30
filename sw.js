/**
 * sw.js — Service Worker do PWA.
 *
 * Estratégia: "cache primeiro, com atualização em segundo plano". No
 * install, pré-armazena o "app shell" (HTML/CSS/JS/ícones atuais) para que o
 * app abra offline logo na primeira instalação. Em todo fetch subsequente,
 * responde do cache imediatamente (rápido, funciona offline) e, em paralelo,
 * busca a versão da rede para atualizar o cache — na próxima abertura, a
 * versão nova já estará pronta.
 *
 * Nenhum dado do usuário (cards, progresso, histórico) passa por aqui: tudo
 * isso vive no localStorage, que o navegador mantém por conta própria,
 * independente deste Service Worker.
 *
 * MANUTENÇÃO: ao adicionar um novo arquivo .js/.css permanente ao projeto,
 * inclua-o em CORE_ASSETS e suba a versão de CACHE_NAME (ex.: "v2") — isso
 * garante que o cache antigo seja descartado e o novo, pré-carregado. Sem
 * subir a versão, arquivos novos ainda funcionam (são cacheados no primeiro
 * fetch online), só não entram no pré-cache da instalação.
 */

var CACHE_NAME = 'mf-cremers-v14';

var CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/pwaInstall.js',
  './js/storage.js',
  './js/srs.js',
  './js/cardsModel.js',
  './js/state.js',
  './js/stats.js',
  './js/session.js',
  './js/simulado.js',
  './js/catalogSync.js',
  './js/ui.js',
  './js/router.js',
  './js/views/dashboard.js',
  './js/views/sessionSetup.js',
  './js/views/study.js',
  './js/views/importView.js',
  './js/views/browse.js',
  './js/views/normaDetail.js',
  './js/views/statsView.js',
  './js/views/simuladoSetup.js',
  './js/views/simuladoRun.js',
  './js/views/settingsView.js',
  './js/app.js',
  './data/catalog.json',
  './data/lei-3268-1957.json',
  './data/resolucao-cfm-2056-2013.json',
  './data/resolucao-cfm-2336-2023.json',
  './data/regimento-interno-cremers.json',
  './data/lei-12842-2013.json',
  './data/resolucao-cfm-2147-2016.json',
  './data/resolucao-cfm-2062-2013.json',
  './data/resolucao-cfm-1980-2011.json',
  './data/resolucao-cfm-2416-2024.json',
  './data/resolucao-cfm-2314-2022.json',
  './data/resolucao-cfm-2057-2013.json',
  './data/resolucao-cfm-2152-2016.json',
  './data/redacao-medico-fiscal.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(CORE_ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // não intercepta requisições de outras origens

  event.respondWith(
    caches.match(request).then(function (cached) {
      var networkFetch = fetch(request).then(function (response) {
        if (response && response.status === 200) {
          var toCache = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(request, toCache); });
        }
        return response;
      }).catch(function () {
        return cached || caches.match('./index.html');
      });

      return cached || networkFetch;
    })
  );
});
