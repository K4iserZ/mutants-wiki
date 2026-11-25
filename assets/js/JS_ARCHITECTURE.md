# Arquitectura de JavaScript

## Propósito

El frontend está escrito en JavaScript vanilla y funciona como una SPA estática. `index.html` es la entrada normal y `404.html` sirve como fallback para las rutas de GitHub Pages.

La API remota entrega especímenes, listas destacadas y recientes, disponibilidad, reactores, bingos y PvP. `data/mutants/` conserva respaldos locales del catálogo y datos opcionales para completar fichas.

## Estructura

```text
assets/js/
├── config.js                         URLs de API y configuración visual/assets
├── static.js                         Catálogo, ficha, disponibilidad y utilidades compartidas
├── morphology-icons.js               Ayudante opcional para iconos de morfología
├── main.js                           Implementación antigua; no se carga en la SPA actual
├── core/
│   └── routing.js                    Inicio de la SPA, carga de stats y resolución de rutas
├── pages/
│   ├── home.js                       Portada y destacados
│   ├── calculator.js                 Tarjetas comparativas de stats y configuración por specimen
│   ├── bingos.js                     Selector, tablero y recompensas de Bingo
│   ├── reactor.js                    Selector y contenido de reactores
│   ├── pvp.js                        Temporadas, ligas y recompensas PvP
│   ├── dungeons.js                   Dungeons destacadas de challenge, experiment y raid
│   └── week-offers.js                Ofertas del sprint por semana y día
├── templates/
│   └── index.js                      Shell global y tarjeta reutilizable de specimen
└── calculator/
    └── stats-engine.js               Motor aislado de cálculo de stats
```

`morphology-icons.js` expone `window.MORPHOLOGY_ICONS`, pero no forma parte del orden de carga actual de `index.html` ni de `404.html`.

## Orden de carga

`index.html` y `404.html` cargan los scripts en este orden:

1. `config.js`
2. `templates/index.js`
3. `pages/home.js`
4. `pages/bingos.js`
5. `pages/reactor.js`
6. `pages/pvp.js`
7. `pages/dungeons.js`
8. `pages/week-offers.js`
9. `static.js`
10. `pages/calculator.js`
11. `core/routing.js`

Los scripts son clásicos, no módulos ES. Comparten funciones globales; las APIs reutilizables se exponen explícitamente en `window` cuando corresponde. `calculator/stats-engine.js` se carga dinámicamente al abrir una ficha de specimen o Calculator.

## Responsabilidades

### `config.js`

Define `window.MGG_CONFIG`, `window.MGG_TYPE_CONFIG` y `window.MGG_CATALOG_CONFIG`. Centraliza URLs de API, recursos y opciones visuales; no debe contener renderizado.

### `calculator/stats-engine.js`

Es la frontera de negocio para la calculadora. Contiene fórmulas y reglas de:

- Stats por nivel de fama.
- Evolución de ataques.
- Habilidades.
- Skins y estrellas.
- Bonificaciones gacha.
- Tipos y efectos de orbes.

Las entradas gacha de tipo `skin` mantienen una opción de cálculo por variante, aunque compartan `gacha_id`; el icono de categoría y la imagen siguen usando ese `gacha_id`. Las entradas `reactor` mantienen su identidad y comportamiento actuales.

Expone `window.MGG_STATS`. No debe generar HTML ni registrar eventos del DOM.

### `templates/index.js`

Expone `window.MGG_TEMPLATES`. Renderiza el shell común, la navegación y las tarjetas de specimen. Recibe datos ya normalizados; no carga datos ni calcula stats.

### `pages/home.js`

Compone la portada y usa `loadIndex()`, `loadFeatured()` y `window.MGG_TEMPLATES.card()` para mostrar el catálogo resumido y los destacados.

### `pages/bingos.js`

Consulta `/morphology` para llenar el selector y `/morphology/{name}/data` para dibujar cada tablero y sus recompensas. Las entradas con `status: "inactive"` permanecen seleccionables y llevan la etiqueta visual `Archived`.

### `pages/reactor.js`

Consulta `/gacha`, normaliza el catálogo de reactores y presenta las colecciones y especímenes de cada reactor.

### `pages/pvp.js`

Consulta `/pvp` y presenta temporadas, ligas y recompensas. Los `item_id` se usan para thumbnails; las recompensas de specimens enlazan a sus fichas.

### `pages/dungeons.js`

