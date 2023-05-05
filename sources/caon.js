function PLSSCAON() {
 var id = 'caon';
 var readyEvent = new Event('sourceready');

 // Get text for feature
 function getStyle(feature, resolution) {
  var t = "";
  // If we're zoomed out past a certain point, all
  //  our text will run together, so let's return nothing.
  if (resolution > 19) {
   t = '';
  } else {
   t = feature.get('GEOG_TWP') + " " + feature.get('LOT_IDENT') + " " + feature.get('CONCESSION');
  }
  return getStyleBoilerplate(t);
 }

 var storage = new DataStorage({
  name: 'plsscaon'
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
    var url = 'https://www.agr.gc.ca/atlas/rest/services/mapservices/aafc_canada_land_parcels/MapServer/6/query?f=json&' +
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
  updateWhileAnimating: true,
  source: source,
  style: getStyle,
  // Set extent. We'll use it to avoid trying to fetch data that doesn't exist.
  extent: PLSSSources[id].extent,
  maxResolution: 120,
  id: id
 });

}

PLSSCAON.prototype.element = document.currentScript;
