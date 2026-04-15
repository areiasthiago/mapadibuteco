/**
 * Scraper do Comida di Buteco 2026
 * Extrai todos os butecos de todas as cidades e gera src/data/butecos-scraped.json
 */

import { writeFileSync, readFileSync } from "fs";

// Lista de cidades e seus slugs no site da CDB
const CITIES = [
  { slug: "rio-de-janeiro",     label: "Rio de Janeiro",     state: "RJ" },
  { slug: "niteroi",            label: "Niterói",             state: "RJ" },
  { slug: "belo-horizonte",     label: "Belo Horizonte",      state: "MG" },
  { slug: "sao-paulo",          label: "São Paulo",           state: "SP" },
  { slug: "curitiba-butecos",   label: "Curitiba",            state: "PR" },
  { slug: "porto-alegre",       label: "Porto Alegre",        state: "RS" },
  { slug: "brasilia",           label: "Brasília",            state: "DF" },
  { slug: "salvador",           label: "Salvador",            state: "BA" },
  { slug: "recife",             label: "Recife",              state: "PE" },
  { slug: "fortaleza",          label: "Fortaleza",           state: "CE" },
  { slug: "manaus",             label: "Manaus",              state: "AM" },
  { slug: "goiania",            label: "Goiânia",             state: "GO" },
  { slug: "uberlandia",         label: "Uberlândia",          state: "MG" },
  { slug: "juiz-de-fora",       label: "Juiz de Fora",        state: "MG" },
  { slug: "campinas",           label: "Campinas",            state: "SP" },
  { slug: "vitoria",            label: "Vitória",             state: "ES" },
  { slug: "florianopolis",      label: "Florianópolis",       state: "SC" },
  { slug: "ribeirao-preto",     label: "Ribeirão Preto",      state: "SP" },
  { slug: "campo-grande",       label: "Campo Grande",        state: "MS" },
  { slug: "teresina",           label: "Teresina",            state: "PI" },
  { slug: "maceio",             label: "Maceió",              state: "AL" },
  { slug: "joao-pessoa",        label: "João Pessoa",         state: "PB" },
  { slug: "natal",              label: "Natal",               state: "RN" },
  { slug: "aracaju",            label: "Aracaju",             state: "SE" },
  { slug: "macapa",             label: "Macapá",              state: "AP" },
  { slug: "belem",              label: "Belém",               state: "PA" },
  { slug: "cuiaba",             label: "Cuiabá",              state: "MT" },
  { slug: "porto-velho",        label: "Porto Velho",         state: "RO" },
  { slug: "palmas",             label: "Palmas",              state: "TO" },
  { slug: "sao-luis",           label: "São Luís",            state: "MA" },
];

const BASE_URL = "https://comidadibuteco.com.br/butecos";
const GEOCODE_URL = "https://nominatim.openstreetmap.org/search";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function extractButecos(html, city, state) {
  const butecos = [];

  // Extrai cada bloco de artigo/buteco
  const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/gi;
  let match;

  while ((match = articleRegex.exec(html)) !== null) {
    const block = match[1];

    // Nome
    const nameMatch = block.match(/<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i)
      || block.match(/<h2[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();

    // Prato
    const dishMatch = block.match(/class="[^"]*nome-prato[^"]*"[^>]*>([^<]+)</i)
      || block.match(/Prato[^:]*:\s*<[^>]+>([^<]+)/i);
    const dish = dishMatch ? dishMatch[1].trim() : "";

    // Descrição do prato
    const descMatch = block.match(/class="[^"]*descricao-prato[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i)
      || block.match(/class="[^"]*prato-desc[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
    const dishDescription = descMatch
      ? descMatch[1].replace(/<[^>]+>/g, "").trim()
      : "Prato concorrente do Comida di Buteco 2026.";

    // Endereço
    const addrMatch = block.match(/class="[^"]*endereco[^"]*"[^>]*>([^<]+)</i)
      || block.match(/class="[^"]*address[^"]*"[^>]*>([^<]+)</i);
    const address = addrMatch ? addrMatch[1].trim() : "";

    // Bairro (extraído do endereço)
    const neighborhood = address.includes("|")
      ? address.split("|")[1]?.split(",")[0]?.trim() ?? ""
      : "";

    // Imagem
    const imgMatch = block.match(/<img[^>]+src="([^"]+)"/i);
    const image = imgMatch ? imgMatch[1] : "";

    if (name) {
      butecos.push({ name, dish, dishDescription, address, neighborhood, city, state, image, tags: [] });
    }
  }

  return butecos;
}

async function geocode(address, city, state) {
  await sleep(1100); // respeita rate limit do Nominatim (1 req/s)
  const query = `${address}, ${city}, ${state}, Brasil`;
  const url = `${GEOCODE_URL}?q=${encodeURIComponent(query)}&format=json&limit=1`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "MapaDiButeco/1.0" } });
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (_) {}
  return { lat: 0, lng: 0 };
}

async function main() {
  const results = [];
  let id = 1;

  // Lê base existente para evitar duplicatas
  let existingNames = new Set();
  try {
    const existing = JSON.parse(readFileSync("src/data/butecos-scraped.json", "utf-8"));
    existing.forEach((b) => existingNames.add(b.name.toLowerCase()));
    results.push(...existing);
    id = existing.length > 0 ? Math.max(...existing.map((b) => b.id)) + 1 : 1;
    console.log(`Base existente: ${existing.length} butecos`);
  } catch (_) {
    console.log("Nenhuma base existente, iniciando do zero.");
  }

  for (const city of CITIES) {
    const url = `${BASE_URL}/${city.slug}/`;
    console.log(`\nRaspando ${city.label}... (${url})`);

    try {
      const html = await fetchPage(url);
      const butecos = extractButecos(html, city.label, city.state);
      console.log(`  ${butecos.length} butecos encontrados`);

      for (const b of butecos) {
        if (existingNames.has(b.name.toLowerCase())) {
          console.log(`  ⏭ Já existe: ${b.name}`);
          continue;
        }

        const coords = b.address
          ? await geocode(b.address, city.label, city.state)
          : { lat: 0, lng: 0 };

        results.push({ id: id++, ...b, lat: coords.lat, lng: coords.lng });
        existingNames.add(b.name.toLowerCase());
        console.log(`  ✓ ${b.name} → ${coords.lat}, ${coords.lng}`);

        // Salva parcialmente a cada buteco (tolerante a falhas)
        writeFileSync("src/data/butecos-scraped.json", JSON.stringify(results, null, 2));
      }

      await sleep(2000); // pausa entre cidades
    } catch (err) {
      console.error(`  ✗ Erro em ${city.label}: ${err.message}`);
    }
  }

  console.log(`\n✅ Total: ${results.length} butecos salvos em src/data/butecos-scraped.json`);
}

main();
