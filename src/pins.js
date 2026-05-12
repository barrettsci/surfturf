import L from 'leaflet';
import { getMap } from './map.js';
import { savePOI, deletePOI } from './storage.js';

const markerMap = new Map(); // poiId -> L.Marker

function makeIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22s14-12.67 14-22C28 6.27 21.73 0 14 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
    <circle cx="14" cy="14" r="5" fill="#fff"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

export function renderPOI(poi, profile, onEdit, onDelete) {
  const map = getMap();
  const icon = makeIcon(profile.color);
  const marker = L.marker([poi.lat, poi.lng], { icon }).addTo(map);

  const popup = buildPopup(poi, profile, onEdit, onDelete, marker);
  marker.bindPopup(popup, { maxWidth: 280, className: 'poi-popup' });

  markerMap.set(poi.id, marker);
  return marker;
}

function buildPopup(poi, profile, onEdit, onDelete, marker) {
  const container = document.createElement('div');
  container.className = 'poi-popup-content';
  container.innerHTML = `
    <div class="poi-category">${poi.category}</div>
    <div class="poi-profile-tag" style="background:${profile.color}">${profile.name}</div>
    <div class="poi-desc">${poi.description || '<em>No description</em>'}</div>
    <div class="poi-date">${new Date(poi.createdAt).toLocaleDateString()}</div>
    <div class="poi-actions">
      <button class="poi-edit-btn">Edit</button>
      <button class="poi-nav-btn">Navigate</button>
      <button class="poi-delete-btn">Delete</button>
    </div>
  `;

  container.querySelector('.poi-edit-btn').addEventListener('click', () => {
    marker.closePopup();
    onEdit(poi);
  });

  container.querySelector('.poi-nav-btn').addEventListener('click', () => {
    window.open(`geo:${poi.lat},${poi.lng}?q=${poi.lat},${poi.lng}`, '_blank');
  });

  container.querySelector('.poi-delete-btn').addEventListener('click', async () => {
    if (!confirm(`Delete "${poi.category}" pin?`)) return;
    await deletePOI(poi.id);
    removeMarker(poi.id);
    onDelete(poi.id);
  });

  return container;
}

export function removeMarker(poiId) {
  const marker = markerMap.get(poiId);
  if (marker) {
    marker.remove();
    markerMap.delete(poiId);
  }
}

export function setMarkersVisible(profileId, visible) {
  for (const [id, marker] of markerMap) {
    const el = marker.getElement();
    if (el) el.dataset.profileId === profileId && (el.style.display = visible ? '' : 'none');
  }
}

export function clearAllMarkers() {
  for (const marker of markerMap.values()) marker.remove();
  markerMap.clear();
}

export function getMarker(poiId) {
  return markerMap.get(poiId);
}

export function updateMarkerPopup(poi, profile, onEdit, onDelete) {
  const marker = markerMap.get(poi.id);
  if (!marker) return;
  marker.setPopupContent(buildPopup(poi, profile, onEdit, onDelete, marker));
}

export function setMarkerProfileVisibility(pois, visibilityMap) {
  for (const poi of pois) {
    const marker = markerMap.get(poi.id);
    if (!marker) continue;
    const el = marker.getElement();
    if (el) el.style.display = visibilityMap[poi.profileId] !== false ? '' : 'none';
  }
}
