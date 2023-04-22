// IndexedDB storage abstraction
// Takes options:
//  storeName: name of the store to be used
// Takes a callback to be called when store has been opened
//  Callback is called with 0 for success, 1+ for error.
function DSIndexedDB(options, callback) {
// Private:
 var storeName = options.storeName;
 var db;
 var reqOpen = window.indexedDB.open('com.chuckwagoncomputing.plssmap.' + storeName, 1);

 reqOpen.onsuccess = function(event) {
  // Store our db object
  db = event.target.result;
  callback(0);
 };

 reqOpen.onerror = function() {
  callback(1);
 };

 reqOpen.onupgradeneeded = function(event) {
  // Store our db object
  db = event.target.result;
  // Check for the store
  if (! db.objectStoreNames.contains(storeName)) {
   // Create it if it doesn't exist
   var store = db.createObjectStore(storeName, {keyPath: 'name', autoIncrement: false, storage: 'persistent'});
   store.transaction.oncomplete = function(e) {};

   store.transaction.onerror = function() {
    callback(1);
   };
  }
 };

// Privileged:
 // Store a key, value pair
 // Takes a callback, which is, like the constructor, passed 0 or 1+
 this.store = function(name, data, callback) {
  var store = db.transaction(storeName, 'readwrite').objectStore(storeName);
  var object = {};
  object.name = name;
  object.data = data;
  // Timestamp
  object.dt = Date.now();
  var reqPut = store.put(object);
  reqPut.onsuccess = function() {
   callback(0);
  };
  reqPut.onerror = function() {
   callback(1);
  }
 }

 // Get a value with a key
 // Takes a callback which is passed 0 or 1+ as the first value
 //  and the data retrieved as the second.
 this.fetch = function(name, callback) {
  var store = db.transaction(storeName).objectStore(storeName);
  var reqGet = store.get(name);
  reqGet.onsuccess = function(event) {
   if (reqGet.result) {
    callback(0, reqGet.result);
   }
   else {
    callback(1);
   }
  }
  reqGet.onerror = function() {
   callback(1);
  }
 }

 this.delete = function(name, callback) {
  var store = db.transaction(storeName, 'readwrite').objectStore(storeName);
  var reqDel = store.delete(name);
  reqDel.onsuccess = function() {
   callback(0);
  }
  reqDel.onerror = function() {
   callback(1);
  }
 }
}

// Data storage abstraction.
function DataStorage(options, callback) {
// Public:
 this.name = options.name || 'data';
 this.max_cache = options.max_cache || 5;

// Private:
 var availableIndexedDB = false;
 var availableFileSystem = false;
 var availableLocalStorage = false;
 var availableWebSQL = false;

 var callbackLocks = []

 function primeCallback(i) {
  callbackLocks[i] = 0;
  for ( var d in callbackLocks) {
   if (callbackLocks[d] == 1) {
    return;
   }
  }
  callback(0);
 }
 // Check what storage methods are available
 if (window.indexedDB) {
  // Create IndexedDB store
  callbackLocks[0] = 1;
  var storeIndexedDB = new DSIndexedDB({ storeName: this.name }, function(e) {
   if (e == 0) {
    availableIndexedDB = true;
    primeCallback(0);
   }
  });
 }
 else if (window.requestFileSystem || window.webkitRequestFileSystem) {
  availableFileSystem = true;
 }
 else if (window.localStorage) {
  availableLocalStorage = true;
 }
 else if (window.openDatabase) {
  availableWebSQL = true;
 }
 else {
  callback(1);
 }

// Privileged:
 this.store = function(name, data, callback) {
  if (availableIndexedDB) {
   storeIndexedDB.store(name, data, function(e) {
    callback(e);
   });
  }
  else if (availableFileSystem) {
  }
  else if (availableLocalStorage) {
  }
  else if (availableWebSQL) {
  }
  else {
   callback(1);
  }
 }

 this.fetch = function(name, callback) {
  if (availableFileSystem) {
  }
  else if (availableIndexedDB) {
   storeIndexedDB.fetch(name, function(e, data) {
    if (e == 0) {
     callback(0, data);
    }
    else {
     callback(1, data);
    }
   });
  }
  else if (availableLocalStorage) {
  }
  else if (availableWebSQL) {
  }
  else {
   callback(1);
  }
 }

 this.del = function(name, callback) {
  if (availableFileSystem) {
  }
  else if (availableIndexedDB) {
   storeIndexedDB.delete(name, function(e) {
    if (e == 0) {
     callback(0);
    }
    else {
     callback(1);
    }
   });
  }
  else if (availableLocalStorage) {
  }
  else if (availableWebSQL) {
  }
  else {
   callback(1);
  }
 }
};
