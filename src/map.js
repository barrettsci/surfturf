import L from 'leaflet';

const TOPO_URL = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
const SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const HUNTING_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad'];
const huntingCodeColors = {};

let map = null;
let topoLayer = null;
let satLayer = null;
let huntingLayer = null;
let isSatellite = false;
let isHuntingVisible = false;
let locationMarker = null;
let locationCircle = null;

export function initMap() {
  map = L.map('map', {
    center: [-37.814, 144.963],
    zoom: 8,
    zoomControl: false,
  });

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  topoLayer = L.tileLayer(TOPO_URL, {
    attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
    maxNativeZoom: 17,
  });

  satLayer = L.tileLayer(SAT_URL, {
    attribution: 'ESRI World Imagery',
    maxZoom: 20,
    maxNativeZoom: 17,
  });

  topoLayer.addTo(map);
  return map;
}

function huntingColor(code) {
  if (!huntingCodeColors[code]) {
    const idx = Object.keys(huntingCodeColors).length;
    huntingCodeColors[code] = HUNTING_COLORS[idx % HUNTING_COLORS.length];
  }
  return huntingCodeColors[code];
}

export async function toggleHunting() {
  if (isHuntingVisible) {
    map.removeLayer(huntingLayer);
  } else {
    if (!huntingLayer) {
      const res = await fetch(`${import.meta.env.BASE_URL}data/sambar-hunting.geojson`);
      const data = await res.json();
      huntingLayer = L.geoJSON(data, {
        style: feature => ({
          color: huntingColor(feature.properties.HUNT_DEER_),
          fillColor: huntingColor(feature.properties.HUNT_DEER_),
          fillOpacity: 0.25,
          weight: 1.5,
        }),
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(feature.properties.DESCRIPTIO || feature.properties.NAME, { sticky: true });
        },
      });
    }
    huntingLayer.addTo(map);
  }
  isHuntingVisible = !isHuntingVisible;
  return isHuntingVisible;
}

export function toggleSatellite() {
  if (isSatellite) {
    map.removeLayer(satLayer);
    topoLayer.addTo(map);
  } else {
    map.removeLayer(topoLayer);
    satLayer.addTo(map);
  }
  isSatellite = !isSatellite;
  return isSatellite;
}

export function locateUser() {
  map.locate({ setView: true, maxZoom: 15, enableHighAccuracy: true });

  map.once('locationfound', (e) => {
    const { latlng, accuracy } = e;

    if (locationMarker) map.removeLayer(locationMarker);
    if (locationCircle) map.removeLayer(locationCircle);

    locationCircle = L.circle(latlng, { radius: accuracy, color: '#4a90d9', fillColor: '#4a90d9', fillOpacity: 0.15, weight: 1 }).addTo(map);
    locationMarker = L.circleMarker(latlng, { radius: 8, color: '#fff', fillColor: '#4a90d9', fillOpacity: 1, weight: 2 }).addTo(map);
  });

  map.once('locationerror', () => {
    alert('Could not get your location. Make sure location permission is granted.');
  });
}

export function getMap() {
  return map;
}

export function flyTo(lat, lng, zoom = 15) {
  map.flyTo([lat, lng], zoom);
}
