// map.js (limpio y robusto)
(function(){
  // Crear mapa sin botones de zoom (+/-)
  var map = L.map('map', { zoomControl: false });

  // Panes para control de superposición
  map.createPane('paneZonas');   // Zonas Afectadas
  map.getPane('paneZonas').style.zIndex = 650;
  map.createPane('paneCoca');
  map.getPane('paneCoca').style.zIndex = 660;
  map.createPane('paneHidrica');
  map.getPane('paneHidrica').style.zIndex = 670;
  map.createPane('paneCoca');    // Barrios Coca
  map.getPane('paneCoca').style.zIndex = 660;

  // Capas base
  var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  var esriSat = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 20, attribution: 'Tiles © Esri — World Imagery' }
  );

  // Datos (variables globales esperadas)
  var dataZonas   = (typeof zonas_afectadas !== 'undefined') ? zonas_afectadas : null;
  var dataHidrica = (typeof red_hidrica !== 'undefined') ? red_hidrica : null;
  var dataCoca    = (typeof barrios_coca !== 'undefined') ? barrios_coca : null;

  // Capas vectoriales
  var layer1 = null, layer2 = null, layer3 = null;

  // 1) Zonas Afectadas (antes: Barrios afectados)
  if (dataZonas){
    layer1 = L.geoJSON(dataZonas, {
      pane: 'paneZonas',
      interactive: false, // no bloquear clics a capas superiores
      style: function(){
        return { color:'#b91c1c', weight:2, fill:true, fillColor:'#fecaca', fillOpacity:0.7 };
      },
      onEachFeature: function(f,l){ /* sin popups */ }
    }).addTo(map);
    if (layer1.bringToFront) layer1.bringToFront();
  }

  // 2) Red Hídrica (líneas, sin popup; opacidad 100%)
  if (dataHidrica){
    layer2 = L.geoJSON(dataHidrica, { style: function(){ return { color:'#1d4ed8', weight:2, opacity:1 }; } });
  }

  // 3) Barrios Coca (línea negra discontinua, sin relleno visible; popup: solo Layer)
  if (dataCoca){
    layer3 = L.geoJSON(dataCoca, {
      pane: 'paneCoca',
      style: function(){ return { color:'#000', weight:2, dashArray:'6 4', fill:true, fillOpacity:0 }; },
      onEachFeature: function(f,l){
        var p = f && f.properties ? f.properties : {};
        var title = p.Layer || p.name || p.Nombre || 'Barrios Coca';
        l.bindPopup("<b>" + title + "</b>");
      }
    }).addTo(map);
  }

  // Control de capas
  var baseMaps = { "OSM": osm, "ESRI Satélite": esriSat };
  var overlays = {};
  if (layer1) overlays["Zonas Afectadas"] = layer1;
  if (layer2) overlays["Red Hídrica"] = layer2;
  if (layer3) overlays["Barrios Coca"] = layer3;
  L.control.layers(baseMaps, overlays, { collapsed: true }).addTo(map);

  // Leyenda (abajo derecha)
  var legend = L.control({position: 'bottomright'});
  legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML += '<div style="display:flex;align-items:center;margin-bottom:6px;">'
                   + '<span style="background:#fecaca;border:2px solid #b91c1c;width:16px;height:16px;display:inline-block;margin-right:6px;"></span>'
                   + '<span>Zonas Afectadas</span></div>';
    div.innerHTML += '<div style="display:flex;align-items:center;">'
                   + '<span style="background:#1d4ed8;width:16px;height:2px;display:inline-block;margin-right:6px;"></span>'
                   + '<span>Red Hídrica</span></div>';
    return div;
  };
  legend.addTo(map);

  // Ajuste de vista: prioriza Zonas Afectadas, luego Red Hídrica, luego Barrios Coca
  if (layer1 && map.hasLayer(layer1) && layer1.getLayers && layer1.getLayers().length){
    map.fitBounds(layer1.getBounds(), { padding:[12,12] });
  } else if (layer2 && map.hasLayer(layer2) && layer2.getLayers && layer2.getLayers().length){
    map.fitBounds(layer2.getBounds(), { padding:[12,12] });
  } else if (layer3 && map.hasLayer(layer3) && layer3.getLayers && layer3.getLayers().length){
    map.fitBounds(layer3.getBounds(), { padding:[12,12] });
  } else if (layer1 && map.hasLayer(layer1) && layer1.getLayers && layer1.getLayers().length){
            map.fitBounds(layer1.getBounds(), { padding:[12,12] });
          } else if (layer2 && map.hasLayer(layer2) && layer2.getLayers && layer2.getLayers().length){
            map.fitBounds(layer2.getBounds(), { padding:[12,12] });
          } else if (layer3 && map.hasLayer(layer3) && layer3.getLayers && layer3.getLayers().length){
            map.fitBounds(layer3.getBounds(), { padding:[12,12] });
          } else if (layer1 && layer1.getLayers && layer1.getLayers().length){
            map.fitBounds(layer1.getBounds(), { padding:[12,12] }); // fallback
          } else if (layer3 && layer3.getLayers && layer3.getLayers().length){
            map.fitBounds(layer3.getBounds(), { padding:[12,12] });
          } else {
            map.setView([0,0], 2);
          }
  
  // Botón "Centrar mapa" para móvil (sin try/catch)
  var FitControl = L.Control.extend({
    options: { position: 'bottomleft' },
    onAdd: function(map){
      var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control fit-control');
      var link = L.DomUtil.create('a', '', container);
      link.href = '#';
      link.title = 'Centrar mapa';
      link.innerHTML = '⤢';
      L.DomEvent.disableClickPropagation(link);
      L.DomEvent.on(link, 'click', function(e){
        L.DomEvent.preventDefault(e);
        var bounds = null;
        if (layer1 && map.hasLayer(layer1) && layer1.getLayers && layer1.getLayers().length){
          bounds = layer1.getBounds();
        } else if (layer2 && map.hasLayer(layer2) && layer2.getLayers && layer2.getLayers().length){
          bounds = layer2.getBounds();
        } else if (layer3 && map.hasLayer(layer3) && layer3.getLayers && layer3.getLayers().length){
          bounds = layer3.getBounds();
        } else if (layer1 && layer1.getLayers && layer1.getLayers().length){
          bounds = layer1.getBounds();
        } else if (layer3 && layer3.getLayers && layer3.getLayers().length){
          bounds = layer3.getBounds();
        }
        if (bounds){ map.fitBounds(bounds, { padding:[12,12] }); }
        else { map.setView([0,0], 2); }
      });
      return container;
    }
  });
  map.addControl(new FitControl());

// Refresh de tamaño para móviles/orientación
  function refreshMapSize(){
    setTimeout(function(){ map.invalidateSize(); }, 150);
  }
  window.addEventListener('resize', refreshMapSize);
  window.addEventListener('orientationchange', refreshMapSize);
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden) refreshMapSize();
  });
  setTimeout(refreshMapSize, 300);
})();
