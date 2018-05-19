var cacheName = "com.chuckwagoncomputing.plssmap";

function precache() {
 return caches.open(cacheName).then(function (cache) {
  return cache.addAll([
   './index.html',
   './ol.js',
   './ol.css',
   './map.js',
   './storage.js',
   './util.js',
   './styles.css',
   './plss-neon.png',
   './font-awesome.min.css',
   './fontawesome-webfont.eot',
   './fontawesome-webfont.ttf',
   './fontawesome-webfont.woff2',
   './sources/list.js',
   './sources/usa.js'
  ]);
 });
}

function fromCache(request) {
 return caches.open(cacheName).then(function (cache) {
  return cache.match(request).then(function (matching) {
   return matching || Promise.reject('no-match');
  });
 });
}

self.addEventListener('install', function(evt) {
 evt.waitUntil(precache());
});

self.addEventListener('fetch', function(evt) {
 var fresh = fetch(evt.request).then(function(resp) {
  if (resp.ok) {
   caches.open(cacheName).then(function(cache) {
    return fetch(request).then(function(resp) {
     return cache.put(request, resp.clone()).then(function() {
      return resp;
     });
    });
   }).catch(function(){});
  }
  return resp;
 });
 var cached = caches.open(cacheName).then(function(cache) {
  return cache.match(evt.request).then(function(resp) {
   return resp || fresh;
  });
 }).catch(function(err) {
  return fresh;
 });
 evt.respondWith(cached);
});
