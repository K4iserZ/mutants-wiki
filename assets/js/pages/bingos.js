function initBingosPage() {
  const page = document.getElementById('pageContent');
  page.innerHTML = '<section class="section section--tight bingo-page"><div class="section__head"><div><h1><img src="' + SITE_BASE + '/assets/img/thumbnails/morphology.png" alt="">Bingos</h1><p class="section__lede">Explore every available bingo board and its rewards.</p></div></div><div class="bingo-picker-nav"><button class="bingo-picker-nav__button" id="bingoPrevious" type="button" aria-label="Previous bingo">&lt;</button><div class="bingo-picker" id="bingoPicker"><p class="loading">Loading bingos...</p></div><button class="bingo-picker-nav__button" id="bingoNext" type="button" aria-label="Next bingo">&gt;</button></div><div class="bingo-view" id="bingoView"><p class="loading">Select a bingo to see its structure.</p></div></section>';
  loadBingoCatalog().then(catalog => {
    if (!catalog.length) throw new Error('No bingos available');
    const requestedGrid = new URLSearchParams(window.location.search).get('grid');
    const selectedBingo = catalog.find(item => item.name === requestedGrid || item.gridId === requestedGrid) || catalog[0];
    renderBingoPicker(catalog, selectedBingo.name);
    selectBingo(selectedBingo);
  }).catch(error => {
    document.getElementById('bingoPicker').innerHTML = errorMessage(error);
  });
}

async function loadBingoCatalog() {
  const response = await fetch(API_CONFIG.api.morphology);
  if (!response.ok) throw new Error('Unable to load the bingos');
  const catalog = await response.json();
  if (!Array.isArray(catalog)) throw new Error('Invalid bingo response');
  return catalog;
}

function renderBingoPicker(catalog, selectedName) {
  const picker = document.getElementById('bingoPicker');
  picker.innerHTML = catalog.map(bingo => {
    const archived = String(bingo.status || '').toLowerCase() === 'inactive';
    return `<button class="bingo-picker__item${bingo.name === selectedName ? ' is-active' : ''}${archived ? ' is-archived' : ''}" type="button" data-bingo-name="${escapeHtml(bingo.name)}">${bingoIconMarkup(bingo, '')}<span class="bingo-picker__copy"><span class="bingo-picker__name">${escapeHtml(bingo.gridName || bingo.name)}</span>${archived ? '<small class="bingo-picker__status">Archived</small>' : ''}</span></button>`;
  }).join('');
  const selectAt = offset => {
    const activeIndex = catalog.findIndex(item => item.name === picker.querySelector('.is-active')?.dataset.bingoName);
    const nextIndex = Math.min(Math.max(activeIndex + offset, 0), catalog.length - 1);
    const button = picker.querySelectorAll('.bingo-picker__item')[nextIndex];
    if (button) button.click();
  };
  document.getElementById('bingoPrevious').addEventListener('click', () => selectAt(-1));
  document.getElementById('bingoNext').addEventListener('click', () => selectAt(1));
  picker.addEventListener('click', event => {
    const button = event.target.closest('[data-bingo-name]');
    if (!button) return;
    picker.querySelectorAll('.bingo-picker__item').forEach(item => item.classList.toggle('is-active', item === button));
    button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    selectBingo(catalog.find(item => item.name === button.dataset.bingoName));
  });
}

async function selectBingo(bingo) {
  const view = document.getElementById('bingoView');
  view.innerHTML = '<p class="loading">Loading bingo structure...</p>';
  try {
    const endpoint = API_CONFIG.api.morphologyData.replace('{name}', encodeURIComponent(bingo.name));
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Unable to load this bingo');
    renderBingo(view, bingo, await response.json());
  } catch (error) {
    view.innerHTML = errorMessage(error);
  }
}

