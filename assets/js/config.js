// Configuracion central de la wiki.
// Este archivo se carga antes que el resto de scripts y expone sus valores
// mediante window para conservar compatibilidad con los scripts clasicos.
window.MGG_CONFIG = {
  // Fuentes de datos, en orden de preferencia en static.js.
  api: {
    specimens: 'https://mgroup.alwaysdata.net/api/v1/specimens',
    specimen: 'https://mgroup.alwaysdata.net/api/v1/specimens/{specimen}',
    gacha: 'https://mgroup.alwaysdata.net/api/v1/gacha',
  },
  // Rutas de datos locales usadas como respaldo o configuracion auxiliar.
  data: {
    mutants: '/data/mutants',
  },
  // Recursos alojados fuera del repositorio o dentro de assets/.
  assets: {
    root: 'https://s-ak.kobojo.com/mutants/assets',
    thumbnails: 'https://s-ak.kobojo.com/mutants/assets/thumbnails',
    orbImage: 'https://s-ak.kobojo.com/mutants/assets/thumbnails/{orbId}.png',
    fightUi: 'https://s-ak.kobojo.com/mutants/assets/mobile/hud/fight_ui',
    gene: 'https://s-ak.kobojo.com/mutants/assets/mobile/hud/fight_ui/gene_{gene}.png',
    attackGene: '/assets/img/gene/attack_{gene}{effect}.png',
    larva: 'https://s-ak.kobojo.com/mutants/assets/larvas/larva_{specimenId}.png',
    skinStars: {
      basic: '/assets/img/icon/btn_black.png',
      bronze: 'https://s-ak.kobojo.com/mutants/assets/mobile/thumbnails/star_bronze.png',
      silver: 'https://s-ak.kobojo.com/mutants/assets/mobile/thumbnails/star_silver.png',
      gold: 'https://s-ak.kobojo.com/mutants/assets/mobile/thumbnails/star_gold.png',
      platinum: 'https://s-ak.kobojo.com/mutants/assets/mobile/thumbnails/star_platinum.png',
    },
    gachaSkin: 'https://s-ak.kobojo.com/mutants/assets/gachacontent/icon_{skin}.png',
    // Iconos comunes de la interfaz y del combate.
    icons: {
      orb: {
        n: 'https://s-ak.kobojo.com/mutants/assets/orb/orb_slot.png',
        s: 'https://s-ak.kobojo.com/mutants/assets/orb/orb_slot_spe.png',
      },
      ability: '/assets/img/abilities/ability_{ability}_big.png',
      life: 'https://s-ak.kobojo.com/mutants/assets/mobile/hud/common_files/icon_hp.png',
      speed: 'https://s-ak.kobojo.com/mutants/assets/mobile/hud/common_files/icon_speed.png',
      type: 'https://s-ak.kobojo.com/mutants/assets/mobile/hud/m_m_m/icon_{type}.png',
      // Traducciones entre claves de datos y nombres de archivos.
      mappings: {
        // Archivos de genes normales.
        geneFiles: {
          a: 'a',
          b: 'b',
          c: 'c',
          d: 'd',
          e: 'e',
          f: 'f',
          n: 'all',
        },
        // Archivos de genes usados por los ataques.
        attackGeneFiles: {
          a: 'a',
          b: 'b',
          c: 'c',
          d: 'd',
          e: 'e',
          f: 'f',
          n: 'n',
        },
        // Alias de habilidades para localizar sus iconos.
        abilityFiles: {
          weaken_plus: 'weaken',
          shield_plus: 'shield',
          regen: 'regenerate',
          regenerate: 'regenerate',
          regenerate_plus: 'regenerate',
        },
        // Etiquetas legibles para los tipos de orbe.
        orbTypeLabels: {
          attack: 'Attack',
          critical: 'Critical',
          life: 'Life',
          retaliate: 'Retaliate',
          shield: 'Shield',
          slash: 'Slash',
          strengthen: 'Strengthen',
          weaken: 'Weaken',
          regenerate: 'Regenerate',
          speed: 'Speed',
        },
        // Archivos de iconos asociados a cada tipo de mutante.
        typeFiles: {
          LEGEND: 'legend',
          GACHA: 'gacha',
          HEROIC: 'heroic',
          PVP: 'pvp',
          RECIPE: 'recipe',
          SEASONAL: 'seasonal',
          CAPTAINPEACE: 'captainpeace',
          VIDEOGAME: 'videogame',
          COMMUNITY: 'community',
        },
      },
    },
  },
};

// Configuracion visual y clasificacion por tipo de specimen.
// Se mantiene como global independiente porque static.js la consulta
// directamente durante la normalizacion de los datos.
window.MGG_TYPE_CONFIG = {
  LEGEND: { label: 'Legendary', className: 'legendary', color: '#ff2020', background: 'rgba(255, 68, 68, 0.25)' },
  GACHA: { label: 'Gacha', className: 'gacha', color: '#a4bcff', background: 'rgba(112, 169, 255, 0.18)' },
  HEROIC: { label: 'Heroic', className: 'heroic', color: '#4fd3e8', background: 'rgba(79, 232, 224, 0.15)' },
  PVP: { label: 'PVP', className: 'pvp', color: '#4fd3e8', background: 'rgba(232, 230, 79, 0.15)' },
  RECIPE: { label: 'Recipe', className: 'recipe', color: '#6ee057', background: 'rgba(87,224,138,.15)' },
  SEASONAL: { label: 'Seasonal', className: 'seasonal', color: '#e057c9', background: 'rgba(212, 87, 224, 0.15)' },
  CAPTAINPEACE: { label: 'captainpeace', className: 'captainpeace', color: '#ff7f29', background: 'rgba(255, 168, 68, 0.18)' },
  VIDEOGAME: { label: 'Videogame', className: 'videogame', color: '#57e08a', background: 'rgba(193, 255, 112, 0.18)' },
  COMMUNITY: { label: 'Community', className: 'community', color: '#57bde0', background: 'rgba(87, 203, 224, 0.15)' },
  DEFAULT: { label: 'Common', className: 'common', color: '#e0d857', background: 'rgba(222, 224, 87, 0.15)' },
};

// Etiquetas de rareza y parametros de paginacion del catalogo.
window.MGG_CATALOG_CONFIG = {
  rarityLabels: { common: 'Common', recipe: 'Secrets', gacha: 'Reactor', legendary: 'Legendary', heroic: 'Heroic', captainpeace: 'Exclusive', community: 'Community' },
  pageSize: 24,
};
