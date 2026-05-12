import './style.css';
import { initMap, toggleSatellite, toggleHunting, locateUser, getMap } from './map.js';
import { getAllPOIs, savePOI } from './storage.js';
import { renderPOI, removeMarker, updateMarkerPopup, setMarkerProfileVisibility } from './pins.js';
import { exportGeoJSON, checkBackupNudge } from './export.js';
import { startDrawMode, cancelDrawMode, downloadArea, estimateTileCount, getSavedAreas, deleteArea } from './offline.js';
import profiles from './config/profiles.json';

// ── State ──────────────────────────────────────────────────────────────
let activeProfileId = profiles[0].id;
let allPOIs = [];
let profileVisibility = Object.fromEntries(profiles.map(p => [p.id, true]));
let pendingLatLng = null;
let editingPOI = null;

// ── Init ───────────────────────────────────────────────────────────────
const map = initMap();

async function boot() {
  allPOIs = await getAllPOIs();
  allPOIs.forEach(poi => {
    const profile = profiles.find(p => p.id === poi.profileId);
    if (profile) renderPOI(poi, profile, openEditSheet, handleDelete);
  });
  setMarkerProfileVisibility(allPOIs, profileVisibility);
  updateProfileLabel();

  if (checkBackupNudge()) {
    document.getElementById('backup-banner').classList.remove('hidden');
  }

  renderOfflineAreas();
}

boot();

// ── Profile label ──────────────────────────────────────────────────────
function updateProfileLabel() {
  const p = profiles.find(p => p.id === activeProfileId);
  document.getElementById('profile-label').textContent = p?.name ?? 'Profile';
}

function getProfile(id) {
  return profiles.find(p => p.id === (id || activeProfileId));
}

// ── Toolbar buttons ────────────────────────────────────────────────────
document.getElementById('satellite-btn').addEventListener('click', () => {
  const on = toggleSatellite();
  document.getElementById('satellite-btn').textContent = on ? 'Topo' : 'Satellite';
});

document.getElementById('hunting-btn').addEventListener('click', async () => {
  const on = await toggleHunting();
  document.getElementById('hunting-btn').classList.toggle('active', on);
});

document.getElementById('locate-btn').addEventListener('click', locateUser);

document.getElementById('export-btn').addEventListener('click', async () => {
  await exportGeoJSON();
  document.getElementById('backup-banner').classList.add('hidden');
});

// ── Backup banner ──────────────────────────────────────────────────────
document.getElementById('banner-export-btn').addEventListener('click', async () => {
  await exportGeoJSON();
  document.getElementById('backup-banner').classList.add('hidden');
});
document.getElementById('banner-dismiss-btn').addEventListener('click', () => {
  document.getElementById('backup-banner').classList.add('hidden');
  localStorage.setItem('lastExportDate', Date.now().toString());
});

// ── FAB / pin-drop ─────────────────────────────────────────────────────
document.getElementById('fab').addEventListener('click', enterPinDropMode);

function enterPinDropMode() {
  document.getElementById('pin-drop-hint').classList.remove('hidden');
  document.getElementById('fab').classList.add('hidden');
  map.getContainer().style.cursor = 'crosshair';
  map.once('click', onMapClickForPin);
}

function exitPinDropMode() {
  document.getElementById('pin-drop-hint').classList.add('hidden');
  document.getElementById('fab').classList.remove('hidden');
  map.getContainer().style.cursor = '';
  map.off('click', onMapClickForPin);
}

document.getElementById('cancel-pin-btn').addEventListener('click', exitPinDropMode);

function onMapClickForPin(e) {
  exitPinDropMode();
  pendingLatLng = e.latlng;
  openCategorySheet();
}

// ── Category sheet ─────────────────────────────────────────────────────
function openCategorySheet() {
  const profile = getProfile(activeProfileId);
  document.getElementById('sheet-profile-name').textContent = profile.name;
  const grid = document.getElementById('category-grid');
  grid.innerHTML = '';
  profile.categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.textContent = cat;
    btn.style.borderColor = profile.color;
    btn.addEventListener('click', () => {
      closeAllSheets();
      createPOI(cat);
    });
    grid.appendChild(btn);
  });
  showSheet('category-sheet');
}

document.getElementById('sheet-cancel-btn').addEventListener('click', () => {
  closeAllSheets();
  pendingLatLng = null;
});

