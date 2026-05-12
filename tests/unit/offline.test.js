import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted mocks — apply to all imports (static and dynamic) in this file
vi.mock('leaflet', () => ({ default: {} }));
vi.mock('../../src/map.js', () => ({ getMap: vi.fn() }));

// Static import for pure functions that don't depend on module-level state
import { estimateTileCount } from '../../src/offline.js';

// Minimal stand-in for L.LatLngBounds
function makeBounds(north, west, south, east) {
  return {
    getNorthWest: () => ({ lat: north, lng: west }),
    getSouthEast: () => ({ lat: south, lng: east }),
  };
}

describe('estimateTileCount', () => {
  it('returns a positive number for a real-world area', () => {
    const count = estimateTileCount(makeBounds(-37, 144, -38, 145));
    expect(count).toBeGreaterThan(0);
  });

  it('result is even — one topo tile + one satellite tile per position', () => {
    const count = estimateTileCount(makeBounds(-37, 144, -37.1, 144.1));
    expect(count % 2).toBe(0);
  });

  it('larger area produces more tiles than a smaller area', () => {
    const small = estimateTileCount(makeBounds(-37, 144, -37.1, 144.1));
    const large = estimateTileCount(makeBounds(-37, 144, -38, 145));
    expect(large).toBeGreaterThan(small);
  });
});

// savedAreas is initialised from localStorage at module load time, so each
// test that cares about initial state must reset the module and re-import.
describe('getSavedAreas / deleteArea', () => {
  const sample = {
    name: 'Test Area',
    bounds: '144,-38,145,-37',
    downloadedAt: 1_000_000,
    tileCount: 100,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('returns empty array when localStorage has no saved areas', async () => {
    const { getSavedAreas } = await import('../../src/offline.js');
    expect(getSavedAreas()).toEqual([]);
  });

  it('loads areas pre-populated in localStorage at module load time', async () => {
    localStorage.setItem('offlineAreas', JSON.stringify([sample]));
    const { getSavedAreas } = await import('../../src/offline.js');
    expect(getSavedAreas()).toHaveLength(1);
    expect(getSavedAreas()[0].name).toBe('Test Area');
  });

  it('deleteArea removes the named area from the in-memory list', async () => {
    localStorage.setItem('offlineAreas', JSON.stringify([sample]));
    const { getSavedAreas, deleteArea } = await import('../../src/offline.js');
    await deleteArea('Test Area');
    expect(getSavedAreas()).toHaveLength(0);
  });

  it('deleteArea persists removal to localStorage', async () => {
    localStorage.setItem('offlineAreas', JSON.stringify([sample]));
    const { deleteArea } = await import('../../src/offline.js');
    await deleteArea('Test Area');
    expect(JSON.parse(localStorage.getItem('offlineAreas'))).toHaveLength(0);
  });

  it('deleteArea with unknown name leaves other areas untouched', async () => {
    localStorage.setItem('offlineAreas', JSON.stringify([sample]));
    const { getSavedAreas, deleteArea } = await import('../../src/offline.js');
    await deleteArea('Does Not Exist');
    expect(getSavedAreas()).toHaveLength(1);
  });
});
