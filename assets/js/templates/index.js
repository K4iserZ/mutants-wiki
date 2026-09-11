window.MGG_TEMPLATES = {
  renderShell() {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="ticker"><div class="ticker__label">Nuevas entradas</div><div class="ticker__track"><div class="ticker__content" id="tickerContent"></div></div></div><header class="topbar"><a href="${url('/')}" class="brand"><span class="brand__helix" aria-hidden="true"><svg viewBox="0 0 40 40"><path class="helix-a" d="M4 4c10 8 22 8 32 0M4 20c10 8 22 8 32 0M4 36c10 8 22 8 32 0"/><path class="helix-b" d="M4 4c10-8 22-8 32 0M4 20c10-8 22-8 32 0M4 36c10-8 22-8 32 0"/></svg></span><span class="brand__text">MGG <em>WIKI</em></span></a><nav class="mainnav"><a href="${url('/mutants')}">Mutants</a><a href="#" class="is-disabled">Genes</a><a href="#" class="is-disabled">Eventos</a><a href="#" class="is-disabled">Guías</a></nav><div class="topbar__search"><input type="search" id="quickSearch" placeholder="Buscar espécimen..." autocomplete="off"></div></header><main class="page" id="pageContent"><p class="loading">Cargando...</p></main><footer class="sitefooter"><div class="sitefooter__helix" aria-hidden="true"></div><p class="sitefooter__note">Datos actuales: JSON local. La fuente se puede sustituir por una API desde DATA_BASE.</p></footer>`;
    loadIndex().then(loadRecent).then(renderTicker).catch(() => {});
  },

  card(mutant) {
    const thumbnail = `${window.MGG_CONFIG.assets.thumbnails}/${encodeURIComponent((mutant.specimen || mutant.slug).toLowerCase())}.png`;
    return `<a class="mcard mcard--${mutant.className}" style="--type-color:${mutant.typeColor || 'var(--_accent)'}" href="${url(`/specimen/${slugify(mutant.name)}`)}"><div class="mcard__art"><img src="${thumbnail}" alt="${escapeHtml(mutant.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="mcard__initial" hidden>${initial(mutant.name)}</span></div><div class="mcard__body"><h3>${escapeHtml(mutant.name)}</h3><span class="pill pill--${mutant.className}" style="color:${mutant.typeColor || 'inherit'};background:${mutant.typeBackground || 'transparent'}">${escapeHtml(mutant.typeLabel || mutant.type || rarityLabel(mutant.className))}</span><div class="mcard__genes">${(mutant.genes || []).map(gene => `<span class="gene gene--${gene}">${escapeHtml(gene)}</span>`).join('')}</div></div></a>`;
  }
};
