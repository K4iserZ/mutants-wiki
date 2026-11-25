function initReactorPage() {
  const page = document.getElementById('pageContent');
  page.innerHTML = '<section class="section section--tight reactor-page"><div class="section__head"><div><h1><img src="' + SITE_BASE + '/assets/img/main/picto_gatcha.png" alt="">Reactor</h1><p class="section__lede">Explore every available reactor and its specimens.</p></div></div><div class="reactor-selector"><label class="reactor-search" for="reactorSearch"><span>Search reactor</span><input type="search" id="reactorSearch" placeholder="Girl, Gothic..." autocomplete="off"></label><div class="reactor-picker-nav"><button class="reactor-picker-nav__button" id="reactorPrevious" type="button" aria-label="Previous reactor">&lt;</button><div class="reactor-picker" id="reactorPicker"><p class="loading">Loading reactors...</p></div><button class="reactor-picker-nav__button" id="reactorNext" type="button" aria-label="Next reactor">&gt;</button></div></div><div class="reactor-view" id="reactorView"><p class="loading">Select a reactor to see its contents.</p></div></section>';
  Promise.all([loadReactorCatalog(), loadIndex()]).then(([catalog, specimens]) => {
    if (!catalog.length) throw new Error('No reactors available');
    const specimenMap = new Map(specimens.map(specimen => [specimen.specimen, specimen]));
    const requestedReactor = new URLSearchParams(window.location.search).get('reactor');
    const selectedReactor = catalog.find(reactor => reactor.gacha_id === requestedReactor) || catalog[0];
    renderReactorPicker(catalog, selectedReactor.gacha_id);
    selectReactor(selectedReactor, specimenMap);
  }).catch(error => {
    document.getElementById('reactorPicker').innerHTML = errorMessage(error);
  });
}

async function loadReactorCatalog() {
  const response = await fetch(API_CONFIG.api.gacha);
  if (!response.ok) throw new Error('Unable to load the reactors');
  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : (payload?.data || payload?.gacha || []);
  return rows.filter(reactor => String(reactor.gacha_type || '').toLowerCase() === 'reactor' || reactor.collection).filter(reactor => reactor.gacha_id);
}

function renderReactorPicker(catalog, selectedId) {
  const picker = document.getElementById('reactorPicker');
  const search = document.getElementById('reactorSearch');
  let filteredCatalog = catalog;
  let activeIndex = Math.max(catalog.findIndex(reactor => reactor.gacha_id === selectedId), 0);
  const renderActive = () => {
    const reactor = filteredCatalog[activeIndex];
    if (!reactor) {
      picker.innerHTML = '<p class="reactor-search__empty">No reactors found.</p>';
      return;
    }
    picker.innerHTML = `<button class="reactor-picker__item is-active" type="button" data-reactor-id="${escapeHtml(reactor.gacha_id)}"><img src="${reactorCarouselImageUrl(reactor.gacha_id)}" alt="${escapeHtml(reactorLabel(reactor.gacha_id))}" loading="lazy"></button>`;
  };
  const selectAt = offset => {
    if (!filteredCatalog.length) return;
    activeIndex = (activeIndex + offset + filteredCatalog.length) % filteredCatalog.length;
    renderActive();
    picker.querySelector('[data-reactor-id]').click();
  };
  document.getElementById('reactorPrevious').addEventListener('click', () => selectAt(-1));
  document.getElementById('reactorNext').addEventListener('click', () => selectAt(1));
  renderActive();
  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    filteredCatalog = catalog.filter(reactor => reactorLabel(reactor.gacha_id).toLowerCase().includes(query));
    activeIndex = 0;
    renderActive();
    if (filteredCatalog.length) selectReactor(filteredCatalog[0], window.MGG_REACTOR_SPECIMENS);
  });
  picker.addEventListener('click', event => {
    const button = event.target.closest('[data-reactor-id]');
    if (!button) return;
    const reactor = filteredCatalog.find(item => item.gacha_id === button.dataset.reactorId);
    selectReactor(reactor, window.MGG_REACTOR_SPECIMENS);
  });
}

