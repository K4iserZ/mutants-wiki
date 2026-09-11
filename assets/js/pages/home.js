window.MGG_HOME = {
  async init() {
    const page = document.getElementById('pageContent');
    try {
      const mutants = await loadIndex();
      const featured = await loadFeatured(mutants);
      const cardTemplate = window.MGG_TEMPLATES.card;
      page.innerHTML = `<section class="hero"><div class="hero__bg" aria-hidden="true"></div><div class="hero__content"><p class="hero__eyebrow">Unofficial database</p><h1 class="hero__title">Dominate the arena.<br><span>Know every specimen.</span></h1><p class="hero__lede">Stats, abilities, genes, and how to obtain every Genetic Gladiators mutant, all in one place.</p><div class="hero__cta"><a href="${url('/mutants')}" class="btn btn--primary">View all Mutants</a><a href="#destacados" class="btn btn--ghost">Featured this week</a></div><div class="hero__stats"><div><strong>${mutants.length}</strong><span>registered specimens</span></div><div><strong>${mutants.filter(mutant => mutant.rarity === 'legendary').length}</strong><span>legendary</span></div><div><strong>5</strong><span>icon ranks</span></div></div></div></section><section id="destacados" class="section"><div class="section__head"><h2>Recently featured</h2><a href="${url('/mutants')}">View full catalog -&gt;</a></div><div class="cardgrid">${featured.map(cardTemplate).join('')}</div></section><section class="section section--muted"><div class="section__head"><h2>How is this wiki organized?</h2></div><div class="infogrid"><div class="infocard"><span class="infocard__num">01</span><h3>Mutants</h3><p>The complete specimen catalog, with filters by rarity and gene.</p></div><div class="infocard"><span class="infocard__num">02</span><h3>Individual profile</h3><p>Biography, base stats, and a level stat calculator for each specimen.</p></div><div class="infocard"><span class="infocard__num">03</span><h3>API-ready data</h3><p>The frontend uses a local data contract that can connect to an API without changing public routes.</p></div></div></section>`;
    } catch (error) {
      page.innerHTML = errorMessage(error);
    }
  }
};
