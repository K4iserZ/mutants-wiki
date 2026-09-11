// Configuración visual y clasificación por tipo de specimen.
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

// Etiquetas de rareza y tamaño de página del catálogo.
window.MGG_CATALOG_CONFIG = {
  rarityLabels: { common: 'Common', recipe: 'Secrets', gacha: 'Reactor', legendary: 'Legendary' , heroic: 'Heroic', captainpeace: 'Exclusive' , community: 'Community' },
  pageSize: 24,
};