Consulta `/dungeons?type={type}` para challenge, experiment y raid. Muestra sus imágenes de recap y las dungeons destacadas configuradas por filtro. Al seleccionar un recap, abre un carrusel 2D que conserva el orden de la API y solo carga las cinco imágenes visibles. En Current Dungeons selecciona Challenge y Experiment por el intervalo `startAt`–`endAt` (inicio incluido y fin excluido), ignorando `active`; sus contadores muestran el tiempo hasta `endAt`, o hasta el inicio de la siguiente dungeon si su `startAt` coincide con ese fin. Raid se selecciona con `raidSchedule.current.dungeonId`. El contador de la próxima raid usa `raidSchedule.upcoming[0].startsAt`, con `current.endDateTime` como respaldo. Al pulsar una imagen destacada, muestra u oculta su `imgdungeonrewards` en un panel debajo de toda la sección.

### `pages/week-offers.js`

Consulta `/offers/sprint/latest` y permite seleccionar el sprint vigente y hasta los dos siguientes disponibles, y filtrar las ofertas por semana y día. El sprint vigente se determina por las fechas; cuando comienza el siguiente, los sprints anteriores dejan de mostrarse. Usa `picture` para las imágenes, `offer_id` como alternativa y normaliza `$$` al sufijo `-en`.

### `pages/calculator.js`

Compone una vista independiente de la ficha: inicia con un specimen y activa la comparación de hasta cinco tarjetas bajo demanda. Cada tarjeta tiene un fame level, skin y selección de orbes propios. Reutiliza el catálogo, la normalización, los helpers de assets y `window.MGG_STATS`; los bonus de orbes siempre se aplican y el cálculo permanece en el motor de stats.

### `core/routing.js`

Renderiza el shell, configura la búsqueda y resuelve `/`, `/mutants`, `/reactor`, `/pvp`, `/dungeons`, `/week-offers`, `/bingos`, `/calculator` y `/specimen/{slug}`. Ajusta enlaces absolutos cuando la app corre bajo `/mutants-wiki` en GitHub Pages. En rutas de specimen y Calculator carga primero `calculator/stats-engine.js`.

### `static.js`

Carga el catálogo desde `/specimens`, con fallback a `data/mutants/index.json`, normaliza datos y renderiza el catálogo y la ficha. Maneja stats visuales, skins, orbes, recetas y disponibilidad. En “How to Obtain” consulta primero disponibilidad, muestra `specimenName` en buildings y dungeons, `cost.name` en lugar del ID del costo, y las fechas de llegada en buildings (`arrivalDate`) y dungeons (`startAt`); indica `No date` cuando un detalle de building no trae fecha. Usa el endpoint antiguo de recompensas de dungeon como respaldo cuando `details` está vacío. La lógica de cálculo permanece en `calculator/stats-engine.js`.

### `morphology-icons.js`

Ayudante independiente para crear un mapa de iconos de morfología desde JSON. No se carga desde las entradas actuales; comprobar su uso antes de integrarlo o eliminarlo.

### `main.js`

Contiene una implementación antigua de catálogo y fichas. No está referenciada por las entradas actuales; no añadir nuevas rutas ni lógica aquí.

## Flujo de una ficha

1. `core/routing.js` obtiene el slug y carga el motor de stats.
2. `static.js` busca el specimen en el catálogo y solicita `/specimens/{specimen}`.
3. La respuesta se combina con datos locales opcionales y se normaliza.
4. `renderDetail()` construye la ficha; `setupStats()` conecta la interfaz con `window.MGG_STATS`.
5. “How to Obtain” carga disponibilidad y consulta recompensas PvP o dungeon solo si sus métodos están marcados como disponibles. Los detalles de dungeon vienen primero de `availability.methods[].details` (incluidos `specimenName` y `startAt`); `/dungeons/rewards/{id}` se conserva como respaldo si `details` está vacío.

## Reglas para futuras modificaciones

- Mantener el cálculo de stats fuera de las plantillas y del DOM.
- En rutas nuevas usar `url('/ruta')` para respetar el prefijo de GitHub Pages.
- Usar `slugify(nombre)` para enlazar fichas de specimen.
- Escapar valores provenientes de API o JSON con `escapeHtml()` antes de insertarlos en HTML.
- Usar IDs técnicos para resolver assets; los nombres visibles deben venir de datos del API cuando estén disponibles.
- Si se agrega un script, actualizar tanto `index.html` como `404.html` y esta documentación.
- Antes de eliminar una función global, comprobar sus referencias en todo `assets/js/`.

## Validación mínima

Después de modificar JavaScript, ejecutar `node --check` sobre los archivos modificados. Para validar en navegador, iniciar `node server.mjs` y probar `/`, `/mutants`, `/reactor`, `/pvp`, `/bingos` y `/specimen/{slug}`.
