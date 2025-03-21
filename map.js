if (document.URL.indexOf("file://") != 0 && navigator.serviceWorker && window.caches) {
 navigator.serviceWorker.register('sw.js', {scope: './'});
}

// This will hold our OpenLayers map object
var map;
var geolocation;
var storageSettings;
var storageSatellite;
var controllerSearch;

function getPLSSSource(id, cb) {
 if (PLSSSources[id]) {
  if (PLSSSources[id].ready) {
   cb(PLSSSources[id].obj);
  } else if (!PLSSSources[id].loading) {
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

function ControllerMarker() {
 var isOpen = false
 var drawer
 var input
 var markerButton
 var cancelButton
 var saveButton
 var currentFeature

 this.saveMarkers = function() {
  var markers = []
  for (var i = 0; i < sourceMarkers.getFeatures().length; i++) {
   marker = sourceMarkers.getFeatures()[i]
   if (marker.getStyle().getText()) {
    markers.push({
     label: marker.getStyle().getText().getText(),
     coords: marker.getGeometry().getCoordinates()
    })
   }
   else {
    markers.push({
     label: "",
     coords: marker.getGeometry().getCoordinates()
    })
   }
  }
  storageSettings.store("markers", JSON.stringify(markers), function() {})
 }

 this.open = function() {
  if (!isOpen) {
   isOpen = true;
   document.body.classList.add('has-active-menu');
   document.getElementById('push-content').classList.add('has-slide-bottom');
   drawer.classList.add('is-active');
  }
 }

 this.close = function() {
  if (isOpen) {
   isOpen = false;
   document.body.classList.remove('has-active-menu');
   document.getElementById('push-content').classList.remove('has-push-right');
   drawer.classList.remove('is-active');
  }
 }

 this.attachDrawer = function(id) {
  drawer = document.getElementById(id)
 }

 this.attachInput = function(id) {
  input = document.getElementById(id)
 }

 this.attachMarkerButton = function(id) {
  markerButton = document.getElementById(id)
  markerButton.addEventListener("click", function(){
   if (isOpen) {
    controllerMarker.close()
    return;
   }
   controllerMarker.open()
   input.value = ""
   input.parentNode.classList.remove('is-dirty');
   var center = map.getView().getCenter()
   currentFeature = new ol.Feature({
    geometry: new ol.geom.Point(center),
   });
   var iconStyle = new ol.style.Style({
    image: new ol.style.Icon({
     anchor: [0.5, 1],
     anchorXUnits: 'fraction',
     anchorYUnits: 'fraction',
     src: 'marker_blue.png'
    })
   });
   currentFeature.setStyle(iconStyle);
   sourceMarkers.addFeature(currentFeature)
  });
 }

 this.attachCancelButton = function(id) {
  cancelButton = document.getElementById(id)
  cancelButton.addEventListener("click", function(){
   controllerMarker.close()
   sourceMarkers.removeFeature(currentFeature)
   controllerMarker.saveMarkers()
  });
 }

 this.attachSaveButton = function(id) {
  saveButton = document.getElementById(id)
  saveButton.addEventListener("click", function(){
   controllerMarker.close()
   currentFeature.setStyle(new ol.style.Style({
    image: new ol.style.Icon({
     anchor: [0.5, 1],
     anchorXUnits: 'fraction',
     anchorYUnits: 'fraction',
     src: 'marker_blue.png'
    }),
    text: new ol.style.Text({
     text: input.value,
     textAlign: 'center',
     textBaseline: 'middle',
     font: 'normal 1em Verdana',
     fill: new ol.style.Fill({
      color: '#0000ff'
     }),
     stroke: new ol.style.Stroke({
      color: '#ffffff',
      width: 3
     }),
     offsetX: 0,
     offsetY: -50,
     rotation: 0
    })
   }));
   controllerMarker.saveMarkers()
  }.bind(this));
 }

 this.edit = function(ft) {
  currentFeature = ft
  controllerMarker.open()
  var coordinates = currentFeature.getGeometry().getCoordinates();
  if (currentFeature.getStyle().getText() && currentFeature.getStyle().getText().getText().length > 0) {
   input.value = currentFeature.getStyle().getText().getText()
   input.parentNode.classList.add('is-dirty');
  } else {
   input.value = ""
   input.parentNode.classList.remove('is-dirty');
  }
 }

 this.setup = function() {
  storageSettings.fetch("markers", function(e, m) {
   if (e == 0) {
    markers = JSON.parse(m.data)
    for (var i = 0; i < markers.length; i++) {
     var iconFeature = new ol.Feature({
      geometry: new ol.geom.Point(markers[i].coords),
     });
     var iconStyle = new ol.style.Style({
      image: new ol.style.Icon({
       anchor: [0.5, 1],
       anchorXUnits: 'fraction',
       anchorYUnits: 'fraction',
       src: 'marker_blue.png'
      }),
      text: new ol.style.Text({
       text: markers[i].label,
       textAlign: 'center',
       textBaseline: 'middle',
       font: 'normal 1em Verdana',
       fill: new ol.style.Fill({
        color: '#0000ff'
       }),
       stroke: new ol.style.Stroke({
        color: '#ffffff',
        width: 3
       }),
       offsetX: 0,
       offsetY: -50,
       rotation: 0
      })
     });
     iconFeature.setStyle(iconStyle);
     sourceMarkers.addFeature(iconFeature);
    }
   }
  }.bind(this))
 }
}

var controllerMarker = new ControllerMarker();

// An object to manage the geolocation UI
function ControllerCenter() {
// Private:
 // Whether to keep centered
 var centerOnPosition = 1;
 // The button
 var centerButton;

 // A function to change the style of the button.
 //  Takes a bool. True in 'keep centered' mode
 function styleCenterButton(t) {
  if (typeof(centerButton) == "undefined") {
   return;
  }
  if (t == 2) {
   centerButton.classList.remove('loading');
   centerButton.classList.add('active');
  } else if (t == 1) {
   centerButton.classList.remove('active');
   centerButton.classList.add('loading');
  } else {
   centerButton.classList.remove('active');
   centerButton.classList.remove('loading');
  }
 }

// Privileged:
 // Turns 'keep centered' mode on if passed 1 or 2
 this.center = function(t) {
  centerOnPosition = t;
  styleCenterButton(centerOnPosition);
 }

 // Get whether 'keep centered' mode is on
 this.shouldCenter = function() {
  return centerOnPosition > 0;
 }

 // Attach the center button so we can listen for clicks and style it
 this.attachCenterButton = function(id) {
  centerButton = document.getElementById(id);
  styleCenterButton(centerOnPosition);
  centerButton.addEventListener('click', function() {
   if (centerOnPosition == 0) {
    startGeolocation();
   } else {
    this.center(0);
   }
  }.bind(this));
 }
};

var controllerCenter = new ControllerCenter();

// A controller for the side menu
function ControllerMenu() {
// Private:
 var isOpen = false;
 var drawer

// Privileged:
 this.open = function() {
  if (!isOpen) {
   isOpen = true;
   document.body.classList.add('has-active-menu');
   document.getElementById('push-content').classList.add('has-push-right');
   drawer.classList.add('is-active');
   document.getElementById('mask').classList.add('is-active');
   this.populateMarkerList();
  }
 }

 this.close = function() {
  if (isOpen) {
   isOpen = false;
   document.body.classList.remove('has-active-menu');
   document.getElementById('push-content').classList.remove('has-push-right');
   drawer.classList.remove('is-active');
   document.getElementById('mask').classList.remove('is-active');
  }
 }

 this.attachMenuButton = function(id) {
  document.getElementById(id).addEventListener('click', function() {
   controllerMarker.close();
   this.open();
  }.bind(this));
  document.getElementById('mask').addEventListener('click', function(e) {
   e.preventDefault();
   this.close();
  }.bind(this));
 }

 this.attachDrawer = function(id) {
  drawer = document.getElementById(id)
 }

 this.attachSearchTabButton = function(id) {
  document.getElementById(id).addEventListener('click', function() {
   document.getElementById("searchView").style.display = "inline-flex"
   document.getElementById("markerView").style.display = "none"
  });
 }

 this.attachMarkerTabButton = function(id) {
  document.getElementById(id).addEventListener('click', function() {
   document.getElementById("searchView").style.display = "none"
   document.getElementById("markerView").style.display = "inline-flex"
   this.populateMarkerList();
  }.bind(this));
 }

 function clearMarkerList() {
  document.getElementById('markerlist').textContent = "";
 }

 this.populateMarkerList = function() {
  clearMarkerList();
  var markers = sourceMarkers.getFeatures();
  markers.sort(function(a, b) {
   var ta = a.getStyle().getText().getText().toLowerCase();
   var tb = b.getStyle().getText().getText().toLowerCase();
   if ( ta > tb ) {
    return 1;
   } else if ( ta < tb ) {
    return -1;
   } else {
    return 0;
   }
  });
  for (var i = 0; i < markers.length; i++) {
   var marker = markers[i]
   if (marker.getStyle().getText()) {
    // Get the result template
    var template = document.getElementById("searchResult");
    // Fill it in with our data
    var button = template.content.querySelector(".search-result-button");
    button.textContent = marker.getStyle().getText().getText();
    button.dataset.x = marker.getGeometry().getCoordinates()[0];
    button.dataset.y = marker.getGeometry().getCoordinates()[1];
    // Create the element
    var clone = document.importNode(template.content, true);
    // Add an event listener
    clone.querySelector(".search-result-button").addEventListener('click', function(e) {
     // Disable centering
     controllerCenter.center(0);
     // Set center at the result
     view.setCenter([+e.target.dataset.x, +e.target.dataset.y]);
     view.setZoom(15)
     // Close the menu
     controllerMenu.close();
    });
    // Add the element to the search results
    document.getElementById("markerlist").appendChild(clone);
   }
  }
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
  plsssource = source.split("-")[0]
  sourcedivision = source.split("-")[1]
  getPLSSSource(plsssource, function(ret) {
   if (typeof ret == "object") {
    ret.search(sourcedivision, text, newResult, notFound, clearResults);
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
   controllerCenter.center(0);
   // Set center at the result
   view.setCenter([+e.target.dataset.x, +e.target.dataset.y]);
   view.setZoom(15)
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
  stateSelector = document.getElementById(id);
  storageSettings.fetch("laststate", function(e, s) {
   if (e == 0) {
    stateSelector.value = s.data
    labels = document.getElementsByTagName('label');
    for (var i = 0; i < labels.length; i++ ) {
     if (labels[i].htmlFor == input.id) {
      var s = stateSelector.value.split("-")[0]
      labels[i].textContent = "Try " + PLSSSources[s].hint;
     }
    }
   }
  })
  stateSelector.addEventListener("change", function() {
   storageSettings.store("laststate", stateSelector.value, function() {})
   labels = document.getElementsByTagName('label');
   for (var i = 0; i < labels.length; i++ ) {
    if (labels[i].htmlFor == input.id) {
     var s = stateSelector.value.split("-")[0]
     labels[i].textContent = "Try " + PLSSSources[s].hint;
    }
   }
  });
 }

 this.attachSearchField = function(id) {
  input = document.getElementById(id);
  // Search when Return/Enter is pressed
  input.onkeypress = function(e){
   if (!e) e = window.event;
   var keyCode = e.keyCode || e.which;
   if (keyCode == '13'){
    if (input.value) {
     findSection(input.value, stateSelector.value);
    }
   }
  }
 }

 this.attachSearchButton = function(id) {
  // Search when the button is pressed
  document.getElementById(id).addEventListener('click', function() {
   if (input.value) {
    findSection(input.value, stateSelector.value);
   }
  });
 }
}

function loadAndStoreTile(url, img) {
 // Set a handler for when the image loads
 img.addEventListener('load', function(e) {
  // Create a canvas
  var canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  var ctx = canvas.getContext("2d");
  // Copy the image to the canvas
  ctx.drawImage(img, 0, 0);
  // Get the image data
  var data = canvas.toDataURL("image/png");
  // And store it.
  storageSatellite.store(url, data, function() {});
 });
 img.src = url;
}

// This is the function called to load the tile
function tileLoadFunction(url) {
 return new Promise((resolve, reject) => {
  // Get the <img> element from the tile object
  var img = new Image();
  img.crossOrigin = "anonymous";
  img.fetchPriority = "high";
  img.addEventListener('load', () => resolve(img));
  img.addEventListener('error', () => reject(new Error('load failed')));
  // Try getting it from the database
  storageSatellite.fetch(url, function(e, r) {
   // If successful, use it
   if (e == 0) {
    img.src = r.data;
    dt = new Date()
    if (dt.setMonth(dt.getMonth() - 1) > new Date(r.dt)) {
     storageSatellite.del(src, function(e) {
      if (e != 0) {
       console.log("error deleting")
      }
     });
     var tempImg = new Image()
     tempImg.crossOrigin = "anonymous";
     tempImg.fetchPriority = "low";
     loadAndStoreTile(r.src, tempImg);
    }
   }
   // If we didn't have it stored, we'll need to fetch it
   else {
    loadAndStoreTile(url, img);
   }
  });
 });
}

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
 zIndex: 5,
 updateWhileInteracting: true,
 updateWhileAnimating: true,
 source: new ol.source.Vector({
  features: [
   featurePosition,
   featureAccuracy
  ]
 }),
});

var sourceMarkers = new ol.source.Vector({
 features: []
});

var layerLabels = new ol.layer.VectorTile({
 declutter: true,
 zIndex: 3
});

var layerMarkers = new ol.layer.Vector({
 updateWhileInteracting: true,
 updateWhileAnimating: true,
 source: sourceMarkers,
 zIndex: 4
});

var PLSSLock = [];

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
   if (!found && PLSSLock.indexOf(id) == -1) {
    PLSSLock.push(id);
    getPLSSSource(id, function(ret) {
     if (typeof ret == "object") {
      map.addLayer(ret.layer);
      PLSSLock.splice(PLSSLock.indexOf(id), 1);
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
   controllerCenter.center(0)
  }
  else {
   view.setCenter(geolocation.getPosition());
  }
 }
};

function setupGeolocation() {
 geolocation = new ol.Geolocation({
  projection: view.getProjection(),
  trackingOptions: {
   enableHighAccuracy: true,
   timeout: 15000,
  }
 });

 // When the accuracy changes, change the indicator size.
 geolocation.on('change:accuracyGeometry', function() {
  featureAccuracy.setGeometry(geolocation.getAccuracyGeometry());
 });

 // When the position changes, move the indicator.
 geolocation.on('change:position', function() {
  var coordinates = geolocation.getPosition();
  featurePosition.setGeometry(coordinates ?
    new ol.geom.Point(coordinates) : null);
  updateView();
  if (controllerCenter.shouldCenter()) {
   controllerCenter.center(2);
  }
 });

 startGeolocation();
}

function startGeolocation() {
 geolocation.setTracking(true);
 controllerCenter.center(1);
 if (geolocation.getPosition()) {
  controllerCenter.center(2);
  updateView();
 }
 setTimeout(function() {
  if (typeof(geolocation.getPosition()) == "undefined") {
   controllerCenter.center(0)
  }
 }, 15200)
}

class Drag extends ol.interaction.Pointer {
  constructor() {
    super({
      handleDownEvent: handleDownEvent,
      handleDragEvent: handleDragEvent,
      handleMoveEvent: handleMoveEvent,
      handleUpEvent: handleUpEvent,
    });

    this.coordinate_ = null;
    this.cursor_ = 'pointer';
    this.feature_ = null;
    this.previousCursor_ = undefined;
  }
}

function handleDownEvent(evt) {
  const map = evt.map;

  const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
    return feature;
  });

  if (feature && feature.getStyle() && feature.getStyle().getImage() != "undefined") {
   this.coordinate_ = evt.coordinate;
   this.feature_ = feature;
  } else {
   return false;
  }

  return !!feature;
}

function handleDragEvent(evt) {
  const deltaX = evt.coordinate[0] - this.coordinate_[0];
  const deltaY = evt.coordinate[1] - this.coordinate_[1];

  const geometry = this.feature_.getGeometry();
  geometry.translate(deltaX, deltaY);

  this.coordinate_[0] = evt.coordinate[0];
  this.coordinate_[1] = evt.coordinate[1];
}

function handleMoveEvent(evt) {
  if (this.cursor_) {
    const map = evt.map;
    const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
      return feature;
    });
    const element = evt.map.getTargetElement();
    if (feature && feature.getStyle() && feature.getStyle().getImage() != "undefined") {
      if (element.style.cursor != this.cursor_) {
        this.previousCursor_ = element.style.cursor;
        element.style.cursor = this.cursor_;
      }
    } else if (this.previousCursor_ !== undefined) {
      element.style.cursor = this.previousCursor_;
      this.previousCursor_ = undefined;
    }
  }
}

function handleUpEvent() {
  this.coordinate_ = null;
  this.feature_ = null;
  controllerMarker.saveMarkers();
  return false;
}

function buildMap() {
 setupGeolocation();
 controllerMarker.setup();

 var token = 'AAPTxy8BH1VEsoebNVZXo8HurP7Qyy5RCX7Kbny-R8948WjW4ganF451HewCx0RiGBq5otCQyziMxNCBXMHp1ua3G7nbqelf8y6fWqwKlcJ0SSxbal6hzCKfmM44FjrGHAmOFhOp_fgbsJjvWrRHmq229_HdgpKY5OPEVEQG1SRHATu244CL1Czy05Ix8Kye-Vf8YGUrSpuPzuCFozmb20EJklNtI7GpQZvDDR06I5KX-3EIhHxWB-0ZJjrC5fFC6z_HAT1_DmjDnQUs';

 olms.applyStyle(layerLabels, "https://www.arcgis.com/sharing/rest/content/items/4a3922d6d15f405d8c2b7a448a7fbad2/resources/styles/root.json?f=pjson", {
  accessToken: token,
  webfonts: ""
 }).then(function () {
  var source = layerLabels.getSource();
  var loadFunction = source.getTileLoadFunction();
  source.setTileLoadFunction(function (tile, url) {
    return loadFunction(tile, url.replace("tile/", "VectorTileServer/tile/"));
  });
 });


 map = new ol.Map({
  target: document.getElementById('map'),
  layers: [
   new ol.layer.Tile({
    preload: Infinity,
    source: new ol.source.ImageTile({
     maxZoom: 19,
     loader: async function(z, x, y) {
      const url = 'https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/' + z + '/' + y + '/' + x + '?token=' + token
      const image = await tileLoadFunction(url);
      return image;
     },
     crossOrigin: 'anonymous',
     projection: ol.proj.get('EPSG:3857'),
     interpolate: true,
     transition: 500,
    })
   }),
   layerGeolocation,
   layerMarkers,
   layerLabels
  ],
  view: view,
  interactions: ol.interaction.defaults.defaults().extend([new Drag()]),
  controls: ol.control.defaults.defaults().extend([new ol.control.Rotate({
   label: "",
   compassClassName: "ol-compass fa fa-arrow-up",
  })])
 });

 storageSettings.fetch("lastpos", function(e, p) {
  if (e == 0) {
   map.getView().setCenter(p.data)
  }
 })

 // We need to disable geolocation if the user drags the map.
 map.on('pointermove', function(e) {
  if (e.dragging) {
   controllerCenter.center(0);
  }
 });

 map.addEventListener('moveend', function() {
  findPLSS();
 });

 map.on('singleclick', function(e) {
  var feature = map.forEachFeatureAtPixel(e.pixel,
   function(feature) {
    return feature;
  });
  if (feature && feature.getStyle()) {
   if (feature.getStyle().getImage() != "undefined") {
    controllerMarker.edit(feature)
   }
  }
  else {
   controllerMarker.close()
   controllerMarker.saveMarkers()
  }
 });
}

function setupApp() {
 controllerSearch = new ControllerSearch();
 buildMap();
 controllerMarker.attachInput("markerName");
 controllerMarker.attachMarkerButton("controlMarker");
 controllerMarker.attachCancelButton("buttonCancelMarker");
 controllerMarker.attachSaveButton("buttonSaveMarker");
 controllerMarker.attachDrawer("markerInput")
 controllerCenter.attachCenterButton("controlCenter");
 controllerMenu.attachMenuButton("controlMenu");
 controllerMenu.attachDrawer("menu")
 controllerMenu.attachSearchTabButton("searchTabButton")
 controllerMenu.attachMarkerTabButton("markerTabButton")
 controllerSearch.attachStateSelector("searchstate");
 controllerSearch.attachSearchField("controlSearchInput");
 controllerSearch.attachSearchButton("controlSearchButton");
}

window.addEventListener('load', function() {
 document.addEventListener('deviceready', function() {
  if (typeof cordova != "undefined") {
   if (typeof cordova.plugins != "undefined") {
    if (typeof cordova.plugins.permissions != "undefined") {
     var p = cordova.plugins.permissions;
     p.requestPermission(p.ACCESS_FINE_LOCATION);
    }
   }
  }
  document.addEventListener('pause', function() {
   storageSettings.store("lastpos", map.getView().getCenter(), function() {})
  }, false);
 });


 // Detect if we are on a touch device, and add class to document.
 // This is so we can style differently.
 if (!("ontouchstart" in document.documentElement)) {
  document.documentElement.className += " no-touch";
 }
 else {
  document.documentElement.className += " touch";
 }

 waitCount = 2;

 storageSettings = new DataStorage(
  {name: "settings"},
  function(e) {
   if (--waitCount == 0) setupApp();
 });

 storageSatellite = new DataStorage(
  {name: 'satellite'},
  function(e) {
   if (--waitCount == 0) setupApp();
 });
});
