function quadKey(tileCoord) {
  const z = tileCoord[0];
  const digits = new Array(z);
  let mask = 1 << (z - 1);
  let i, charCode;
  for (i = 0; i < z; ++i) {
    // 48 is charCode for 0 - '0'.charCodeAt(0)
    charCode = 48;
    if (tileCoord[1] & mask) {
      charCode += 1;
    }
    if (tileCoord[2] & mask) {
      charCode += 2;
    }
    digits[i] = String.fromCharCode(charCode);
    mask >>= 1;
  }
  return digits.join('');
}

const TOS_ATTRIBUTION =
  '<a class="ol-attribution-bing-tos" ' +
  'href="https://www.microsoft.com/maps/product/terms.html" target="_blank">' +
  'Terms of Use</a>';

class SatelliteMaps extends ol.source.TileImage {
  constructor(options) {
    const hidpi = options.hidpi !== undefined ? options.hidpi : false;

    super({
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

    const url =
      'https://dev.virtualearth.net/REST/v1/Imagery/Metadata/' +
      this.imagerySet_ +
      '?uriScheme=https&include=ImageryProviders&key=' +
      this.apiKey_ +
      '&c=' +
      this.culture_;

    fetch(url)
      .then((response) => response.json())
      .then((json) => this.handleImageryMetadataResponse(json));

  }

  getApiKey() {
    return this.apiKey_;
  }

  getImagerySet() {
    return this.imagerySet_;
  }

  handleImageryMetadataResponse(response) {
    if (
      response.statusCode != 200 ||
      response.statusDescription != 'OK' ||
      response.authenticationResultCode != 'ValidCredentials' ||
      response.resourceSets.length != 1 ||
      response.resourceSets[0].resources.length != 1
    ) {
      this.setState('error');
      return;
    }

    const resource = response.resourceSets[0].resources[0];
    const maxZoom = this.maxZoom_ == -1 ? resource.zoomMax : this.maxZoom_;

    const sourceProjection = this.getProjection();
    const extent = ol.tilegrid.extentFromProjection(sourceProjection);
    const scale = this.hidpi_ ? 2 : 1;
    const tileSize =
      resource.imageWidth == resource.imageHeight
        ? resource.imageWidth / scale
        : [resource.imageWidth / scale, resource.imageHeight / scale];

    const tileGrid = ol.tilegrid.createXYZ({
      extent: extent,
      minZoom: resource.zoomMin,
      maxZoom: maxZoom,
      tileSize: tileSize,
    });
    this.tileGrid = tileGrid;

    const culture = this.culture_;
    const hidpi = this.hidpi_;
    this.tileUrlFunction = ol.tileurlfunction.createFromTileUrlFunctions(
      resource.imageUrlSubdomains.map(function (subdomain) {
        const quadKeyTileCoord = [0, 0, 0];
        const imageUrl = resource.imageUrl
          .replace('{subdomain}', subdomain)
          .replace('{culture}', culture);
        return (
          function (tileCoord, pixelRatio, projection) {
            if (!tileCoord) {
              return undefined;
            }
            ol.tilecoord.createOrUpdate(
              tileCoord[0],
              tileCoord[1],
              tileCoord[2],
              quadKeyTileCoord
            );
            let url = imageUrl;
            if (hidpi) {
              url += '&dpi=d1&device=mobile';
            }
            return url.replace('{quadkey}', quadKey(quadKeyTileCoord));
          }
        );
      })
    );

    if (resource.imageryProviders) {
      const transform = ol.proj.getTransformFromProjections(
        ol.proj.get('EPSG:4326'),
        this.getProjection()
      );

      this.setAttributions((frameState) => {
        const attributions = [];
        const viewState = frameState.viewState;
        const tileGrid = this.getTileGrid();
        const z = tileGrid.getZForResolution(
          viewState.resolution,
          this.zDirection
        );
        const tileCoord = tileGrid.getTileCoordForCoordAndZ(
          viewState.center,
          z
        );
        const zoom = tileCoord[0];
        resource.imageryProviders.map(function (imageryProvider) {
          let intersecting = false;
          const coverageAreas = imageryProvider.coverageAreas;
          for (let i = 0, ii = coverageAreas.length; i < ii; ++i) {
            const coverageArea = coverageAreas[i];
            if (zoom >= coverageArea.zoomMin && zoom <= coverageArea.zoomMax) {
              const bbox = coverageArea.bbox;
              const epsg4326Extent = [bbox[1], bbox[0], bbox[3], bbox[2]];
              const extent = ol.extent.applyTransform(epsg4326Extent, transform);
              if (ol.extent.intersects(extent, frameState.extent)) {
                intersecting = true;
                break;
              }
            }
          }
          if (intersecting) {
            attributions.push(imageryProvider.attribution);
          }
        });

        attributions.push(TOS_ATTRIBUTION);
        return attributions;
      });
    }

    this.setState('ready');
  }
}
