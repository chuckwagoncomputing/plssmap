if (document.URL.indexOf("file://") != 0 && navigator.serviceWorker && window.caches) {
 navigator.serviceWorker.register('sw.js', {scope: './'});
}

// This will hold our OpenLayers map object
var map;
var geolocation;

function getPLSSSource(id, cb) {
 if (PLSSSources[id]) {
  if (PLSSSources[id].ready) {
   cb(PLSSSources[id].obj);
  }
  else if (!PLSSSources[id].loading) {
   PLSSSources[id].loading = true;
   var el = document.createElement('script');
   el.src = ('./sources/' + id + '.js');
   el.addEventListener('sourceready', function() {
    PLSSSources[id].ready = true;
    cb(PLSSSources[id].obj);
   });
   el.onload = function() {
    if (typeof window[PLSSSources[id].name] == "function") {
     PLSSSources[id].obj = new window[PLSSSources[id].name];
    }
    else {
     cb(2);
    }
   }
   document.body.appendChild(el);
  }
  else {
   setTimeout(function(id, cb) { getPLSSSource(id, cb)}.bind(this, id, cb), 150);
  }
 }
 else {
  cb(1);
 }
}

// And this our OL view object.
var view = new ol.View({
 center: [0, 0],
 zoom: 13
});

// An object to manage the geolocation UI
function ControllerCenter() {
// Private:
 // Whether to keep centered
 var centerOnPosition = true;
 // The button
 var centerButton;

 // A function to change the style of the button.
 //  Takes a bool. True in 'keep centered' mode
 function styleCenterButton(t) {
  if (t) {
   centerButton.style.background = '#0000ff';
   centerButton.style.color = '#ffffff';
  }
  else {
   centerButton.style.background = '#ffffff';
   centerButton.style.color = '#000000';
  }
 }

// Privileged:
 // Turns 'keep centered' mode on if passed 'true'
 this.center = function(t) {
  centerOnPosition = t;
  styleCenterButton(centerOnPosition);
 }

 // Get whether 'keep centered' mode is on
 this.shouldCenter = function() {
  return centerOnPosition;
 }

 // Attach the center button so we can listen for clicks and style it
 this.attachCenterButton = function(id) {
  centerButton = document.getElementById("controlCenter");
  centerButton.addEventListener('click', function() {
   centerOnPosition = !centerOnPosition;
   styleCenterButton(centerOnPosition);
   updateView();
  });
 }
};

var controllerCenter = new ControllerCenter();

// A controller for the side menu
function ControllerMenu() {
// Private:
 var isOpen = false;

// Privileged:
 this.open = function() {
  if (!isOpen) {
   isOpen = true;
   document.body.classList.add('has-active-menu');
   document.getElementById('push-content').classList.add('has-push-right');
   document.getElementById('menu').classList.add('is-active');
   document.getElementById('mask').classList.add('is-active');
  }
 }

 this.close = function() {
  if (isOpen) {
   isOpen = false;
   document.body.classList.remove('has-active-menu');
   document.getElementById('push-content').classList.remove('has-push-right');
   document.getElementById('menu').classList.remove('is-active');
   document.getElementById('mask').classList.remove('is-active');
  }
 }

 this.attachMenuButton = function(id) {
  document.getElementById(id).addEventListener('click', function() {
   this.open();
  }.bind(this));
  document.getElementById('mask').addEventListener('click', function(e) {
   e.preventDefault();
   this.close();
  }.bind(this));
 }
}

var controllerMenu = new ControllerMenu();

