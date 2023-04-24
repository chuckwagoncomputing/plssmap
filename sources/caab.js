function PLSSCAAB() {
 var id = 'caab';
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
  name: 'plsscaab'
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
    var url = 'https://www.agr.gc.ca/atlas/rest/services/mapservices/aafc_canada_land_parcels/MapServer/14/query?f=json&' +
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
  var qtr = "_";
  var sec = "_";
  var twp = "_";
  var rge = "_";
  var mer = "_";
  pieces = text.split(" ");
  for (var i = 0; i < pieces.length; i++) {
   if (qtr == "_" && i == 0 && "seswnenw".indexOf(pieces[i].toLowerCase()) >= 0) {
    qtr = pieces[i].toUpperCase();
   } else if (sec == "_" && !isNaN(parseInt(pieces[i]))) {
    sec = pieces[i];
   } else if (twp == "_" && !isNaN(parseInt(pieces[i]))) {
    twp = pieces[i];
   } else if (rge == "_" && !isNaN(parseInt(pieces[i]))) {
    rge = pieces[i];
   } else {
    mer = pieces[i].slice(-i).toUpperCase();
   }
  }
  // Form request
  var url;
  if (mer != "_") {
   url = "https://www.agr.gc.ca/atlas/rest/services/mapservices/aafc_canada_land_parcels/MapServer/14/query?where=QTR+LIKE+'" +
         qtr +
         "'+AND+SEC+=+" +
         sec +
         "+AND+TWP+=+" +
         twp +
         "+AND+RGE+=+" +
         rge +
         "+AND+MER+=+" +
         mer +
         "&layers=2&geometryType=esriGeometryEnvelope&f=json&outFields=QTR_DESCRIPTION"
  } else {
   url = "https://www.agr.gc.ca/atlas/rest/services/mapservices/aafc_canada_land_parcels/MapServer/14/query?where=QTR+LIKE+'" +
         qtr +
         "'+AND+SEC+=+" +
         sec +
         "+AND+TWP+=+" +
         twp +
         "+AND+RGE+=+" +
         rge +
         "&layers=2&geometryType=esriGeometryEnvelope&f=json&outFields=QTR_DESCRIPTION"
  }
  performSearch(url, newResult, notFound, clearResults, function(f) {
   return f.attributes.QTR_DESCRIPTION;
  });
 }
}

PLSSCAAB.prototype.element = document.currentScript;
