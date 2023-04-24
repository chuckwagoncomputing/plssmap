function PLSSCAMB() {
 var id = 'camb';
 var readyEvent = new Event('sourceready');

 // Get text for feature
 function getStyle(feature, resolution) {
  var t = "";
  // If we're zoomed out past a certain point, all
  //  our text will run together, so let's return nothing.
  if (resolution > 19) {
   t = '';
  } else {
   t = feature.get('QTR_DESCRIPTION_EN');
  }
  return getStyleBoilerplate(t);
 }

 var storage = new DataStorage({
  name: 'plsscamb'
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
    var url = 'https://www.agr.gc.ca/atlas/rest/services/mapservices/aafc_canada_land_parcels/MapServer/3/query?f=json&' +
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
  var twp = "___";
  var rge = "__";
  var mer = "__";
  pieces = text.split(" ");
  for (var i = 0; i < pieces.length; i++) {
   if (qtr == "__" && i == 0 && "seswnenw".indexOf(pieces[i].toLowerCase()) >= 0) {
    qtr = pieces[i].toUpperCase().padStart(2, '_');
   } else if (sec == "__" && !isNaN(parseInt(pieces[i]))) {
    sec = pieces[i].padStart(2, '_');
   } else if (twp == "___" && !isNaN(parseInt(pieces[i]))) {
    twp = pieces[i].padStart(3, '_');
   } else if (rge == "__" && !isNaN(parseInt(pieces[i]))) {
    rge = pieces[i].padStart(2, '_');
   } else {
    mer = pieces[i].toUpperCase().padStart(2, '_');
   }
  }
  // Form request
  var url = "https://www.agr.gc.ca/atlas/rest/services/mapservices/aafc_canada_land_parcels/MapServer/3/query?where=QTR_CODE+LIKE+'" +
            qtr +
            "'+AND+SEC_CODE+LIKE+'" +
            sec +
            "'+AND+TWP_CODE+LIKE+'" +
            twp +
            "'+AND+RGE_CODE+LIKE+'" +
            rge +
            "'+AND+MER_CODE+LIKE+'" +
            mer +
            "'&layers=2&geometryType=esriGeometryEnvelope&f=json&outFields=QTR_DESCRIPTION_EN"
  performSearch(url, newResult, notFound, clearResults, function(f) {
   return f.attributes.QTR_DESCRIPTION_EN;
  });
 }
}

PLSSCAMB.prototype.element = document.currentScript;
