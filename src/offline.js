import L from 'leaflet';
import { getMap } from './map.js';

const CACHE_NAME = 'map-tiles-v1';
const TOPO_URL = 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png';
const SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const MIN_ZOOM = 10;
const MAX_ZOOM = 16;
const TILE_SIZE_KB = 15; // rough average

let drawingRect = null;
let startLatLng = null;
let isDrawing = false;
let drawnBounds = null;
let savedAreas = JSON.parse(localStorage.getItem('offlineAreas') || '[]');

function tileCount(bounds, z) {
  const nw = bounds.getNorthWest();
  const se = bounds.getSouthEast();
  const x1 = lng2tile(nw.lng, z);
  const x2 = lng2tile(se.lng, z);
  const y1 = lat2tile(nw.lat, z);
  const y2 = lat2tile(se.lat, z);
  return (Math.abs(x2 - x1) + 1) * (Math.abs(y2 - y1) + 1);
}

function lng2tile(lng, z) { return Math.floor((lng + 180) / 360 * Math.pow(2, z)); }
function lat2tile(lat, z) {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
}

function* tileUrls(bounds, minZ, maxZ) {
  for (let z = minZ; z <= maxZ; z++) {
    const nw = bounds.getNorthWest();
    const se = bounds.getSouthEast();
    const x1 = Math.min(lng2tile(nw.lng, z), lng2tile(se.lng, z));
    const x2 = Math.max(lng2tile(nw.lng, z), lng2tile(se.lng, z));
    const y1 = Math.min(lat2tile(nw.lat, z), lat2tile(se.lat, z));
    const y2 = Math.max(lat2tile(nw.lat, z), lat2tile(se.lat, z));
    for (let x = x1; x <= x2; x++) {
      for (let y = y1; y <= y2; y++) {
        yield TOPO_URL.replace('{z}', z).replace('{x}', x).replace('{y}', y);
        yield SAT_URL.replace('{z}', z).replace('{x}', x).replace('{y}', y);
      }
    }
  }
}

export function estimateTileCount(bounds) {
  let total = 0;
  for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) total += tileCount(bounds, z);
  return total * 2; // topo + satellite
}

export function startDrawMode(onComplete) {
  const map = getMap();
  map.getContainer().style.cursor = 'crosshair';
  isDrawing = false;
  startLatLng = null;

  function onMouseDown(e) {
    isDrawing = true;
    startLatLng = e.latlng;
    if (drawingRect) { map.removeLayer(drawingRect); drawingRect = null; }
  }

  function onMouseMove(e) {
    if (!isDrawing) return;
    const bounds = L.latLngBounds(startLatLng, e.latlng);
    if (drawingRect) map.removeLayer(drawingRect);
    drawingRect = L.rectangle(bounds, { color: '#e74c3c', weight: 2, fillOpacity: 0.1 }).addTo(map);
  }

  function onMouseUp(e) {
    if (!isDrawing) return;
    isDrawing = false;
    drawnBounds = L.latLngBounds(startLatLng, e.latlng);
    map.getContainer().style.cursor = '';
    map.off('mousedown', onMouseDown);
    map.off('mousemove', onMouseMove);
    map.off('mouseup', onMouseUp);
    onComplete(drawnBounds);
  }

  map.on('mousedown', onMouseDown);
  map.on('mousemove', onMouseMove);
  map.on('mouseup', onMouseUp);
}

export function cancelDrawMode() {
  const map = getMap();
  map.getContainer().style.cursor = '';
  if (drawingRect) { map.removeLayer(drawingRect); drawingRect = null; }
}

export async function downloadArea(name, bounds, onProgress) {
  const urls = [...tileUrls(bounds, MIN_ZOOM, MAX_ZOOM)];
  const cache = await caches.open(CACHE_NAME);
  let done = 0;
  const total = urls.length;

  for (const url of urls) {
    try {
      const existing = await cache.match(url);
      if (!existing) {
        const resp = await fetch(url);
        if (resp.ok) await cache.put(url, resp);
      }
    } catch (_) { /* skip failed tiles */ }
    done++;
    onProgress(done, total);
  }

  const area = { name, bounds: bounds.toBBoxString(), downloadedAt: Date.now(), tileCount: total };
  savedAreas.push(area);
  localStorage.setItem('offlineAreas', JSON.stringify(savedAreas));
  if (drawingRect) { getMap().removeLayer(drawingRect); drawingRect = null; }
  return area;
}

export function getSavedAreas() {
  return savedAreas;
}

export async function deleteArea(name) {
  savedAreas = savedAreas.filter(a => a.name !== name);
  localStorage.setItem('offlineAreas', JSON.stringify(savedAreas));
}
