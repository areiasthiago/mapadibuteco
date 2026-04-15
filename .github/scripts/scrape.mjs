/**
 * Scraper do Comida di Buteco 2026
 * Pagina /butecos/page/N/ e extrai todos os botecos
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
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Cache-Control": "max-age=0",
};

async function fetchPage(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function extractFromPage(html) {
  const butecos = [];

  // Cada buteco é um <article>
  const articles = html.match(/<article[^>]*>([\s\S]*?)<\/article>/gi) || [];

  for (const article of articles) {
    // Nome do buteco
    const nameMatch = article.match(/<h2[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();

    // Link da página individual
    const linkMatch = article.match(/href="(https?:\/\/comidadibuteco\.com\.br\/butecos\/[^"]+)"/i);
    const link = linkMatch ? linkMatch[1] : "";

    // Nome do prato
    const dishMatch = article.match(/class="[^"]*nome[_-]?prato[^"]*"[^>]*>([^<]+)/i)
      || article.match(/class="[^"]*prato[^"]*"[^>]*>([^<]+)/i);
    const dish = dishMatch ? dishMatch[1].trim() : "";

    // Descrição
    const descMatch = article.match(/class="[^"]*descri[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div|span)>/i);
    const dishDescription = descMatch
      ? descMatch[1].replace(/<[^>]+>/g, "").trim()
      : "Prato concorrente do Comida di Buteco 2026.";

    // Endereço
    const addrMatch = article.match(/class="[^"]*endereco[^"]*"[^>]*>([^<]+)/i)
      || article.match(/class="[^"]*address[^"]*"[^>]*>([^<]+)/i);
    const address = addrMatch ? addrMatch[1].trim() : "";

    // Bairro e cidade do endereço (ex: "R. Foo, 123 | Bairro, Cidade - UF")
    let neighborhood = "";
    let city = "";
    let state = "";
    if (address.includes("|")) {
      const parts = address.split("|")[1]?.trim() || "";
      const cityParts = parts.split(",");
      neighborhood = cityParts[0]?.trim() || "";
      const cityState = cityParts[1]?.trim() || "";
      if (cityState.includes("-")) {
        city = cityState.split("-")[0].trim();
        state = cityState.split("-")[1].trim();
      } else {
        city = cityState;
      }
    }

    // Imagem
    const imgMatch = article.match(/<img[^>]+src="([^"]+)"/i);
    const image = imgMatch ? imgMatch[1] : "";

    butecos.push({ name, link, dish, dishDescription, address, neighborhood, city, state, image });
  }

  return butecos;
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
  // Carrega base existente
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
    console.log(`\n[Página ${page}/${TOTAL_PAGES}] ${url}`);

    try {
      const html = await fetchPage(url);
      const butecos = extractFromPage(html);
      console.log(`  ${butecos.length} butecos encontrados`);

      for (const b of butecos) {
        if (existingNames.has(b.name.toLowerCase())) {
          process.stdout.write(".");
          continue;
        }

        const coords = b.address
          ? await geocode(b.address, b.city, b.state)
          : { lat: 0, lng: 0 };

        results.push({
          id: nextId++,
          name: b.name,
          neighborhood: b.neighborhood,
          dish: b.dish,
          dishDescription: b.dishDescription,
          address: b.address,
          lat: coords.lat,
          lng: coords.lng,
          image: b.image,
          city: b.city,
          state: b.state,
          tags: [],
        });

        existingNames.add(b.name.toLowerCase());
        newCount++;
        console.log(`  ✓ ${b.name} (${b.city}/${b.state}) → ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);

        // Salva após cada novo buteco
        writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
      }

      await sleep(2000); // pausa entre páginas
    } catch (err) {
      console.error(`  ✗ Erro: ${err.message}`);
      await sleep(5000); // pausa maior em caso de erro
    }
  }

  console.log(`\n✅ Concluído! ${newCount} novos butecos. Total: ${results.length}`);
}

main().catch(console.error);