function ControllerSearch() {
// Private:
 var input;
 var stateSelector;

 function findSection(text, source) {
  clearResults();
  // Show loading indicator.
  document.getElementById('searchresults').textContent = "Loading...";
  getPLSSSource('usa', function(ret) {
   if (typeof ret == "object") {
    ret.search(source, text, newResult, notFound, clearResults);
   }
  });
 }

 function notFound() {
  document.getElementById('searchresults').textContent = "No Results Found";
 }

 function clearResults() {
  document.getElementById('searchresults').textContent = "";
 }

 function newResult(result) {
  // Get the result template
  var template = document.getElementById("searchResult");
  // Fill it in with our data
  var button = template.content.querySelector(".search-result-button");
  button.textContent = result.name;
  button.dataset.x = result.x;
  button.dataset.y = result.y;
  // Create the element
  var clone = document.importNode(template.content, true);
  // Add an event listener
  clone.querySelector(".search-result-button").addEventListener('click', function(e) {
   // Disable centering
   controllerCenter.center(false);
   // Set center at the result
   view.setCenter([+e.target.dataset.x, +e.target.dataset.y]);
   // Close the menu
   controllerMenu.close();
   // Get the PLSS data.
   findPLSS();
  });
  // Add the element to the search results
  document.getElementById("searchresults").appendChild(clone);
 }

// Privileged:
 this.attachStateSelector = function(id) {
  stateSelector = id;
 }

 this.attachSearchField = function(id) {
  input = id;
  // Search when Return/Enter is pressed
  document.getElementById(input).onkeypress = function(e){
   if (!e) e = window.event;
   var keyCode = e.keyCode || e.which;
   if (keyCode == '13'){
    var value = document.getElementById(input).value;
    if (value) {
     findSection(value, document.getElementById(stateSelector).value);
    }
   }
  }
 }

 this.attachSearchButton = function(id) {
  // Search when the button is pressed
  document.getElementById(id).addEventListener('click', function() {
   var value = document.getElementById(input).value;
   if (value) {
    findSection(value, document.getElementById(stateSelector).value);
   }
  });
 }
}

var controllerSearch = new ControllerSearch();

var storageSatellite = new DataStorage({
 name: 'satellite'
}, function() {});

