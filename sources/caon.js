function PLSSCAON() {
 var id = 'caon';
 var readyEvent = new Event('sourceready');

 // Get text for feature
 function getText(feature, resolution) {
  // If we're zoomed out past a certain point, all
  //  our text will run together, so let's return nothing.
  if (resolution > 19) {
   return '';
  }
  else {
   return feature.get('GEOG_TWP') + " " + feature.get('LOT_IDENT') + " " + feature.get('CONCESSION');
  }
 }

 // Style for the features and their text.
 function getStyle(feature, resolution) {
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
    text: getText(feature, resolution),
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

 var storage = new DataStorage({
  name: 'plsscaon'
 }, function() {
  this.element.dispatchEvent(readyEvent);
 }.bind(this));

 // Given a EsriJSON format string, creates features.
 function buildFeatures(data, projection) {
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

 var sourceLocks = [];

 var source = new ol.source.Vector({
  loader: function(extent, resolution, projection) {
   var e = PLSSSources[id].extent;
   var v = [(Math.floor(extent[0] / 10000) * 10000), (Math.floor(extent[1] / 10000) * 10000), 0, 0];
   v[2] = v[0] + 10000;
   v[3] = v[1] + 10000;
   for (var i = 0; i < 40; i++) {
    // Check for overlap between the layer extent and view extent.
    if (checkOverlap(e, v)) {
     // Form URL to request.
     var url = 'https://www.agr.gc.ca/atlas/rest/services/mapservices/aafc_canada_land_parcels/MapServer/6/query?f=json&' +
               'returnGeometry=true&spatialRel=esriSpatialRelIntersects&geometry=' +
               encodeURIComponent('{"xmin":' + v[0] +
                                  ',"ymin":' + v[1] +
                                  ',"xmax":' + v[2] +
                                  ',"ymax":' + v[3] +
                                  ',"spatialReference":{"wkid":102100}}') +
               '&geometryType=esriGeometryEnvelope&inSR=102100&outFields=*' +
               '&outSR=102100'
     // Try getting the data from storage
     var n = JSON.stringify(v)
     if (!(sourceLocks.indexOf(n) >= 0)) {
      sourceLocks.push(n);
      storage.fetch(n, function(n, url, e, r) {
       // If successful, use it to build features
       if (e == 0) {
        buildFeatures(r.data, projection);
        dt = new Date()
        if (dt.setMonth(dt.getMonth() - 1) > new Date(r.dt)) {
         storageSatellite.del(n, function(e) {
          if (e != 0) {
           console.log("error deleting")
          }
         });
         doLater(2, function(done) {
          $.ajax({url: url, dataType: 'jsonp', success: function(response) {
           if (response.error) {
            // Remove the lock
            sourceLocks.splice(sourceLocks.indexOf(n), 1);
            console.log(response.error.message + '\n' +
                        response.error.details.join('\n'));
           }
           else {
            // Store response so we have it next time.
            storage.store(n, response, function() {});
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
           sourceLocks.splice(sourceLocks.indexOf(n), 1);
           console.log(response.error.message + '\n' +
                       response.error.details.join('\n'));
          }
          else {
           // Build features using response
           buildFeatures(response, projection);
           // Store response so we have it next time.
           storage.store(n, response, function() {});
          }
          done()
         }})
        });
       }
      }.bind(this, n, url));
     }
    }
    v[0] = v[2];
    v[2] = v[2] + 10000;
    if (v[0] > extent[2]) {
     v[0] = (Math.floor(extent[0] / 10000) * 10000);
     v[1] = v[3];
     v[2] = v[0] + 10000;
     v[3] = v[3] + 10000;
     if (v[1] > extent[3]) {
      break;
     }
    }
   }
  },
  strategy: ol.loadingstrategy.tile(ol.tilegrid.createXYZ({
   tileSize: 512
  }))
 });

 this.layer = new ol.layer.Vector({
  source: source,
  style: getStyle,
  // Set extent. We'll use it to avoid trying to fetch data that doesn't exist.
  extent: PLSSSources[id].extent,
  maxResolution: 120,
  id: id
 });

}

PLSSCAON.prototype.element = document.currentScript;
