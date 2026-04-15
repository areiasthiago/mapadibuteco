/**
 * Regeocodifica butecos sem coordenadas
 */

import { readFileSync, writeFileSync, existsSync } from "fs";

const GEOCODE_URL = "https://nominatim.openstreetmap.org/search";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cleanStreet(address) {
  let street = address.includes("|") ? address.split("|")[0].trim() : address;
  street = street.replace(/\s*[-–]\s*[A-Za-z\s]+\d*\s*$/, "").trim();
  return street;
}

async function geocode(query) {
  await sleep(1200);
  const url = `${GEOCODE_URL}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "MapaDiButeco/1.0" } });
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (_) {}
  return null;
}

async function main() {
  const FILE = "src/data/butecos-scraped.json";
  if (!existsSync(FILE)) { console.log("Arquivo não encontrado."); process.exit(1); }

  const data = JSON.parse(readFileSync(FILE, "utf-8"));
  const semCoords = data.filter((b) => !b.lat || b.lat === 0);
  console.log(`Regeocodificando ${semCoords.length} butecos...`);

  let fixed = 0;
  for (const b of semCoords) {
    const street = cleanStreet(b.address);

    // Tentativa 1: rua + cidade + estado
    let coords = await geocode(`${street}, ${b.city}, ${b.state}, Brasil`);

    // Tentativa 2: só cidade (fallback)
    if (!coords && b.city) {
      coords = await geocode(`${b.city}, ${b.state}, Brasil`);
    }

    const idx = data.findIndex((x) => x.id === b.id);
    if (coords) {
      data[idx].lat = coords.lat;
      data[idx].lng = coords.lng;
      fixed++;
      console.log(`✓ [${fixed}] ${b.name} → ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
    } else {
      console.log(`✗ ${b.name}`);
    }

    if (fixed % 20 === 0) writeFileSync(FILE, JSON.stringify(data, null, 2));
  }

  writeFileSync(FILE, JSON.stringify(data, null, 2));
  const ainda = data.filter((b) => !b.lat || b.lat === 0).length;
  console.log(`\n✅ Corrigidos: ${fixed}. Ainda sem coords: ${ainda}`);
}

main().catch(console.error);