function renderBingo(container, bingo, data) {
  const headers = data.headers || {};
  const columns = headers.cols || [];
  const rowHeaders = headers.lines || [];
  const rows = data.lines || [];
  const rewardGroups = data.rewards || {};
  const cells = rows.flatMap(row => (row.cols || []).map(cell => ({ ...cell, indexY: row.indexY })));
  const maxX = Math.max(columns.length, ...cells.map(cell => Number(cell.indexX) + 1), 0);
  const maxY = Math.max(rows.length, ...cells.map(cell => Number(cell.indexY) + 1), 0);
  const grid = Array.from({ length: maxY }, (_, y) => Array.from({ length: maxX }, (_, x) => cells.find(cell => Number(cell.indexX) === x && Number(cell.indexY) === y)));
  const lineRewards = rewardGroups.lines || [];
  const columnRewards = rewardGroups.cols || [];
  const specialReward = rewardGroups.special?.[0];
  const rewardCount = lineRewards.length + columnRewards.length + (specialReward ? 1 : 0);
  container.innerHTML = `<div class="bingo-heading"><div class="bingo-heading__identity"><p class="bingo-heading__eyebrow">Bingo board</p><div class="bingo-heading__name"><h2>${escapeHtml(bingo.gridName || data.gridName || bingo.name)}</h2>${bingoIconMarkup(bingo, bingo.gridName || bingo.name)}</div></div></div><div class="bingo-board-wrap"><div class="bingo-board" style="--bingo-columns:${Math.max(maxX, 1)}"><div class="bingo-board__corner"></div>${columns.map(header => `<div class="bingo-board__header">${bingoImageMarkup(header.icon)}</div>`).join('')}<div class="bingo-board__reward-header" aria-label="Line rewards"></div>${grid.map((row, y) => `<div class="bingo-board__row-label">${bingoImageMarkup(rowHeaders[y]?.icon)}</div>${row.map(cell => cell ? `<div class="bingo-cell"><img src="${thumbnailSpecimenImage(cell.specimenId, cell.skin)}" alt="${escapeHtml(cell.specimenId)}" loading="lazy" onerror="this.onerror=null;this.src='${thumbnailFallbackUrl()}'"></div>` : '<div class="bingo-cell bingo-cell--empty"></div>').join('')}${rewardMarkup(lineRewards[y])}`).join('')}<div class="bingo-board__reward-header" aria-label="Column rewards"></div>${Array.from({ length: maxX }, (_, index) => rewardMarkup(columnRewards[index])).join('')}${rewardMarkup(specialReward, true)}</div></div><section class="bingo-rewards"><div class="section__head"><h3>Rewards</h3><span>${rewardCount} available</span></div></section>`;
}

function rewardMarkup(reward, isSpecial = false) {
  if (!reward) return '<div class="bingo-reward bingo-reward--empty"></div>';
  const id = String(reward.id || '').trim();
  const image = id ? `${API_CONFIG.assets.thumbnails}/${encodeURIComponent(id.toLowerCase())}.png` : '';
  const fallbackImage = reward.type ? `${SITE_BASE}/assets/img/thumbnails/${encodeURIComponent(String(reward.type).toLowerCase())}.png` : '';
  return `<div class="bingo-reward bingo-reward--inline${isSpecial ? ' bingo-reward--special' : ''}" title="${escapeHtml(id || reward.type || 'Reward')}"><div class="bingo-reward__art">${image || fallbackImage ? `<img src="${image || fallbackImage}" alt="${escapeHtml(id || reward.type || 'Reward')}" onerror="this.hidden=true">` : ''}</div><span>x${escapeHtml(reward.amount || '0')}</span></div>`;
}

function thumbnailSpecimenImage(specimen, skin) {
  const id = String(specimen || '').toLowerCase();
  const skinId = String(skin || '').trim().toLowerCase();
  return `${API_CONFIG.assets.thumbnails}/${encodeURIComponent(id)}${skinId && skinId !== '_any' ? `_${encodeURIComponent(skinId)}` : ''}.png`;
}

function thumbnailFallbackUrl() {
  return `${SITE_BASE}/assets/img/thumbnails/icon_mutants.png`;
}

function bingoIconUrl(bingo) {
  return bingoAssetUrl(bingo.icon || bingo.gridIcon || '');
}

function bingoAssetUrl(path) {
  if (!path) return '';
  return `${API_CONFIG.assets.root}/${String(path).replace(/^\/+/, '')}`;
}

function bingoImageMarkup(path) {
  const source = bingoAssetUrl(path);
  return source ? `<img src="${source}" alt="">` : '';
}

function bingoIconMarkup(bingo, alt) {
  const source = bingoIconUrl(bingo);
  return source ? `<img src="${source}" alt="${escapeHtml(alt)}">` : '';
}