function sourceSatellite(options) {
 // We inherit from the Bing Maps source
 ol.source.BingMaps.call(this, options);
 var sourceBing = new ol.source.BingMaps(options);
 // This is the function called to load the tile
 this.tileLoadFunction = function(imageTile, src) {
  // Get the <img> element from the tile object
  var imgElement = imageTile.getImage();
  // Try getting it from the database
  storageSatellite.fetch(src, function(e, r) {
   // If successful, use it
   if (e == 0) {
    imgElement.src = r.data;
    dt = new Date()
    if (dt.setMonth(dt.getMonth() - 1) > new Date(r.dt)) {
     storageSatellite.del(src, function(e) {
      console.log("error deleting")
     });
    }
   }
   // If we didn't have it stored, we'll need to fetch it
   else {
    doLater(1, function(done) {
     // Set a handler for when the image loads
     imgElement.onload = function(e) {
      done()
      // Create a canvas
      var canvas = document.createElement("canvas");
      canvas.width = imgElement.width;
      canvas.height = imgElement.height;
      var ctx = canvas.getContext("2d");
      // Copy the image to the canvas
      ctx.drawImage(imgElement, 0, 0);
      // Get the image data
      var data = canvas.toDataURL("image/png");
      // And store it.
      storageSatellite.store(src, data, function() {});
     };
     // Call Bing Maps' tileLoadFunction.
     // It will populate the src field for the image element,
     //  and when the image is done loading our handler will be called.
     (sourceBing.getTileLoadFunction())(imageTile, src);
    }
   }
  });
 }
}

// Inherit necessary methods from BingMaps.
ol.inherits(sourceSatellite, ol.source.BingMaps);

// Geolocation accuracy indicator
var featureAccuracy = new ol.Feature();
// Geolocation position indicator
var featurePosition = new ol.Feature();

featurePosition.setStyle(new ol.style.Style({
  image: new ol.style.Circle({
   radius: 6,
   fill: new ol.style.Fill({
    color: '#0000FF'
   }),
   stroke: new ol.style.Stroke({
    color: '#fff',
    width: 2
   })
  })
 })
);

var layerGeolocation = new ol.layer.Vector({
 source: new ol.source.Vector({
  features: [
   featurePosition,
   featureAccuracy
  ]
 }),
});

function findPLSS() {
 var e = map.getView().calculateExtent(map.getSize());
 for (var id in PLSSSources) {
  var v = PLSSSources[id].extent;
  if (checkOverlap(e, v)) {
   var found = false;
   var layers = map.getLayers()
   for (var layer = 0; layer < layers.getLength(); layer++) {
    if  (layers.item(layer).get("id") == id) {
     found = true;
     break;
    }
   }
   if (!found) {
    getPLSSSource(id, function(ret) {
     if (typeof ret == "object") {
      map.addLayer(ret.layer);
     }
    });
   }
  }
 }
}

function updateView() {
 if (controllerCenter.shouldCenter()) {
  var position = geolocation.getPosition();
  if ( typeof position == "undefined" ) {
   console.log("position undefined");
   setupGeolocation();
  }
  else {
   view.setCenter(geolocation.getPosition());
  }
 }
 findPLSS();
};

function setupGeolocation() {
 geolocation = new ol.Geolocation({
  projection: view.getProjection(),
  trackingOptions: {
   enableHighAccuracy: true,
   timeout: 5000,
   maxAge: 60000
  }
 });

 // When the accurace changes, change the indicator size.
 geolocation.on('change:accuracyGeometry', function() {
  featureAccuracy.setGeometry(geolocation.getAccuracyGeometry());
 });

 // When the position changes, move the indicator.
 geolocation.on('change:position', function() {
  var coordinates = geolocation.getPosition();
  featurePosition.setGeometry(coordinates ?
    new ol.geom.Point(coordinates) : null);
  updateView();
 });

 geolocation.setTracking(true);
}

function buildMap() {
 setupGeolocation();

 map = new ol.Map({
  target: document.getElementById('map'),
  layers: [
   new ol.layer.Tile({
    source: new sourceSatellite({
     // Bing Maps API Key
     key: 'Au8GZIFgFRT9Z_UAruGCjW87lglVzXrcmdByTD3oin9eVKqfwEokFC77vwoQ15XN',
     // Bing Maps tile set
     imagerySet: 'AerialWithLabels',
     maxZoom: 19
    })
   }),
   layerGeolocation
  ],
  view: view
 });

 // Make a listener so we initially snap to our location.
 var update = map.addEventListener('postcompose', function() {
  updateView();
 });
 map.render();
 // Remove listener so we don't continue to do so.
 map.removeEventListener('postcompose', update);

 // We need to disable geolocation if the user drags the map.
 map.on('pointermove', function(e) {
  if (e.dragging) {
   controllerCenter.center(false);
  }
 });

 map.addEventListener('moveend', function() {
  findPLSS();
 });
}

window.addEventListener('load', function() {
 document.addEventListener('deviceready', function() {
  if (typeof cordova != "undefined") {
   if (typeof cordova.plugins != "undefined") {
    if (typeof cordova.plugins.permissions != "undefined") {
     var p = cordova.plugins.permissions;
     p.requestPermission(p.ACCESS_FINE_LOCATION, function(){
      setTimeout(function(){updateView();}, 2000);
     }, function(){});
    }
   }
  }
 });
 // Detect if we are on a touch device, and add class to document.
 // This is so we can style differently.
 if (!("ontouchstart" in document.documentElement)) {
  document.documentElement.className += " no-touch";
 }
 else {
  document.documentElement.className += " touch";
 }
 buildMap();
 controllerCenter.attachCenterButton("controlCenter");
 controllerMenu.attachMenuButton("controlMenu");
 controllerSearch.attachStateSelector("searchstate");
 controllerSearch.attachSearchField("controlSearchInput");
 controllerSearch.attachSearchButton("controlSearchButton");
});
