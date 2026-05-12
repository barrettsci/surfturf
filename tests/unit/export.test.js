import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock storage so export tests don't need a real IndexedDB
vi.mock('../../src/storage.js', () => ({
  getAllPOIs: vi.fn(),
}));

import { getAllPOIs } from '../../src/storage.js';
import { checkBackupNudge, exportGeoJSON } from '../../src/export.js';

describe('checkBackupNudge', () => {
  beforeEach(() => localStorage.clear());

  it('returns true when no export has ever happened', () => {
    expect(checkBackupNudge()).toBe(true);
  });

  it('returns false when last export was today', () => {
    localStorage.setItem('lastExportDate', Date.now().toString());
    expect(checkBackupNudge()).toBe(false);
  });

  it('returns true when last export was more than 14 days ago', () => {
    const fifteenDaysAgo = Date.now() - 15 * 24 * 60 * 60 * 1000;
    localStorage.setItem('lastExportDate', fifteenDaysAgo.toString());
    expect(checkBackupNudge()).toBe(true);
  });

  it('returns false at exactly 14 days ago', () => {
    const exactlyFourteen = Date.now() - 14 * 24 * 60 * 60 * 1000;
    localStorage.setItem('lastExportDate', exactlyFourteen.toString());
    expect(checkBackupNudge()).toBe(false);
  });
});

describe('exportGeoJSON', () => {
  let mockAnchor;

  beforeEach(() => {
    localStorage.clear();
    getAllPOIs.mockReset();

    // Capture the anchor click without triggering a real download
    mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValueOnce(mockAnchor);

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a valid GeoJSON FeatureCollection', async () => {
    const pois = [
      {
        id: 'g-1',
        profileId: 'hunting',
        category: 'Deer Sighting',
        description: 'test',
        lat: -37.5,
        lng: 145.0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    getAllPOIs.mockResolvedValue(pois);

    // Capture the Blob content via the createObjectURL spy
    let capturedBlob;
    URL.createObjectURL.mockImplementation((blob) => {
      capturedBlob = blob;
      return 'blob:mock-url';
    });

    await exportGeoJSON();

    const text = await capturedBlob.text();
    const geojson = JSON.parse(text);

    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toHaveLength(1);

    const feature = geojson.features[0];
    expect(feature.type).toBe('Feature');
    expect(feature.geometry.type).toBe('Point');
    // GeoJSON uses [lng, lat] order
    expect(feature.geometry.coordinates).toEqual([145.0, -37.5]);
    expect(feature.properties.category).toBe('Deer Sighting');
    expect(feature.properties.profileId).toBe('hunting');
  });

  it('exports empty FeatureCollection when no POIs exist', async () => {
    getAllPOIs.mockResolvedValue([]);

    let capturedBlob;
    URL.createObjectURL.mockImplementation((blob) => { capturedBlob = blob; return 'blob:mock-url'; });

    await exportGeoJSON();

    const geojson = JSON.parse(await capturedBlob.text());
    expect(geojson.features).toEqual([]);
  });

  it('triggers anchor click to start download', async () => {
    getAllPOIs.mockResolvedValue([]);
    await exportGeoJSON();
    expect(mockAnchor.click).toHaveBeenCalledOnce();
  });

  it('sets lastExportDate in localStorage', async () => {
    getAllPOIs.mockResolvedValue([]);
    const before = Date.now();
    await exportGeoJSON();
    const stored = parseInt(localStorage.getItem('lastExportDate'));
    expect(stored).toBeGreaterThanOrEqual(before);
  });

  it('download filename includes today\'s date', async () => {
    getAllPOIs.mockResolvedValue([]);
    await exportGeoJSON();
    expect(mockAnchor.download).toMatch(/map-export-\d{4}-\d{2}-\d{2}\.geojson/);
  });
});
