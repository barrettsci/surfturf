import { beforeEach, describe, expect, it } from 'vitest';
// fake-indexeddb/auto is loaded via setup.js, patching globalThis.indexedDB
import { savePOI, getAllPOIs, getPOI, deletePOI, getPOIsByProfile } from '../../src/storage.js';

// Use one shared module instance; just clear all records between tests
beforeEach(async () => {
  const all = await getAllPOIs();
  await Promise.all(all.map(p => deletePOI(p.id)));
});

function makePOI(overrides = {}) {
  return {
    id: 'test-id',
    profileId: 'hunting',
    category: 'Deer Sighting',
    description: 'test notes',
    lat: -37.5,
    lng: 145.0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('storage', () => {
  it('saves and retrieves a POI by id', async () => {
    const poi = makePOI({ id: 'poi-1' });
    await savePOI(poi);
    expect(await getPOI('poi-1')).toEqual(poi);
  });

  it('returns undefined for a missing id', async () => {
    expect(await getPOI('nonexistent')).toBeUndefined();
  });

  it('getAllPOIs returns all saved entries', async () => {
    await savePOI(makePOI({ id: 'a' }));
    await savePOI(makePOI({ id: 'b' }));
    const all = await getAllPOIs();
    expect(all).toHaveLength(2);
    expect(all.map(p => p.id).sort()).toEqual(['a', 'b']);
  });

  it('getAllPOIs returns empty array when store is empty', async () => {
    expect(await getAllPOIs()).toEqual([]);
  });

  it('savePOI upserts (overwrites) an existing entry', async () => {
    const poi = makePOI({ id: 'upsert-1', description: 'original' });
    await savePOI(poi);
    await savePOI({ ...poi, description: 'updated' });
    expect((await getPOI('upsert-1')).description).toBe('updated');
  });

  it('deletePOI removes the entry', async () => {
    await savePOI(makePOI({ id: 'del-1' }));
    await deletePOI('del-1');
    expect(await getPOI('del-1')).toBeUndefined();
  });

  it('deletePOI on a missing id does not throw', async () => {
    await expect(deletePOI('ghost')).resolves.not.toThrow();
  });

  it('getPOIsByProfile filters by profileId', async () => {
    await savePOI(makePOI({ id: 'h-1', profileId: 'hunting' }));
    await savePOI(makePOI({ id: 'f-1', profileId: 'fishing' }));
    await savePOI(makePOI({ id: 'h-2', profileId: 'hunting' }));

    const hunting = await getPOIsByProfile('hunting');
    expect(hunting).toHaveLength(2);
    expect(hunting.every(p => p.profileId === 'hunting')).toBe(true);

    const fishing = await getPOIsByProfile('fishing');
    expect(fishing).toHaveLength(1);
    expect(fishing[0].id).toBe('f-1');
  });

  it('getPOIsByProfile returns empty array for unknown profile', async () => {
    await savePOI(makePOI({ id: 'x-1' }));
    expect(await getPOIsByProfile('unknown')).toEqual([]);
  });
});
