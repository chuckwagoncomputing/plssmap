function PLSSUSA() {
 var id = 'usa';
 var readyEvent = new Event('sourceready');

 // Get text for feature
 function getStyle(feature, resolution) {
  var t = "";
  // If we're zoomed out past a certain point, all
  //  our text will run together, so let's return nothing.
  if (resolution > 19) {
   t = '';
  } else {
   var divid = feature.get('FRSTDIVID');
   t = divid.substring(5, 7) + divid.substring(8, 9) + " " + divid.substring(10, 12) + divid.substring(13, 14) + " " + divid.substring(17, 19);
  }
  return getStyleBoilerplate(t);
 }

 var storage = new DataStorage({
  name: 'plssusa'
 }, function() {
  this.element.dispatchEvent(readyEvent);
 }.bind(this));

 var source = new ol.source.Vector({
  loader: function(extent, resolution, projection) {
   breakExtent(extent, 48000).forEach(function(v) {
    if (!checkOverlap(PLSSSources[id].extent, v)) {
     return;
    }
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
    fetchSource(url, id + JSON.stringify(v), storage, source, projection);
   });
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

 this.search = function(state, text, newResult, notFound, clearResults) {
  // Strip non-alphanumeric, remove leading and trailing spaces, and
  //  split into an array of (1+)space-separated values.
  var textT = text.replace(/[^0-9a-z]/gi, ' ').trim().split(/\s+/);
  var x = "__";
  var y = "__";
  var s = "__";
  var xd = "_";
  var yd = "_";
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
   // Or a plain number?
   else if (/[0-9]{1,2}/.test(textT[i])) {
    // Assume section number if we don't have one.
    // Try filling section first. This will take care of the convention I've noticed
    //    of using "<section> <n/s> <e/w>" without any marker letters.
    // If they use marker letters, the order doesn't matter, because x and y are filled
    //    before we get here.
    // If they use something like "<n/s> <e/w> <section>" without marker letters, they're
    //    out of luck.
    if (s == "__") {
     var s = ("_" + textT[i]).slice(-2);
    // Next we'll try Y (N/S) because that usually comes before E/W
    } else if (y == "__") {
     var y = ("_" + parseInt(textT[i])).slice(-2);
    } else if (x == "__") {
     var x = ("_" + parseInt(textT[i])).slice(-2);
    }
   }
  }
  var place = state.toUpperCase() + "___" + y + 0 + yd.toUpperCase() + 0 + x + 0 + xd.toUpperCase() + "0%25" + s;
  // Form request
  var url = "https://gis.blm.gov/arcgis/rest/services/Cadastral/BLM_Natl_PLSS_CadNSDI/MapServer/2/query?where=FRSTDIVID+LIKE+'" +
            place +
            "%25'&layers=2&geometryType=esriGeometryEnvelope&f=json&outFields=FRSTDIVID"
  performSearch(url, newResult, notFound, clearResults, function(f) {
   // Get the legal name, trim leading and trailing spaces, and replace multiple spaces with
   //  a single space.
   var divid = f.attributes.FRSTDIVID;
   return divid.substring(5, 7) + divid.substring(8, 9) + " " + divid.substring(10, 12) + divid.substring(13, 14) + " " + divid.substring(17, 19);
  });
 }
}

PLSSUSA.prototype.element = document.currentScript;
