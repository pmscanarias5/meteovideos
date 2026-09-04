#!/bin/bash
# render.sh — Une los frames capturados en un vídeo MP4 vertical.
# Uso: ./render.sh [fps] [salida.mp4]

FPS=${1:-30}
OUT=${2:-weather_flythrough.mp4}

ffmpeg -y -framerate "$FPS" -i frames/frame_%05d.png \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow \
  "$OUT"

echo "Vídeo generado: $OUT"

# Para añadir música de fondo (opcional), descomenta y ajusta:
# ffmpeg -y -i "$OUT" -i musica.mp3 -shortest -c:v copy -c:a aac output_con_musica.mp4
