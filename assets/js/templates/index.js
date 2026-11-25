window.MGG_TEMPLATES = {
  renderShell() {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="ticker"><div class="ticker__label">New entries</div><div class="ticker__track"><div class="ticker__content" id="tickerContent"></div></div></div><header class="topbar"><a href="${url('/')}" class="brand"><span class="brand__helix" aria-hidden="true"><svg viewBox="0 0 40 40"><path class="helix-a" d="M4 4c10 8 22 8 32 0M4 20c10 8 22 8 32 0M4 36c10 8 22 8 32 0"/><path class="helix-b" d="M4 4c10-8 22-8 32 0M4 20c10-8 22-8 32 0M4 36c10-8 22-8 32 0"/></svg></span><span class="brand__text">MGG <em>WIKI</em></span></a><nav class="mainnav"><a href="${url('/mutants')}">Mutants</a><details class="nav-dropdown"><summary>Features</summary><div class="nav-dropdown__menu"><a href="${url('/reactor')}">Reactor</a><a href="${url('/pvp')}">PvP</a><a href="${url('/dungeons')}">Dungeons</a><a href="${url('/buildings')}">Buildings</a><a href="${url('/calculator')}">Calculator</a></div></details><a href="${url('/week-offers')}">Week Offers</a><a href="${url('/bingos')}">Bingos</a><a href="#" class="is-disabled">Guides</a></nav><div class="topbar__search"><input type="search" id="quickSearch" placeholder="Search specimen..." autocomplete="off"></div></header><main class="page" id="pageContent"><p class="loading">Loading...</p></main><footer class="sitefooter"><div class="sitefooter__helix" aria-hidden="true"></div><p class="sitefooter__note">Independent fan-made guide to Mutants: Genetic Gladiators.</p></footer>`;
    const header = app.querySelector('.topbar');
    const navigation = app.querySelector('.mainnav');
    const menuButton = document.createElement('button');
    menuButton.className = 'nav-toggle';
    menuButton.type = 'button';
    menuButton.setAttribute('aria-label', 'Open navigation menu');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-controls', 'mainnav');
    menuButton.innerHTML = '<span></span><span></span><span></span>';
    navigation.id = 'mainnav';
    navigation.setAttribute('aria-label', 'Main navigation');
    header.classList.add('has-nav-toggle');
    header.querySelector('.brand').after(menuButton);

    const setNavigationOpen = open => {
      header.classList.toggle('is-nav-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    };
    menuButton.addEventListener('click', () => setNavigationOpen(menuButton.getAttribute('aria-expanded') !== 'true'));
    navigation.addEventListener('click', event => {
      if (event.target.closest('a')) setNavigationOpen(false);
    });
    document.addEventListener('click', event => {
      if (!header.contains(event.target)) setNavigationOpen(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        setNavigationOpen(false);
        menuButton.focus();
      }
    });

    const featuresMenu = app.querySelector('.nav-dropdown');
    if (featuresMenu) {
      const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)');
      featuresMenu.addEventListener('pointerenter', event => {
        if (supportsHover.matches && event.pointerType === 'mouse') featuresMenu.open = true;
      });
      featuresMenu.addEventListener('pointerleave', event => {
        if (supportsHover.matches && event.pointerType === 'mouse') featuresMenu.open = false;
      });
      featuresMenu.querySelector('summary').addEventListener('click', event => {
        if (supportsHover.matches) event.preventDefault();
      });
      document.addEventListener('click', event => {
        if (!featuresMenu.contains(event.target)) featuresMenu.open = false;
      });
    }
    loadIndex().then(loadRecent).then(renderTicker).catch(() => {});
  },

  card(mutant) {
    const thumbnail = `${window.MGG_CONFIG.assets.thumbnails}/${encodeURIComponent((mutant.specimen || mutant.slug).toLowerCase())}.png`;
    return `<a class="mcard mcard--${mutant.className}" style="--type-color:${mutant.typeColor || 'var(--_accent)'}" href="${url(`/specimen/${slugify(mutant.name)}`)}"><div class="mcard__art"><img src="${thumbnail}" alt="${escapeHtml(mutant.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="mcard__initial" hidden>${initial(mutant.name)}</span></div><div class="mcard__body"><h3>${escapeHtml(mutant.name)}</h3><span class="pill pill--${mutant.className}" style="color:${mutant.typeColor || 'inherit'};background:${mutant.typeBackground || 'transparent'}">${escapeHtml(mutant.typeLabel || mutant.type || rarityLabel(mutant.className))}</span><div class="mcard__genes">${(mutant.genes || []).map(gene => `<span class="gene gene--${gene}">${escapeHtml(gene)}</span>`).join('')}</div></div></a>`;
  }
};
