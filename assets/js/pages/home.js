window.MGG_HOME = {
  async init() {
    const page = document.getElementById('pageContent');
    try {
      const mutants = await loadIndex();
      const featured = await loadFeatured(mutants);
      const cardTemplate = window.MGG_TEMPLATES.card;
      page.innerHTML = `<section class="hero"><div class="hero__bg" aria-hidden="true"></div><div class="hero__content"><p class="hero__eyebrow">Base de datos no oficial</p><h1 class="hero__title">Domina la arena.<br><span>Conoce cada espécimen.</span></h1><p class="hero__lede">Stats, habilidades, genes y cómo obtener a cada mutante de Genetic Gladiators, en un solo lugar.</p><div class="hero__cta"><a href="${url('/mutants')}" class="btn btn--primary">Ver todos los Mutants</a><a href="#destacados" class="btn btn--ghost">Destacados de esta semana</a></div><div class="hero__stats"><div><strong>${mutants.length}</strong><span>especímenes registrados</span></div><div><strong>${mutants.filter(mutant => mutant.rarity === 'legendary').length}</strong><span>legendarios</span></div><div><strong>5</strong><span>rangos de icono</span></div></div></div></section><section id="destacados" class="section"><div class="section__head"><h2>Destacados recientes</h2><a href="${url('/mutants')}">Ver el catálogo completo -&gt;</a></div><div class="cardgrid">${featured.map(cardTemplate).join('')}</div></section><section class="section section--muted"><div class="section__head"><h2>¿Cómo está organizada esta wiki?</h2></div><div class="infogrid"><div class="infocard"><span class="infocard__num">01</span><h3>Mutants</h3><p>El catálogo completo de especímenes, con filtros por rareza y gen.</p></div><div class="infocard"><span class="infocard__num">02</span><h3>Ficha individual</h3><p>Biografía, stats base y calculadora de stats por nivel para cada espécimen.</p></div><div class="infocard"><span class="infocard__num">03</span><h3>Datos preparados para API</h3><p>El frontend usa un contrato de datos local que puede conectarse a una API sin cambiar las rutas públicas.</p></div></div></section>`;
    } catch (error) {
      page.innerHTML = errorMessage(error);
    }
  }
};
