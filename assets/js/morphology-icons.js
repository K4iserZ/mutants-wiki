const morphologyScriptUrl = typeof document !== 'undefined' && document.currentScript
  ? document.currentScript.src
  : '';

window.MORPHOLOGY_ICONS = {
  source: 'morphology.json',
  baseUrl: 'https://s-ak.kobojo.com/mutants/assets/',
  icons: {},
  loaded: false,

  async load(sourceUrl) {
    const jsonUrl = sourceUrl || new URL(this.source, morphologyScriptUrl || window.location.href).href;
    const response = await fetch(jsonUrl);
    if (!response.ok) throw new Error(`No se pudo cargar ${jsonUrl}`);

    const morphologies = await response.json();
    if (!Array.isArray(morphologies)) throw new Error('morphology.json debe contener un array');

    this.icons = Object.fromEntries(
      morphologies
        .filter(morphology => morphology.name && morphology.icon)
        .map(morphology => [morphology.name, morphology.icon])
    );
    this.loaded = true;
    return this.icons;
  },

  url(name) {
    const icon = this.icons[name];
    return icon ? `${this.baseUrl}${icon}` : '';
  }
};

window.MORPHOLOGY_ICONS.ready = window.MORPHOLOGY_ICONS.load('/data/morphology.json');