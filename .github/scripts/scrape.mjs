/**
 * Scraper do Comida di Buteco 2026
 * Estrutura real: div.item > div.caption > h2 (nome) + p (endereço) + a[href] (link detalhe)
 * Prato e descrição ficam na página individual de cada buteco
 */

import { writeFileSync, readFileSync, existsSync } from "fs";

const BASE_URL = "https://comidadibuteco.com.br/butecos";
const GEOCODE_URL = "https://nominatim.openstreetmap.org/search";
const OUTPUT = "src/data/butecos-scraped.json";
const TOTAL_PAGES = 92;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9",
  "Cache-Control": "max-age=0",
};

async function fetchHtml(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function parseAddress(address) {
  // Formato: "Rua Foo, 123 | Bairro, Cidade - UF"
  let neighborhood = "", city = "", state = "";
  if (address.includes("|")) {
    const after = address.split("|")[1]?.trim() || "";
    const parts = after.split(",");
    neighborhood = parts[0]?.trim() || "";
    const cityState = parts.slice(1).join(",").trim();
    if (cityState.includes("-")) {
      const idx = cityState.lastIndexOf("-");
      city = cityState.slice(0, idx).trim();
      state = cityState.slice(idx + 1).trim();
    } else {
      city = cityState;
    }
  }
  return { neighborhood, city, state };
}

function extractListPage(html) {
  const items = [];
  const itemRegex = /<div class="item">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let match;
  while ((match = itemRegex.exec(html)) !== null) {
    const block = match[1];

    const nameMatch = block.match(/<h2[^>]*>([^<]+)<\/h2>/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();

    // Endereço via link "Como chegar" do Google Maps — mais padronizado
    const mapsMatch = block.match(/maps\/search\/\?api=1&query=([^"]+)"/);
    const address = mapsMatch ? decodeURIComponent(mapsMatch[1].trim()) : "";

    const linkMatch = block.match(/href="(https?:\/\/comidadibuteco\.com\.br\/buteco\/[^"]+)"/);
    const link = linkMatch ? linkMatch[1] : "";

    const imgMatch = block.match(/src="(https:\/\/cdb-static[^"]+\.(?:jpg|jpeg|webp|png))"/);
    const image = imgMatch ? imgMatch[1] : "";

    if (name) items.push({ name, address, link, image });
  }
  return items;
}

function extractDetailPage(html) {
  // Prato
  const dishMatch = html.match(/class="[^"]*nome[_-]?prato[^"]*"[^>]*>([^<]+)/i)
    || html.match(/<h3[^>]*class="[^"]*prato[^"]*"[^>]*>([^<]+)/i)
    || html.match(/class="section-simple-title"[^>]*>([^<]+)/i);
  const dish = dishMatch ? dishMatch[1].trim() : "";

  // Descrição
  const descMatch = html.match(/class="[^"]*descri[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/i);
  const dishDescription = descMatch
    ? descMatch[1].replace(/<[^>]+>/g, "").trim()
    : "Prato concorrente do Comida di Buteco 2026.";

  // Endereço completo da página individual (fallback)
  // Estrutura: <div class="section-text">...<b>Endereço: </b>ENDEREÇO...
  let address = "";
  const addrMatch = html.match(/<b>Endere[çc]o:\s*<\/b>\s*([^<\n]+)/i);
  if (addrMatch) address = addrMatch[1].trim();

  return { dish, dishDescription, address };
}

async function geocode(address, city, state) {
  await sleep(1200);
  const query = [address, city, state, "Brasil"].filter(Boolean).join(", ");
  const url = `${GEOCODE_URL}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "MapaDiButeco/1.0" } });
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (_) {}
  return { lat: 0, lng: 0 };
}

async function main() {
  let results = [];
  let existingNames = new Set();

  if (existsSync(OUTPUT)) {
    results = JSON.parse(readFileSync(OUTPUT, "utf-8"));
    results.forEach((b) => existingNames.add(b.name.toLowerCase()));
    console.log(`Base existente: ${results.length} butecos`);
  }

  let nextId = results.length > 0 ? Math.max(...results.map((b) => b.id)) + 1 : 1;
  let newCount = 0;

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const url = page === 1 ? `${BASE_URL}/` : `${BASE_URL}/page/${page}/`;
    console.log(`\n[Página ${page}/${TOTAL_PAGES}]`);

    try {
      const html = await fetchHtml(url);
      const items = extractListPage(html);
      console.log(`  ${items.length} butecos encontrados`);

      for (const item of items) {
        if (existingNames.has(item.name.toLowerCase())) {
          process.stdout.write(".");
          continue;
        }

        // Busca detalhes na página individual (prato, descrição e endereço fallback)
        let dish = "";
        let dishDescription = "Prato concorrente do Comida di Buteco 2026.";
        let detailAddress = "";
        if (item.link) {
          try {
            await sleep(800);
            const detailHtml = await fetchHtml(item.link);
            const detail = extractDetailPage(detailHtml);
            dish = detail.dish;
            dishDescription = detail.dishDescription;
            detailAddress = detail.address;
          } catch (_) {}
        }

        // Usa endereço do Maps se tiver bairro (contém "|"), senão usa o da página individual
        const finalAddress = item.address.includes("|") ? item.address : (detailAddress || item.address);
        const { neighborhood, city, state } = parseAddress(finalAddress);

        const coords = finalAddress
          ? await geocode(finalAddress, city, state)
          : { lat: 0, lng: 0 };

        results.push({
          id: nextId++,
          name: item.name,
          neighborhood,
          dish,
          dishDescription,
          address: item.address,
          lat: coords.lat,
          lng: coords.lng,
          image: item.image,
          city,
          state,
          tags: [],
        });

        existingNames.add(item.name.toLowerCase());
        newCount++;
        console.log(`  ✓ ${item.name} (${city}/${state})`);
        writeFileSync(OUTPUT, JSON.stringify(results, null, 2));

        await sleep(500);
      }

      await sleep(2000);
    } catch (err) {
      console.error(`  ✗ Erro: ${err.message}`);
      await sleep(5000);
    }
  }

  console.log(`\n✅ Concluído! ${newCount} novos. Total: ${results.length}`);
}

main().catch(console.error);
