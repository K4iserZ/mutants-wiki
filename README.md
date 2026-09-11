# Mutants Genetic Gladiators — Wiki (base del proyecto)

Wiki en HTML + CSS + JS vanilla, con carga dinámica de especímenes ("Mutants").
El catálogo usa la API real y conserva los JSON locales como respaldo.

## Estructura de carpetas

```
mutants-wiki/
├── index.html              → SPA: inicio, catálogo y fichas
├── 404.html                → Fallback de rutas de GitHub Pages
├── data/
│   └── mutants/*.json        → Datos locales y configuración de portada
│       recent.json           → Specimens que aparecen como nuevas entradas
│       featured.json         → Specimens destacados de la portada (máximo 3)
└── assets/
    ├── css/style.css
  ├── js/                   → Frontend vanilla; ver js/JS_ARCHITECTURE.md
  │   ├── core/             → Enrutado y coordinación base
  │   ├── pages/            → Composición de páginas
  │   ├── templates/        → HTML reutilizable
  │   ├── calculator/       → Motor independiente de stats
  │   ├── config.js         → URLs de API y assets remotos
  │   └── static.js         → Datos, ficha e interacciones restantes
    └── img/mutants/          → Aquí van las imágenes reales cuando las tengas
```

## Cómo probarlo

Para probarlo localmente con el servidor Node incluido, sin PHP:

```bash
node server.mjs
```

Abre `http://localhost:8001/`. El catálogo está en `/mutants` y una ficha como
`http://localhost:8001/specimen/Buranka`.

## Cómo agregar un nuevo mutante (modo de prueba actual)

Para cambiar las novedades, edita `data/mutants/recent.json` y añade los
identificadores `specimen` que quieras mostrar en el ticker. El catálogo
principal se carga desde la API.

Para cambiar los destacados de la portada, edita `data/mutants/featured.json`
con identificadores `specimen` de la API, en el orden en que deben aparecer.
La portada muestra como máximo tres; si el archivo no está disponible o no
contiene identificadores válidos, usa automáticamente los últimos tres del catálogo.

La ficha pública será
`/specimen/NombreDelMutante`.

## API y assets remotos

El catálogo se carga desde `https://mgroup.alwaysdata.net/api/v1/specimens`.
Las URLs generales de assets están centralizadas en `assets/js/config.js`.
Los colores, etiquetas y clases visuales por tipo están en
`assets/js/type-config.js`. El catálogo carga 24 tarjetas inicialmente y
añade más automáticamente al desplazarse; el buscador filtra por nombre,
identificador `specimen` o DNA.
Cada thumbnail usa el campo `specimen`, por ejemplo:

```text
https://s-ak.kobojo.com/mutants/assets/thumbnails/Specimen_EF_06.png
```

El frontend convierte automáticamente el identificador a minúsculas al crear
la URL del thumbnail: `specimen_ef_06.png`.

Para cambiar la API o las rutas de assets, edita únicamente `config.js`.
El JSON local se conserva como fallback si la API no responde.

## La calculadora de stats por nivel

En la ficha de cada mutante hay un botón "🧮 Calcular por nivel" que
habilita un panel para ingresar el nivel deseado. Ahora mismo usa una
fórmula de ejemplo:

```
valor_en_nivel = base + (nivel - 1) × crecimiento_por_nivel
```

Los valores de `growth_per_level` están en cada JSON de mutante
(`stats.growth_per_level`). Cuando tengas la fórmula real del juego o
más parámetros (evoluciones, bonus de gen, etc.), solo hay que ajustar
la función de cálculo dentro de `assets/js/static.js`.

## Pendiente / próximos pasos sugeridos

- Reemplazar las "imágenes iniciales" (letra grande) por artes reales en
  `assets/img/mutants/`.
- Sección "Genes" y "Eventos" del menú (ya están los enlaces, deshabilitados).
- Paginación o buscador más completo en el catálogo.
- Conectar `loadIndex()` y la carga de detalle a la API cuando el backend esté listo.
