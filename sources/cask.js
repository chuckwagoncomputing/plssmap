function PLSSCASK() {
 var id = 'cask';
 var readyEvent = new Event('sourceready');

 // Get text for feature
 function getStyle(feature, resolution) {
  var t = "";
  // If we're zoomed out past a certain point, all
  //  our text will run together, so let's return nothing.
  if (resolution > 19) {
   t = '';
  } else {
   t = feature.get('QTR_DESCRIPTION');
  }
  return getStyleBoilerplate(t);
 }

 var storage = new DataStorage({
  name: 'plsscask'
 }, function() {
  this.element.dispatchEvent(readyEvent);
 }.bind(this));

 var source = new ol.source.Vector({
  loader: function(extent, resolution, projection) {
   breakExtent(extent, 10000).forEach(function(v) {
    if (!checkOverlap(PLSSSources[id].extent, v)) {
     return;
    }
    // Form URL to request.
    var url = 'https://www.agr.gc.ca/atlas/rest/services/mapservices/aafc_canada_land_parcels/MapServer/10/query?f=json&' +
              'returnGeometry=true&spatialRel=esriSpatialRelIntersects&geometry=' +
              encodeURIComponent('{"xmin":' + v[0] +
                                 ',"ymin":' + v[1] +
                                 ',"xmax":' + v[2] +
                                 ',"ymax":' + v[3] +
                                 ',"spatialReference":{"wkid":102100}}') +
              '&geometryType=esriGeometryEnvelope&inSR=102100&outFields=*' +
              '&outSR=102100'
    fetchSource(url, id, JSON.stringify(v), storage, source, projection);
   });
  },
  strategy: ol.loadingstrategy.tile(ol.tilegrid.createXYZ({
   tileSize: 512
  }))
 });

 this.layer = new ol.layer.Vector({
  updateWhileInteracting: true,
  source: source,
  style: getStyle,
  // Set extent. We'll use it to avoid trying to fetch data that doesn't exist.
  extent: PLSSSources[id].extent,
  maxResolution: 120,
  id: id
 });

 this.search = function(state, text, newResult, notFound, clearResults) {
  var qtr = "__";
  var sec = "__";
  var twp = "__";
  var rge = "__";
  var mer = "_";
  pieces = text.split(" ");
  for (var i = 0; i < pieces.length; i++) {
   if (qtr == "__" && i == 0 && "seswnenw".indexOf(pieces[i].toLowerCase()) >= 0) {
    qtr = pieces[i].toUpperCase().padStart(2, '_');
   } else if (sec == "__" && !isNaN(parseInt(pieces[i]))) {
    sec = pieces[i].padStart(2, '_');
   } else if (twp == "__" && !isNaN(parseInt(pieces[i]))) {
    twp = pieces[i].padStart(2, '_');
   } else if (rge == "__" && !isNaN(parseInt(pieces[i]))) {
    rge = pieces[i].padStart(2, '_');
   } else {
    mer = pieces[i].slice(-1).toUpperCase().padStart(1, '_');
   }
  }
  // Form request
  var url = "https://www.agr.gc.ca/atlas/rest/services/mapservices/aafc_canada_land_parcels/MapServer/10/query?where=QSECT+LIKE+'" +
            qtr +
            "'+AND+PSECT+LIKE+'" +
            sec +
            "'+AND+PTWP+LIKE+'" +
            twp +
            "'+AND+PRGE+LIKE+'" +
            rge +
            "'+AND+PMER+LIKE+'" +
            mer +
            "'&layers=2&geometryType=esriGeometryEnvelope&f=json&outFields=QTR_DESCRIPTION"
  performSearch(url, newResult, notFound, clearResults, function(f) {
   return f.attributes.QTR_DESCRIPTION;
  });
 }
}

PLSSCASK.prototype.element = document.currentScript;
