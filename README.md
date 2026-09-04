# Weather Flythrough — sobrevuelo meteo estilo reel

Genera un vídeo tipo "flyover" 3D sobre un mapa satelital con iconos de tiempo
y temperaturas, como el reel de referencia.

## Cómo funciona

1. `index.html` levanta un `SceneView` 3D de ArcGIS (basemap satelital +
   terreno de elevación), coloca un icono + temperatura por cada punto de tus
   datos, y expone `window.setCameraAtProgress(t)` para mover la cámara a una
   posición exacta según el progreso `t` (0 a 1) a lo largo de una ruta de
   waypoints.
2. `capture.js` (Puppeteer) abre esa página en un navegador headless y, para
   cada frame del vídeo final, fija `t`, espera a que la escena termine de
   renderizar, y hace una captura PNG. Esto es **determinista**: no depende
   de la velocidad real de renderizado, así el vídeo sale fluido siempre.
3. `render.sh` (ffmpeg) une los PNG en un MP4.

## Puesta en marcha

```bash
npm install puppeteer http-server

# Terminal 1: sirve la página
npx http-server . -p 8080

# Terminal 2: captura los frames (12s a 30fps por defecto)
node capture.js 12 30

# Genera el vídeo
chmod +x render.sh
./render.sh 30 weather_flythrough.mp4
```

## Qué tienes que personalizar

- **`DATA_URL` en `index.html`**: pon aquí la URL de tu API real. Debe
  devolver JSON con esta forma (ver `sample_data/weather_points.json`):
  ```json
  [{ "lat": 41.9, "lon": 12.5, "temp": 33, "icon": "sun" }, ...]
  ```
  Iconos soportados: `sun`, `cloud`, `partly`, `rain`, `storm`, `snow`
  (edita el diccionario `ICONS` para añadir más o usar tus propios PNG con
  `PictureMarkerSymbol` en vez de emoji).

- **`ROUTE_URL` / `sample_data/camera_route.json`**: la ruta de cámara
  (sobrevuelo). Cada waypoint es `{ lon, lat, z, heading, tilt }` — `z` es
  altura en metros, `tilt` es inclinación (0=cenital, 90=horizonte). Añade
  tantos waypoints como quieras para controlar el recorrido; se interpolan
  linealmente entre ellos.

- **Duración/FPS**: `node capture.js <segundos> <fps>`.

- **Formato del vídeo**: `VIEWPORT` en `capture.js` está en `1080x1920`
  (vertical, formato reel). Cámbialo si lo quieres en otro formato.

- **API key de ArcGIS**: el basemap `satellite` público funciona sin key con
  límites de uso razonables para pruebas; para uso en producción/volumen,
  añade tu API key en `esriConfig.apiKey` dentro de `index.html`.

## Usando la API de AEMET (con tu api_key)

`fetch_aemet.js` consulta la predicción diaria por municipio de AEMET y
genera `sample_data/weather_points.json` automáticamente:

```bash
npm install node-fetch@2   # si tu Node es <18 (si es >=18, no hace falta)
AEMET_API_KEY=tu_key node fetch_aemet.js
```

Antes edita `municipios.json` con los municipios que quieras mostrar en el
vídeo (código INE/AEMET de 5 dígitos + lat/lon). AEMET no devuelve
coordenadas en la respuesta de predicción, así que ese fichero es tu tabla
de referencia; si necesitas los códigos/coordenadas de más municipios, el
nomenclátor del INE o vuestro propio callejero del IGN te sirven.

El script reparte las llamadas con una pausa de 1,2s (AEMET limita a ~50
peticiones/minuto en el plan gratuito). Los códigos `estadoCielo` se mapean
a nuestros iconos en `iconFromEstadoCielo()` — la tabla incluida es parcial,
amplíala si ves iconos raros (`partly` es el valor por defecto).

## Si quieres iterar conmigo

Pásame la URL real de tu API (o un JSON de ejemplo de lo que devuelve) y la
zona/ruta que quieres sobrevolar, y te dejo `DATA_URL`, `ROUTE_URL` e
`ICONS` ya ajustados a tu caso concreto.
