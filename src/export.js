import { getAllPOIs } from './storage.js';

export async function exportGeoJSON() {
  const pois = await getAllPOIs();
  const geojson = {
    type: 'FeatureCollection',
    features: pois.map(poi => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [poi.lng, poi.lat] },
      properties: {
        id: poi.id,
        profileId: poi.profileId,
        category: poi.category,
        description: poi.description || '',
        createdAt: poi.createdAt,
        updatedAt: poi.updatedAt,
      },
    })),
  };

  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `map-export-${new Date().toISOString().slice(0, 10)}.geojson`;
  a.click();
  URL.revokeObjectURL(url);

  localStorage.setItem('lastExportDate', Date.now().toString());
}

export function checkBackupNudge() {
  const last = localStorage.getItem('lastExportDate');
  if (!last) return true;
  const daysSince = (Date.now() - parseInt(last)) / (1000 * 60 * 60 * 24);
  return daysSince > 14;
}
