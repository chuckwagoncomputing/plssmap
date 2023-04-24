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
