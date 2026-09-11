# Arquitectura de JavaScript

## Propósito

Esta carpeta contiene el frontend vanilla de la wiki. El sitio se sirve como una SPA estática: `index.html` sirve como entrada normal y `404.html` funciona como fallback para las rutas de GitHub Pages.

La API principal de especímenes es remota. Los archivos JSON de `data/mutants/` contienen configuración y respaldos puntuales, como `recent.json` y `featured.json`.

## Estructura

```text
assets/js/
├── config.js                         Configuración de API, assets y catálogo
├── static.js                         Coordinación de datos, ficha, orbes e interacción restante
├── morphology-icons.js               Utilidades de iconos de morfología
├── main.js                           Código legado; no lo cargan las páginas actuales
├── core/
│   └── routing.js                    Arranque de la SPA y resolución de rutas públicas
├── pages/
│   └── home.js                       Composición de inicio y destacados
├── templates/
│   └── index.js                      Shell global y tarjeta reutilizable de mutante
└── calculator/
    └── stats-engine.js               Motor aislado de cálculo de stats
```

## Orden de carga

`index.html` y `404.html` cargan los scripts en este orden:

1. `config.js`
2. `calculator/stats-engine.js`
3. `templates/index.js`
4. `pages/home.js`
5. `static.js`
6. `core/routing.js`

Los archivos siguen siendo scripts clásicos, no módulos ES. Por eso comparten algunas funciones globales y exponen APIs explícitas en `window`.

## Responsabilidades

### `config.js`

Define `window.MGG_CONFIG`, con las URLs de API, datos y recursos externos. No debe contener lógica de renderizado.

También define `window.MGG_TYPE_CONFIG` y `window.MGG_CATALOG_CONFIG`, que contienen la clasificación visual, las etiquetas y la paginación del catálogo.

### `calculator/stats-engine.js`

Es la frontera de negocio para la calculadora. Contiene fórmulas y reglas de:

- Stats por nivel de fama.
- Evolución de ataques.
- Habilidades.
- Skins y estrellas.
- Bonificaciones gacha.
- Tipos y efectos de orbes.

Expone `window.MGG_STATS`. No debe generar HTML ni registrar eventos del DOM.

### `templates/index.js`

Contiene HTML reutilizable:

- Shell general de la aplicación.
- Tarjeta de mutante.

Expone `window.MGG_TEMPLATES`. Las plantillas reciben datos ya normalizados; no deben cargar datos ni calcular stats.

### `pages/home.js`

Carga los datos necesarios para la portada y compone:

- Hero.
- Estadísticas resumidas.
- Destacados de `data/mutants/featured.json`.
- Enlaces al catálogo.

Los destacados respetan el orden del JSON y muestran como máximo tres.

### `core/routing.js`

Resuelve las rutas públicas:

- `/`
- `/mutants`
- `/specimen/{slug}`

También instala la corrección de enlaces absolutos cuando el sitio corre bajo `/mutants-wiki` en GitHub Pages.

### `static.js`

Actualmente contiene la carga y normalización del catálogo, la carga de detalles, la plantilla extensa de la ficha, la interfaz visual de stats, orbes, skins y varias utilidades. Es el siguiente candidato para dividirse, pero cualquier extracción debe conservar las APIs globales actuales.

La lógica matemática no debe volver a `static.js`: debe permanecer en `calculator/stats-engine.js`.

## Flujo de una ficha

1. `core/routing.js` obtiene el slug de la URL.
2. `static.js` carga el catálogo y busca el mutante por `slugify(nombre)`.
3. Se combina la respuesta de la API con datos locales opcionales.
4. `renderDetail()` crea la estructura de la ficha.
5. `setupStats()` conecta los controles visuales con `window.MGG_STATS`.
6. El motor calcula los valores; la interfaz solo los presenta.

## Reglas para futuras modificaciones

- Mantener el cálculo de stats fuera de las plantillas y del DOM.
- No introducir rutas absolutas como `/mutants` en HTML nuevo; usar `url('/mutants')`.
- Usar `slugify(nombre)` para enlaces de mutantes.
- Escapar valores provenientes de API o JSON con `escapeHtml()` antes de insertarlos en HTML.
- Usar identificadores `specimen` en `recent.json` y `featured.json`.
- Si una nueva sección de ficha es específica de algunos mutantes, preferir datos JSON (`sections`) antes de duplicar plantillas.
- Mantener actualizado el orden de carga en `index.html` y `404.html`.
- Antes de eliminar una función global, comprobar sus referencias en todo `assets/js/`.

## Validación mínima

Después de modificar JavaScript:

```powershell
node --check assets/js/calculator/stats-engine.js
node --check assets/js/templates/index.js
node --check assets/js/pages/home.js
node --check assets/js/core/routing.js
node --check assets/js/static.js
```

También probar las rutas `/`, `/mutants` y `/specimen/{slug}` mediante `node server.mjs`.