function selectReactor(reactor, specimenMap) {
  window.MGG_REACTOR_SPECIMENS = specimenMap;
  const view = document.getElementById('reactorView');
  view.innerHTML = renderReactor(reactor, specimenMap);
  requestAnimationFrame(() => view.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function renderReactor(reactor, specimenMap) {
  const collection = reactor.collection || {};
  const items = reactor.items || [];
  const title = reactorLabel(reactor.gacha_id);
  return `<div class="reactor-heading"><div class="reactor-heading__identity"><p class="reactor-heading__eyebrow">Reactor</p><div class="reactor-heading__name"><h2>${escapeHtml(title)}</h2><img src="${reactorImageUrl(reactor.gacha_id)}" data-fallback="${reactorImageFallbackUrl(reactor.gacha_id)}" alt="${escapeHtml(title)}" onerror="if(this.dataset.fallback){this.src=this.dataset.fallback;this.removeAttribute('data-fallback')}else{this.hidden=true}"></div></div><div class="reactor-meta"><div><span>Token cost</span><strong>${escapeHtml(collection.tokenCost || '-')}</strong></div><div><span>Hard currency</span><strong>${escapeHtml(formatReactorNumber(collection.hcCost))}</strong></div><div><span>Specimens</span><strong>${items.length}</strong></div></div></div><div class="reactor-items"><div class="section__head"><h3>Contents</h3><span>${items.length} specimens</span></div><div class="reactor-items__grid">${items.map(item => reactorItemMarkup(item, specimenMap, reactor.gacha_id)).join('')}</div></div>`;
}

function reactorItemMarkup(item, specimenMap, collectionId) {
  const specimen = specimenMap.get(item.specimen_id) || {};
  const name = item.name || item.specimen_name || specimen.name || specimen.displayName || 'Unnamed specimen';
  const skin = reactorItemSkin(item, collectionId);
  const image = reactorThumbnailUrl(item.specimen_id, skin);
  const starKey = reactorStarKey(item.stars);
  const starIcon = reactorStarIcon(starKey);
  const completionClass = String(item.source || '').toLowerCase() === 'completion' ? ' reactor-item--completion' : '';
  return `<article class="reactor-item${completionClass}"><div class="reactor-item__body"><h4>${escapeHtml(name)}</h4><div class="reactor-item__details"><div class="reactor-item__art"><img src="${image}" alt="${escapeHtml(name)}" loading="lazy" onerror="this.onerror=null;this.src='${reactorThumbnailUrl(item.specimen_id, '')}'></div><div class="reactor-item__stats"><img src="${starIcon}" alt="${escapeHtml(starKey)} star" title="${escapeHtml(starKey)} star" style="width:30px;height:30px;object-fit:contain"><span>${escapeHtml(item.odds || '-')}% odds</span></div></div></div></article>`;
}

function reactorStarKey(value) {
  const rank = Number.parseInt(value, 10) || 0;
  return API_CONFIG.starRanks.find(starRank => starRank.value === rank)?.key || 'basic';
}

function reactorStarIcon(key) {
  const source = API_CONFIG.assets.skinStars[key] || API_CONFIG.assets.skinStars.basic;
  return source.startsWith('/') ? `${SITE_BASE}${source}` : source;
}

function reactorItemSkin(item, collectionId) {
  const value = item.skin || item.skin_id || item.skinId || item.skin_name || item.skinName || item.gacha_skin || item.variant || collectionId || '';
  if (value && typeof value === 'object') return value.id || value.name || value.key || '';
  return String(value || '').trim();
}

function reactorThumbnailUrl(specimenId, skin) {
  const id = String(specimenId || '').toLowerCase();
  const skinId = String(skin || '').trim().toLowerCase();
  const suffix = skinId && skinId !== '_any' && skinId !== 'basic' ? `_${encodeURIComponent(skinId)}` : '';
  return `${API_CONFIG.assets.thumbnails}/${encodeURIComponent(id)}${suffix}.png`;
}

function reactorImageUrl(id) {
  return API_CONFIG.assets.gachaSkin.replace('{skin}', encodeURIComponent(String(id || '').toLowerCase()));
}

function reactorImageFallbackUrl(id) {
  return API_CONFIG.assets.gachaSkinFallback.replace('{skin}', encodeURIComponent(String(id || '').toLowerCase()));
}

function reactorCarouselImageUrl(id) {
  return `${SITE_BASE}/assets/img/gachacontent/btn_gacha_${encodeURIComponent(String(id || '').toLowerCase())}-en.png`;
}

function reactorLabel(id) {
  return String(id || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
}

function formatReactorNumber(value) {
  const text = String(value ?? '-');
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text).toLocaleString('en-US') : text;
}
