// A EsriJSON parser
var esrijsonFormat = new ol.format.EsriJSON();

proj4.defs("EPSG:26913", "+proj=utm +zone=13 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");
proj4.defs("EPSG:26915", "+proj=utm +zone=15 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");
proj4.defs("WKID:102039", "+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=23 +lon_0=-96 +x_0=0 +y_0=0 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");

function checkOverlap(e, v) {
 return ((e[0] < v[2] && (e[2] > v[0])) && (e[3] > v[1]) && (e[1] < v[3]))
}
