# Feature: CSV Import (from Google Earth / manual)

## Goal

Allow POIs to be imported from a CSV file so that existing waypoints (e.g. from Google Earth)
can be brought into the app after editing attributes in a spreadsheet or text editor.

## Proposed CSV format

```
lat,lng,category,description,profile
51.5074,-0.1278,Deer Sighting,Big buck seen at dawn,hunting
48.8566,2.3522,Dive Site,Visibility 10m,diving
```

- `lat` / `lng` — decimal degrees
- `category` — must match a category in the target profile (see open questions)
- `description` — free text, optional
- `profile` — profile `id` from profiles.json (`hunting`, `fishing`, `diving`)

## Proposed workflow

1. **Google Earth export:** File → Save Place As → KML
2. **KML → CSV conversion:** either a button in the app or a standalone Python script
   - Pre-fills `lat`, `lng`, and `description` from Placemark name/description
   - Leaves `category` and `profile` blank for the user to fill in
3. **Edit CSV** on desktop (Excel, Google Sheets, Notepad — anything)
4. **Transfer to phone** (email, Google Drive, USB, etc.)
5. **Import CSV** via a button in the app — parses rows and calls `savePOI()` for each

## Current profiles and categories (from profiles.json)

| Profile   | id       | Categories |
|-----------|----------|------------|
| Hunting   | hunting  | Deer Sighting, Vantage Point, Trail Camera, Scrape/Rub, Bedding Area, Pellets, Game Trail |
| Fishing   | fishing  | Fish Catch, Structure |
| Diving    | diving   | Dive Site |

## Open questions

- [ ] **Unknown category on import:** fail the row, skip it silently, or auto-create the category?
- [ ] **Unknown profile on import:** fail the row, or assign to a default profile?
- [ ] **KML → CSV step:** in-app button, or Python script for desktop use?
- [ ] **Duplicate handling:** if a POI with the same lat/lng/category already exists, skip or overwrite?
- [ ] **CSV with a header row:** always required, or optional?

## Files to create / modify

- `src/import.js` — CSV parser + KML→CSV converter
- `src/main.js` — wire up import button(s) and file input
- `index.html` — add import UI elements
