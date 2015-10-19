(function(){
    require.config({
        paths: {
            'leaflet': '../../shared.R/rcloud.dcmap/leaflet',
            'dc_leaflet': '../../shared.R/rcloud.dcmap/dc.leaflet',
            'colorbrewer': '../../shared.R/rcloud.dcmap/colorbrewer'
        },
        shim: {
            'leaflet': {
                exports: 'L'
            },
            'colorbrewer':{
                exports: 'colorbrewer'
            }
        }
    });

    function initChoro(dc_leaflet, div, dimension, group, groupname, opts) {
        var choro = dc_leaflet.choroplethChart(div[0], groupname);
        var rendered = false;
        var last_level = null;
        var levels = {
            state: {
                geofield: 'state',
                dimension: 'State',
                group: 'state',
                min_level: 0
            } /*, // need tl2010... really need this config to be passed in
            county: {
                geofield: 'county',
                dimension: 'County',
                group: 'county',
                min_level: 8
            },
            zip: {
                geofield: 'zcta5',
                dimension: 'Zip',
                group: 'zip',
                min_level: 10
            } */
        };
        var steps = [];
        for(var level in levels) {
            steps.push({min_level: levels[level].min_level, level: level});
        }
        steps.sort(function(a,b) {
            return d3.descending(a.min_level, b.min_level);
        });

        var blankGeo = {
            features: [],
            type: "FeatureCollection"
        };
        var chartgroup = window.wdcplot_registry[groupname];
        if(!chartgroup.dimensions[dimension])
            throw new Error('dimension ' + dimension + ' not found.');
        if(!chartgroup.groups[group])
            throw new Error('group ' + group + ' not found.');
        choro.dimension(chartgroup.dimensions[dimension])
            .group(chartgroup.groups[group])
            .width(opts.width)
            .height(opts.height)
            .margins({top: 20, left: 0,
                      right: 0, bottom: 0})
            .center([40.672828,-74.6774659])
            .zoom(8)
            .geojson(blankGeo)
            .colors(colorbrewer.YlOrRd[9])
            .colorAccessor(function(d,i) {
                return Math.sqrt(d.value);
                //return d.value;
            })
            .featureKeyAccessor(function(feature) {
                return feature.properties.NAME;
            });

        function apply_geo(id_field) {
            return function(err, data) {
                function makePolygon(x,y){
                    var boundaries = [];
                    var latlngs = [];

                    for(var i=0; i< x.length; i++){
                        if (!isNaN(x[i])) {
                            latlngs.push(L.latLng(y[i],x[i]));
                        }
                        else {
                            boundaries.push(latlngs.slice());
                            latlngs=[];
                        }
                    }
                    boundaries.push(latlngs);
                    return L.polygon(boundaries);
                }

                var polygons = data.map(function(d){
                    var p = makePolygon(d.x,d.y) ;
                    p.NAME = d[id_field];
                    return p;
                });
                var features = polygons.map(function(p){
                    var feature = p.toGeoJSON();
                    feature.properties.NAME = p.NAME;
                    return feature;
                });
                var geojson = {
                    features: features,
                    type: "FeatureCollection"
                };
                choro.geojson(geojson);
                // zoom can cause filters to be reset; everyone needs a redraw
                dc_leaflet.dc.redrawAll(groupname);
            };
        }

        function move_end() {
            var map = choro.map();
            var b = map.getBounds();
            var level;

            for(var i = 0; i<steps.length; ++i) {
                var step = steps[i];
                if(map.getZoom() >= step.min_level) {
                    level = step.level;
                    break;
                }
            }

            // reset all filters on level change
            if(last_level && last_level !== level)
                choro.filter(null);

            // set new dimension and group for map
            choro.dimension(chartgroup.dimensions[levels[level].dimension])
                .group(chartgroup.groups[levels[level].group]);

            if(opts.shape_url) {
                d3.json(opts.shape_url, function(error, geostates) {
                    choro.geojson(geostates);
                });
            }
                /*
            dats([b.getWest(),b.getSouth(),
                  b.getEast(),b.getNorth()],
                 levels[level].geofield,
                 apply_geo('name'));
                 */
            last_level = level;
        }

        //Legend
        var Legend= L.Control.extend({
            options: {position:'bottomright'},
            onAdd: function (map) {
                this.div = L.DomUtil.create('div', 'info legend');
                map.on('moveend',this._update,this);
                this._update();
                return this.div;
            },
            _update: function(){
                var div = this.div;
                while (div.hasChildNodes()) {
                    div.removeChild(div.firstChild);
                }

                var domain=d3.extent(choro.data(),
                                     function(d) {return d.value;});
                var interval=(domain[1]-domain[0])/5;
                var grades = [];
                for (var di=0; di < 5; di++){
                    var v= domain[0]+di*interval;
                    grades.push({value:Math.floor(v)});
                }
                //grades.push({value:Math.floor(domain[1])});
                var getColor=choro.colorCalculator();

                var labels = [];

                // loop through our density intervals and
                // generate a label with a colored square
                // for each interval
                for (var i = 0; i < grades.length; i++) {
                    div.innerHTML +=
                        '<i style="background:' +
                        getColor(grades[i]) +
                        '"></i> ' +
                        grades[i].value +
                        (grades[i + 1] ? '&ndash;' +
                         grades[i + 1].value + '<br>' : '+');
                }
            }
        });

        var legend = new Legend();


        // might be misleading, but it's more exciting
        choro.on('preRender', function(chart) {
            chart.calculateColorDomain();
        })
            .on('preRedraw', function(chart) {
                chart.calculateColorDomain();
            })
            .on('postRedraw', function(chart){
                chart.calculateColorDomain();
                var map = choro.map();
                if(map != legend._map){
                    legend.addTo(map);
                }
                console.log('postRedraw');
            })
            .on('moveend', function(){
                move_end();
            });
        return {choro: choro, div: div};
    }

    function makeDiv(dc_leaflet, dimension, group, groupname, opts) {
        var div = $('<div id="choro" style="width: ' + opts.width + 'px; height: ' + opts.height + 'px; float: none"></div>');
        div.append($('<p><b>Counts per region</b>&nbsp;&nbsp;</p>')
                      .append($('<span/>', {class: 'reset', style: 'display: none;'})
                              .append('Current filter: ')
                              .append($('<span/>', {class: 'filter'})))
                      .append('&nbsp;&nbsp;')
                      .append($('<a></a>', {
                          class: 'reset',
                          href: '#',
                          style: "display: none;"
                      })
                              .append("reset")
                              .click(function(e) {
                                  e.preventDefault();
                                  choro.filterAll();
                                  dc_leaflet.dc.redrawAll(groupname);
                              })));
        var dcmap = initChoro(dc_leaflet, div, dimension, group, groupname, opts);

        // Leaflet will not render until it's actually in the DOM
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                dcmap.choro.render();
                observer.disconnect();
                console.log(mutation.type);
            });
        });

        // configuration of the observer:
        var config = { attributes: true, childList: true, subtree: true };

        // pass in the target node, as well as the observer options
        observer.observe(div[0], config);

        return div;
    }

    return {
        handle_dcmap: function(dimension, group, opts, k) {
            require(['leaflet', 'dc_leaflet','colorbrewer'], function (L, dc_leaflet,colorbrewer) {
                var dcmap;
                try {
                    dcmap = makeDiv(dc_leaflet, dimension, group, window.wdcplot_current, opts);
                }
                catch(xep) {
                    k(function() {
                        return $('<p/>').append("Exception instantiating dcmap: " + xep);
                    });
                    return;
                }
                k(function() { return dcmap; });
            });
        }
    };
})() /*jshint -W033 */ // this is an expression not a statement

