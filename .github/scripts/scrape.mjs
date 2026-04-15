/**
 * Scraper do Comida di Buteco 2026
 * Estrutura real: div.item > div.caption > h2 (nome) + p (endereço) + a[href] (link detalhe)
 * Prato e descrição ficam na página individual de cada buteco
 */

import { writeFileSync, readFileSync, existsSync } from "fs";

const BASE_URL = "https://comidadibuteco.com.br/butecos";
const GEOCODE_URL = "https://nominatim.openstreetmap.org/search";
const OUTPUT = "src/data/butecos-scraped.json";
const TOTAL_PAGES = 1; // DEBUG: remover depois

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

function decodeHtml(str) {
  return str
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .trim();
}

function parseAddress(address) {
  const normalized = decodeHtml(address).replace(/\s*[–—]\s*/g, " - ");
  let neighborhood = "", city = "", state = "";
  if (!normalized.includes("|")) return { neighborhood, city, state };

  const after = normalized.split("|")[1]?.trim() || "";

  // Estado: sempre 2 letras maiúsculas no final, após " - " ou ", "
  const stateMatch = after.match(/(?:\s*-\s*|,\s*)([A-Z]{2})\s*$/);
  if (!stateMatch) return { neighborhood, city, state };

  state = stateMatch[1].trim();
  const withoutState = after.slice(0, after.lastIndexOf(stateMatch[0])).trim();
  const parts = withoutState.split(",").map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    // "Bairro, Cidade" → neighborhood = Bairro, city = Cidade
    // Mas se a cidade tiver 2 letras maiúsculas não é UF — já removemos acima
    neighborhood = parts[0];
    city = parts.slice(1).join(", ");
  } else {
    // Só cidade, sem bairro: "Jaguariuna"
    city = parts[0] || "";
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
    const address = mapsMatch ? decodeHtml(decodeURIComponent(mapsMatch[1].trim())) : "";

    const linkMatch = block.match(/href="(https?:\/\/comidadibuteco\.com\.br\/buteco\/[^"]+)"/);
    const link = linkMatch ? linkMatch[1] : "";

    const imgMatch = block.match(/src="(https:\/\/cdb-static[^"]+\.(?:jpg|jpeg|webp|png))"/);
    const image = imgMatch ? imgMatch[1] : "";

    if (name) items.push({ name, address, link, image });
  }
  return items;
}

function extractDetailPage(html) {
  // Estrutura real: <p><b>Endereço: </b>endereço aqui</p>
  let address = "";
  const addrMatch = html.match(/<b>Endere[çc]o:\s*<\/b>\s*([^<]+)/i);
  if (addrMatch) address = decodeHtml(addrMatch[1].trim());

  // Debug: loga o <p> completo onde ficaria o endereço
  const addrPMatch = html.match(/<p[^>]*>[^<]*<b>Endere[çc]o[^<]*<\/b>[^<]*<\/p>/i);
  console.log(`    [addr-p] ${addrPMatch ? addrPMatch[0] : "NÃO ENCONTRADO"}`);
  console.log(`    [addr-extracted] "${address}"`);

  // Prato: <p><b>Nome do Prato</b> descrição...</p> — primeiro <b> da section-text
  // O nome do prato é o primeiro <b> antes de "Endereço"
  const sectionMatch = html.match(/class="section-text"[^>]*>([\s\S]*?)<\/div>/i);
  let dish = "";
  let dishDescription = "Prato concorrente do Comida di Buteco 2026.";
  if (sectionMatch) {
    const section = sectionMatch[1];
    const firstP = section.match(/<p[^>]*><b>([^<]+)<\/b>\s*([\s\S]*?)<\/p>/i);
    if (firstP) {
      dish = firstP[1].trim();
      dishDescription = firstP[2].replace(/<[^>]+>/g, "").trim() || dishDescription;
    }
  }

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

  if (existsSync(OUTPUT) && process.env.RESET !== "true") {
    results = JSON.parse(readFileSync(OUTPUT, "utf-8"));
    results.forEach((b) => existingNames.add(b.name.toLowerCase()));
    console.log(`Base existente: ${results.length} butecos`);
  } else {
    console.log("Iniciando do zero.");
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
        console.log(`    [final] "${finalAddress}"`);
        if (!item.address.includes("|")) {
          console.log(`    [fallback] maps="${item.address}" detail="${detailAddress}"`);
        }
        const { neighborhood, city, state } = parseAddress(finalAddress);
        if (!city) console.log(`    [sem cidade] addr="${finalAddress}"`);

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