async function createPOI(category) {
  const poi = {
    id: crypto.randomUUID(),
    profileId: activeProfileId,
    category,
    description: '',
    lat: pendingLatLng.lat,
    lng: pendingLatLng.lng,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await savePOI(poi);
  allPOIs.push(poi);
  const profile = getProfile(poi.profileId);
  renderPOI(poi, profile, openEditSheet, handleDelete);
  setMarkerProfileVisibility(allPOIs, profileVisibility);
  pendingLatLng = null;
}

// ── Edit POI sheet ─────────────────────────────────────────────────────
function openEditSheet(poi) {
  editingPOI = poi;
  const profile = getProfile(poi.profileId);
  const content = document.getElementById('poi-sheet-content');
  content.innerHTML = `
    <h3 style="color:${profile.color}">${poi.category}</h3>
    <p class="edit-label">Description</p>
    <textarea id="edit-desc" rows="4" placeholder="Optional notes...">${poi.description || ''}</textarea>
    <p class="edit-label">Date</p>
    <input type="datetime-local" id="edit-date" value="${toDatetimeLocal(poi.createdAt)}" />
    <div class="poi-actions">
      <button id="edit-save-btn">Save</button>
      <button id="edit-cancel-btn">Cancel</button>
    </div>
  `;
  document.getElementById('edit-save-btn').addEventListener('click', saveEdit);
  document.getElementById('edit-cancel-btn').addEventListener('click', closeAllSheets);
  showSheet('poi-sheet');
}

async function saveEdit() {
  const desc = document.getElementById('edit-desc').value.trim();
  const dateVal = document.getElementById('edit-date').value;
  editingPOI.description = desc;
  editingPOI.createdAt = dateVal ? new Date(dateVal).toISOString() : editingPOI.createdAt;
  editingPOI.updatedAt = new Date().toISOString();
  await savePOI(editingPOI);
  const idx = allPOIs.findIndex(p => p.id === editingPOI.id);
  if (idx !== -1) allPOIs[idx] = editingPOI;
  const profile = getProfile(editingPOI.profileId);
  updateMarkerPopup(editingPOI, profile, openEditSheet, handleDelete);
  closeAllSheets();
  editingPOI = null;
}

function toDatetimeLocal(isoString) {
  return isoString ? isoString.slice(0, 16) : '';
}

// ── Delete handler ─────────────────────────────────────────────────────
function handleDelete(poiId) {
  allPOIs = allPOIs.filter(p => p.id !== poiId);
  removeMarker(poiId);
}

// ── Profile sheet ──────────────────────────────────────────────────────
document.getElementById('profile-btn').addEventListener('click', openProfileSheet);

function openProfileSheet() {
  const list = document.getElementById('profile-list');
  list.innerHTML = '';
  profiles.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'profile-select-btn' + (p.id === activeProfileId ? ' active' : '');
    btn.style.borderColor = p.color;
    btn.style.color = p.id === activeProfileId ? '#fff' : p.color;
    btn.style.background = p.id === activeProfileId ? p.color : '';
    btn.textContent = p.name;
    btn.addEventListener('click', () => {
      activeProfileId = p.id;
      updateProfileLabel();
      closeAllSheets();
    });
    list.appendChild(btn);
  });

  const vis = document.getElementById('visibility-toggles');
  vis.innerHTML = '<p class="edit-label">Visibility</p>';
  profiles.forEach(p => {
    const row = document.createElement('label');
    row.className = 'visibility-row';
    row.innerHTML = `
      <input type="checkbox" data-pid="${p.id}" ${profileVisibility[p.id] !== false ? 'checked' : ''} />
      <span style="color:${p.color}">${p.name}</span>
    `;
    row.querySelector('input').addEventListener('change', (e) => {
      profileVisibility[p.id] = e.target.checked;
      setMarkerProfileVisibility(allPOIs, profileVisibility);
    });
    vis.appendChild(row);
  });

  showSheet('profile-sheet');
}

document.getElementById('profile-sheet-close').addEventListener('click', closeAllSheets);

// ── Offline sheet ──────────────────────────────────────────────────────
document.getElementById('offline-btn').addEventListener('click', () => showSheet('offline-sheet'));
document.getElementById('offline-sheet-close').addEventListener('click', closeAllSheets);

document.getElementById('offline-draw-btn').addEventListener('click', () => {
  closeAllSheets();
  startDrawMode(async (bounds) => {
    const count = estimateTileCount(bounds);
    const sizeEstimateMB = ((count * 15) / 1024).toFixed(1);
    const name = prompt(`Name this area:\n(~${count.toLocaleString()} tiles, ~${sizeEstimateMB} MB)`);
    if (!name) { cancelDrawMode(); return; }
    if (getSavedAreas().find(a => a.name === name)) {
      alert('An area with that name already exists.');
      cancelDrawMode();
      return;
    }
    showSheet('offline-sheet');
    const statusEl = document.createElement('div');
    statusEl.id = 'dl-status';
    statusEl.textContent = 'Downloading...';
    document.getElementById('offline-areas-list').prepend(statusEl);

    await downloadArea(name, bounds, (done, total) => {
      statusEl.textContent = `Downloading... ${done}/${total}`;
    });
    statusEl.remove();
    renderOfflineAreas();
  });
});

function renderOfflineAreas() {
  const list = document.getElementById('offline-areas-list');
  list.innerHTML = '';
  const areas = getSavedAreas();
  if (areas.length === 0) {
    list.innerHTML = '<p class="muted">No offline areas saved yet.</p>';
    return;
  }
  areas.forEach(area => {
    const row = document.createElement('div');
    row.className = 'offline-area-row';
    row.innerHTML = `
      <span>${area.name} <small class="muted">(${area.tileCount.toLocaleString()} tiles)</small></span>
      <button class="delete-area-btn" data-name="${area.name}">Delete</button>
    `;
    row.querySelector('.delete-area-btn').addEventListener('click', async (e) => {
      const n = e.target.dataset.name;
      if (!confirm(`Delete offline area "${n}"?`)) return;
      await deleteArea(n);
      renderOfflineAreas();
    });
    list.appendChild(row);
  });
}

// ── Sheet helpers ──────────────────────────────────────────────────────
function showSheet(id) {
  closeAllSheets();
  document.getElementById(id).classList.remove('hidden');
  document.getElementById('sheet-backdrop').classList.remove('hidden');
}

function closeAllSheets() {
  ['category-sheet', 'poi-sheet', 'profile-sheet', 'offline-sheet'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById('sheet-backdrop').classList.add('hidden');
}

document.getElementById('sheet-backdrop').addEventListener('click', closeAllSheets);
