# Gerador de imagens (bairros e comida)

Imagens originais em 3D low-poly geradas com three.js (sem Blender).

1. Copia `js/vendor/three/three.min.js` para esta pasta.
2. `python3 -m http.server 8765` nesta pasta.
3. `python3 run.py bairro:baixa,comida:xima` (precisa de playwright e Chrome) -> PNGs em `out/`.
4. Converte para webp e põe em `img/bairros/` e `img/modelos/comida/`; novos ids de comida entram em `js/comida_fotos.js`.
