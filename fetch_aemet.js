// fetch_aemet.js — Consulta AEMET OpenData (predicción diaria por municipio)
// y genera sample_data/weather_points.json en el formato que espera index.html.
//
// Uso:
//   AEMET_API_KEY=tu_key node fetch_aemet.js
//
// Requiere: municipios.json — lista de municipios a mostrar en el vídeo,
// con su código AEMET/INE y coordenadas (ver ejemplo más abajo).
//
// Requiere: npm install node-fetch@2   (o usa el fetch nativo si tu Node es >=18)

const fs = require("fs");
const path = require("path");
const fetch = global.fetch || require("node-fetch");

const API_KEY = process.env.AEMET_API_KEY;
if (!API_KEY) {
  console.error("Falta AEMET_API_KEY. Ejemplo: AEMET_API_KEY=xxxx node fetch_aemet.js");
  process.exit(1);
}

// Lista de municipios a mostrar en el vídeo. "codigo" es el código INE/AEMET
// de 5 dígitos (ej. Madrid = 28079). lat/lon son para posicionar el icono
// en el mapa (AEMET no las devuelve en esta llamada).
const MUNICIPIOS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "municipios.json"), "utf8")
);

// Mapeo (parcial) de códigos "estadoCielo" de AEMET a nuestros iconos.
// Tabla completa de códigos: https://opendata.aemet.es/dist/index.html
// (los códigos con sufijo "n" son la versión nocturna del mismo icono)
function iconFromEstadoCielo(codigo) {
  const c = (codigo || "").replace("n", "");
  const n = parseInt(c, 10);
  if ([11, 12, 13].includes(n)) return "sun";        // despejado / poco nuboso
  if ([14, 15, 16, 17].includes(n)) return "cloud";  // nuboso / cubierto
  if ([23, 24, 25, 26, 43, 44, 45, 46].includes(n)) return "rain"; // lluvia
  if ([33, 34, 35, 36].includes(n)) return "snow";   // nieve
  if ([51, 52, 53, 54].includes(n)) return "storm";  // tormenta
  return "partly"; // fallback: intervalos nubosos
}

// Llama al endpoint, sigue la redirección a "datos" y devuelve el JSON final.
async function fetchAemet(endpoint) {
  const res = await fetch(`https://opendata.aemet.es/opendata/api${endpoint}`, {
    headers: { "api_key": API_KEY }
  });
  const meta = await res.json();
  if (!meta.datos) {
    throw new Error(`Respuesta inesperada de AEMET: ${JSON.stringify(meta)}`);
  }
  const dataRes = await fetch(meta.datos);
  const buffer = await dataRes.buffer ? await dataRes.buffer() : Buffer.from(await dataRes.arrayBuffer());
  // AEMET sirve el JSON en ISO-8859-15; lo decodificamos bien para evitar
  // problemas con tildes/ñ.
  const text = buffer.toString("latin1");
  return JSON.parse(text);
}

async function main() {
  const points = [];

  for (const m of MUNICIPIOS) {
    try {
      const [prediccion] = await fetchAemet(`/prediccion/especifica/municipio/diaria/${m.codigo}`);
      const dia0 = prediccion.prediccion.dia[0]; // hoy; usa [1] para mañana, etc.

      const estado = dia0.estadoCielo?.find(e => e.value)?.value || dia0.estadoCielo?.[0]?.value;
      const tempMax = dia0.temperatura?.maxima;

      points.push({
        lat: m.lat,
        lon: m.lon,
        temp: tempMax,
        icon: iconFromEstadoCielo(estado)
      });

      console.log(`OK  ${m.nombre} (${m.codigo}) -> ${tempMax}° ${iconFromEstadoCielo(estado)}`);
    } catch (err) {
      console.warn(`FALLO ${m.nombre} (${m.codigo}): ${err.message}`);
    }

    // AEMET limita a ~50 peticiones/minuto en el plan gratuito: pequeña pausa.
    await new Promise(r => setTimeout(r, 1200));
  }

  const outPath = path.join(__dirname, "sample_data", "weather_points.json");
  fs.writeFileSync(outPath, JSON.stringify(points, null, 2));
  console.log(`\nGenerado ${outPath} con ${points.length} puntos.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
