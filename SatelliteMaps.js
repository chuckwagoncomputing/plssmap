class SatelliteMaps extends ol.source.TileJSON {
  constructor(options) {
    const hidpi = options.hidpi !== undefined ? options.hidpi : false;

    const url = 'https://api.maptiler.com/maps/hybrid/tiles.json?key=' + options.key;

    super({
      url: url,
      cacheSize: options.cacheSize,
      crossOrigin: 'anonymous',
      interpolate: options.interpolate,
      opaque: true,
      projection: ol.proj.get('EPSG:3857'),
      reprojectionErrorThreshold: options.reprojectionErrorThreshold,
      state: 'loading',
      tileLoadFunction: options.tileLoadFunction,
      tilePixelRatio: hidpi ? 2 : 1,
      wrapX: options.wrapX !== undefined ? options.wrapX : true,
      transition: options.transition,
      zDirection: options.zDirection,
    });

    this.hidpi_ = hidpi;
    this.culture_ = options.culture !== undefined ? options.culture : 'en-us';
    this.maxZoom_ = options.maxZoom !== undefined ? options.maxZoom : -1;
    this.apiKey_ = options.key;
    this.imagerySet_ = options.imagerySet;

    fetch(url)
      .then((response) => response.json())
      .then((json) => this.handleImageryMetadataResponse(json, url))
      .catch(() => this.getMetadataFromCache(url));

  }

  getApiKey() {
    return this.apiKey_;
  }

  getImagerySet() {
    return this.imagerySet_;
  }

  getMetadataFromCache(url) {
   storageSatellite.fetch(url, function(e, r) {
    if (e == 0) {
     this.handleImageryMetadataResponse(r.data);
    }
   }.bind(this));
  }

  handleImageryMetadataResponse(response, url) {
   if (typeof(response.tiles) != "undefined") {
    storageSatellite.store(url, response, function() {})
    this.setState('ready');
   } else {
    this.setState('error');
   }
  }
}
