function PLSSUSA() {
 var id = 'usa';
 var readyEvent = new Event('sourceready');

 // Get text for feature
 function getText(feature, resolution) {
  // If we're zoomed out past a certain point, all
  //  our text will run together, so let's return nothing.
  if (resolution > 19) {
   return '';
  }
  else {
   var divid = feature.get('FRSTDIVID');
   return divid.substring(5, 7) + divid.substring(8, 9) + " " + divid.substring(10, 12) + divid.substring(13, 14) + " " + divid.substring(17, 19);
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
  name: 'plssusa'
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
   var v = [(Math.floor(extent[0] / 48000) * 48000), (Math.floor(extent[1] / 48000) * 48000), 0, 0];
   v[2] = v[0] + 48000;
   v[3] = v[1] + 48000;
   for (var i = 0; i < 10; i++) {
    // Check for overlap between the layer extent and view extent.
    if (checkOverlap(e, v)) {
     // Form URL to request.
     var url = 'https://gis.blm.gov/arcgis/rest/services/Cadastral/BLM_Natl_PLSS_CadNSDI/MapServer/2/query?f=json&' +
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
      storage.fetch(n, function(n, url, e, data) {
       // If successful, use it to build features
       if (e == 0) {
        buildFeatures(data, projection);
       }
       // If not, we'll have to fetch it.
       else {
        // Make request
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
        }});
       }
      }.bind(this, n, url));
     }
    }
    v[0] = v[2];
    v[2] = v[2] + 48000;
    if (v[0] > extent[2]) {
     v[0] = (Math.floor(extent[0] / 48000) * 48000);
     v[1] = v[3];
     v[2] = v[0] + 48000;
     v[3] = v[3] + 48000;
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
  id: id
 });

 this.search = function(state, text, newResult, notFound, clearResults) {
  // Strip non-alphanumeric, remove leading and trailing spaces, and
  //  split into an array of (1+)space-separated values.
  var textT = text.replace(/[^0-9a-z]/gi, ' ').trim().split(/\s+/);
  var x,y,s = "__";
  var xd,yd = "_";
  for (var i in textT) {
   // Is this a West/East value?
   if (/[0-9]{1,2}[W,E,w,e]/.test(textT[i])) {
    var x = ("_" + parseInt(textT[i])).slice(-2);
    var xd = textT[i].replace(/\d+/, '');
   }
   // Or a North/South value?
   else if (/[0-9]{1,2}[N,S,n,s]/.test(textT[i])) {
    var y = ("_" + parseInt(textT[i])).slice(-2);
    var yd = textT[i].replace(/\d+/, '');
   }
   // Or a section number?
   else if (/[0-9]{1,2}/.test(textT[i])) {
    var s = ("_" + textT[i]).slice(-2);
   }
  }
  var place = state.toUpperCase() + "___" + y + 0 + yd.toUpperCase() + 0 + x + 0 + xd.toUpperCase() + "0SN" + s;
  // Form request
  var url = "https://gis.blm.gov/arcgis/rest/services/Cadastral/BLM_Natl_PLSS_CadNSDI/MapServer/2/query?where=FRSTDIVID+LIKE+'" +
            place +
            "'&layers=2&geometryType=esriGeometryEnvelope&f=json&outFields=FRSTDIVID"
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
      // Get the legal name, trim leading and trailing spaces, and replace multiple spaces with
      //  a single space.
      var divid = response.features[i].attributes.FRSTDIVID;
      result.name = divid.substring(5, 7) + divid.substring(8, 9) + " " + divid.substring(10, 12) + divid.substring(13, 14) + " " + divid.substring(17, 19);
      // Get geometry of result
      var e = esrijsonFormat.readGeometry(response.features[i].geometry, {
       dataProjection: ol.proj.get("EPSG:4326"),
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
}

PLSSUSA.prototype.element = document.currentScript;
