// A EsriJSON parser
var esrijsonFormat = new ol.format.EsriJSON();

proj4.defs("EPSG:26913", "+proj=utm +zone=13 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");
proj4.defs("EPSG:26915", "+proj=utm +zone=15 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");
proj4.defs("WKID:102039", "+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=23 +lon_0=-96 +x_0=0 +y_0=0 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");

function checkOverlap(e, v) {
 return ((e[0] < v[2] && (e[2] > v[0])) && (e[3] > v[1]) && (e[1] < v[3]))
}

function breakExtent(e, b) {
 var va = [];
 var v = [(Math.floor(e[0] / b) * b), (Math.floor(e[1] / b) * b), 0, 0];
 v[2] = v[0] + b;
 v[3] = v[1] + b;
 for (var i = 0; i < 40; i++) {
  va[i] = v.slice();
  v[0] = v[2];
  v[2] = v[2] + b;
  if (v[0] > e[2]) {
   v[0] = (Math.floor(e[0] / b) * b);
   v[1] = v[3];
   v[2] = v[0] + b;
   v[3] = v[3] + b;
   if (v[1] > e[3]) {
    return va;
   }
  }
 }
 return va;
}

var sourceLocks = [];

// Given a EsriJSON format string, creates features.
function buildFeatures(data, projection, source) {
 // Parse features
 var features = esrijsonFormat.readFeatures(data, {
  featureProjection: projection
 });
 // Loop through the features
 for (var i = 0; i < features.length; i++) {
  // Get their extent
  var extent = features[i].getGeometry().getExtent();
  var matched = false;
  // Get features that overlap this one
  source.forEachFeatureInExtent(extent, function(f) {
   var fext = f.getGeometry().getExtent();
   matched = true;
   // Loop through coordinates, checking if they're different.
   for (var a = 0; a < 4; a++) {
    if (extent[a] != fext[a]) {
     matched = false;
    }
   }
  });
  // If we didn't find a match,
  if (!matched) {
   // Go ahead and add the feature.
   source.addFeature(features[i]);
  }
 }
}

function fetchSource(url, id, key, storage, source, projection) {
 // Try getting the data from storage
 if (!(sourceLocks.indexOf(id + key) >= 0)) {
  sourceLocks.push(id + key);
  storage.fetch(key, function(key, url, e, r) {
   // If successful, use it to build features
   if (e == 0) {
    buildFeatures(r.data, projection, source);
    dt = new Date()
    if (dt.setMonth(dt.getMonth() - 1) > new Date(r.dt)) {
     storageSatellite.del(key, function(e) {
      if (e != 0) {
       console.log("error deleting")
      }
     });
     doLater(2, function(done) {
      $.ajax({url: url, dataType: 'jsonp', success: function(response) {
       if (response.error) {
        // Remove the lock
        sourceLocks.splice(sourceLocks.indexOf(id + key), 1);
        console.log(response.error.message + '\n' +
                    response.error.details.join('\n'));
       }
       else {
        // Store response so we have it next time.
        storage.store(key, response, function() {});
       }
       done()
      }})
     });
    }
   }
   // If not, we'll have to fetch it.
   else {
    // Make request
    doLater(1, function(done) {
     $.ajax({url: url, dataType: 'jsonp', success: function(response) {
      if (response.error) {
       // Remove the lock
       sourceLocks.splice(sourceLocks.indexOf(id + key), 1);
       console.log(response.error.message + '\n' +
                   response.error.details.join('\n'));
      }
      else {
       // Build features using response
       buildFeatures(response, projection, source);
       // Store response so we have it next time.
       storage.store(key, response, function() {});
      }
      done()
     }})
    });
   }
  }.bind(this, key, url));
 }
}

// Style for the features and their text.
function getStyleBoilerplate(text) {
 return new ol.style.Style({
  fill: new ol.style.Fill({
   color: 'rgba(0, 0, 0, 0)'
  }),
  stroke: new ol.style.Stroke({
   color: '#0000ff',
   width: 2
  }),
  text: new ol.style.Text({
   textAlign: 'center',
   textBaseline: 'middle',
   font: 'normal 1em Verdana',
   text: text,
   fill: new ol.style.Fill({
    color: '#0000ff'
   }),
   stroke: new ol.style.Stroke({
    color: '#ffffff',
    width: 3
   }),
   offsetX: 0,
   offsetY: 0,
   rotation: 0
  })
 });
}

function performSearch(url, newResult, notFound, clearResults, getText) {
 // Show loading indicator.
 document.getElementById('searchresults').textContent = "Loading...";
 // make request
 $.ajax({
  url: url,
  dataType: 'jsonp',
  // Success?
  success: function(response) {
   clearResults();
   // If the response has an error value
   if (response["error"]) {
    notFound();
   }
   // If there was no error, but no results
   else if (!response.features.length > 0) {
    notFound();
   }
   else {
    // Loop through the results
    for (var i in response.features) {
     var result = {};
     result.name = getText(response.features[i]);
     // Get geometry of result
     var e = esrijsonFormat.readGeometry(response.features[i].geometry, {
      dataProjection: ol.proj.get("EPSG:3857"),
      featureProjection: "EPSG:3857"
     }).getExtent();
     // Find center by averaging max and min x,y coordinates
     result.x = (e[0]+e[2])/2;
     result.y = (e[1]+e[3])/2;
     newResult(result);
    }
   }
  },
  error: function(e) {
   notFound();
  }
 });
}
