const scriptUrl = document.currentScript ? new URL(document.currentScript.src) : new URL(window.location.href);
const SITE_BASE = window.location.hostname.endsWith('.github.io') ? '/mutants-wiki' : '';
window.MGG_SITE_BASE = SITE_BASE;
const API_CONFIG = window.MGG_CONFIG;
const DATA_BASE = `${SITE_BASE}${API_CONFIG.data.mutants}`;
const app = document.getElementById('app');
let indexPromise;
let abilitiesConfigPromise;
let gachaConfigPromise;
let orbsConfigPromise;

async function loadIndex() {
  if (!indexPromise) {
    indexPromise = (async () => {
      try {
        const response = await fetch(API_CONFIG.api.specimens);
        if (!response.ok) throw new Error('API unavailable');
        const specimens = await response.json();
        if (!Array.isArray(specimens)) throw new Error('Invalid API response');
        return specimens.map(normalizeSpecimen);
      } catch (error) {
        const response = await fetch(`${DATA_BASE}/index.json`);
        if (!response.ok) throw new Error('Unable to load the catalog');
        return response.json().then(specimens => specimens.map(normalizeSpecimen));
      }
    })();
  }
  return indexPromise;
}
function normalizeSpecimen(specimen) { const typeName = String(specimen.type || 'DEFAULT').toUpperCase(); const type = typeConfig(typeName); return { ...specimen, type: specimen.type || 'DEFAULT', slug: specimen.specimen || specimen.slug, className: type.className, rarity: type.className, typeLabel: type.label, typeColor: type.color, typeBackground: type.background, genes: specimen.dna ? [specimen.dna] : (specimen.genes || []) }; }
function typeConfig(type) { return window.MGG_TYPE_CONFIG[String(type || '').toUpperCase()] || window.MGG_TYPE_CONFIG.DEFAULT; }
async function loadRecent(mutants) {
  try {
    const response = await fetch(`${DATA_BASE}/recent.json`);
    if (!response.ok) throw new Error('Recent entries unavailable');
    const recentIds = await response.json();
    const recent = new Set(recentIds);
    return mutants.filter(m => recent.has(m.specimen));
  } catch {
    return mutants.slice(-5);
  }
}
async function loadFeatured(mutants) {
  try {
    const response = await fetch(`${DATA_BASE}/featured.json`);
    if (!response.ok) throw new Error('Featured entries unavailable');
    const featuredIds = await response.json();
    const mutantsById = new Map(mutants.map(mutant => [mutant.specimen, mutant]));
    const featured = featuredIds.map(id => mutantsById.get(id)).filter(Boolean).slice(0, 3);
    if (!featured.length) throw new Error('No featured entries found');
    return featured;
  } catch {
    return [...mutants].reverse().slice(0, 3);
  }
}
function renderTicker(mutants) { const items = [...mutants].reverse(); document.getElementById('tickerContent').innerHTML = [...items, ...items].map(m => `<a href="${url(`/specimen/${slugify(m.name)}`)}" class="ticker__item"><span class="dot dot--${m.rarity}"></span>${escapeHtml(m.name)} <em>- ${escapeHtml(m.type || rarityLabel(m.rarity))}</em></a>`).join(''); }

async function initMutantsPage() {
  const page = document.getElementById('pageContent'); page.innerHTML = `<section class="section section--tight"><div class="section__head"><h2>Mutants</h2><p class="section__lede">All available mutants.</p></div><div class="filters" id="filters"><button class="filter is-active" data-filter="all">All</button><button class="filter" data-filter="legendary">Legendary</button><button class="filter" data-filter="heroic">Heroic</button><button class="filter" data-filter="recipe">Secrets</button><button class="filter" data-filter="common">Common</button><button class="filter" data-filter="seasonal">Seasonal</button><button class="filter" data-filter="captainpeace">CaptainPeace</button><button class="filter" data-filter="pvp">PvP</button><button class="filter" data-filter="videogame">Videogame</button><button class="filter" data-filter="gacha">Gacha</button></div><div id="mutantGrid" class="cardgrid cardgrid--full"><p class="loading">Loading mutants...</p></div></section>`;
  const grid = document.getElementById('mutantGrid'); let mutants; try { mutants = await loadIndex(); } catch (error) { grid.innerHTML = errorMessage(error); return; } let activeFilter = 'all'; let query = new URLSearchParams(window.location.search).get('q')?.trim().toLowerCase() || ''; let visible = []; let rendered = 0; const sentinel = document.createElement('div'); sentinel.className = 'catalog-sentinel'; grid.after(sentinel); const render = () => { visible = mutants.filter(m => (activeFilter === 'all' || m.className === activeFilter) && (!query || `${m.name} ${m.specimen} ${m.dna}`.toLowerCase().includes(query))); grid.innerHTML = visible.length ? visible.slice(0, rendered = Math.min(window.MGG_CATALOG_CONFIG.pageSize, visible.length)).map(window.MGG_TEMPLATES.card).join('') : '<p class="loading">No matches mutants</p>'; sentinel.hidden = rendered >= visible.length; }; const loadMore = () => { if (rendered >= visible.length) return; const next = visible.slice(rendered, rendered + window.MGG_CATALOG_CONFIG.pageSize); grid.insertAdjacentHTML('beforeend', next.map(window.MGG_TEMPLATES.card).join('')); rendered += next.length; sentinel.hidden = rendered >= visible.length; }; document.querySelectorAll('#filters .filter').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('#filters .filter').forEach(item => item.classList.remove('is-active')); button.classList.add('is-active'); activeFilter = button.dataset.filter; render(); })); document.getElementById('quickSearch').addEventListener('input', event => { query = event.currentTarget.value.trim().toLowerCase(); render(); }); new IntersectionObserver(entries => entries[0].isIntersecting && loadMore(), { rootMargin: '600px' }).observe(sentinel); render(); 
}

async function initMutantDetailPage(slug) { const page = document.getElementById('pageContent'); page.innerHTML = '<section class="detail" id="mutantDetail"><p class="loading">Loading mutant profile...</p></section>'; try { const catalog = await loadIndex(); const specimen = catalog.find(item => slugify(item.name) === slug.toLowerCase()); if (!specimen?.specimen) throw new Error('Specimen not found'); document.title = `MGG Wiki | ${specimen.name}`; let localDetail = {}; try { const localResponse = await fetch(`${DATA_BASE}/${encodeURIComponent(slug)}.json`); if (localResponse.ok && localResponse.headers.get('content-type')?.includes('application/json')) localDetail = await localResponse.json(); } catch { localDetail = {}; } const apiUrl = API_CONFIG.api.specimen.replace('{specimen}', encodeURIComponent(specimen.specimen)); const apiResponse = await fetch(apiUrl); if (!apiResponse.ok) throw new Error('Unable to load the specimen from the API'); const apiDetail = await apiResponse.json(); const abilitiesConfig = await loadAbilitiesConfig(); const gachaConfig = await loadGachaConfig(); await loadOrbsConfig(); renderDetail(document.getElementById('mutantDetail'), normalizeSpecimenDetail(apiDetail, localDetail, specimen, abilitiesConfig, gachaConfig)); } catch (error) { document.getElementById('mutantDetail').innerHTML = errorMessage(error); } }

function normalizeSpecimenDetail(apiSpecimen, localDetail = {}, summary = {}) { const normalized = normalizeSpecimen({ ...summary, ...apiSpecimen }); const rawAttack = value => Number.parseInt(String(value || '').split(':')[0], 10) || 0; return { ...localDetail, ...normalized, speed: apiSpecimen.spX100, life: apiSpecimen.lifePoint, unlockattack: apiSpecimen.unlockAttack, attack1p_name: apiSpecimen.attack1pName, attack2p_name: apiSpecimen.attack2pName, biography: apiSpecimen.description || localDetail.biography || 'No information', how_to_obtain: localDetail.how_to_obtain || 'No information', bingo: localDetail.bingo ?? 'No information', breedable: localDetail.breedable || 'No information', genes: apiSpecimen.dna ? [apiSpecimen.dna] : (localDetail.genes || []), rarity: normalized.rarity, category: apiSpecimen.type ? normalized.rarity : 'No information', ability: localDetail.ability || 'No information', stats: { base: { ...(localDetail.stats?.base || {}), attack_name_1: apiSpecimen.attack1pName || localDetail.stats?.base?.attack_name_1 || 'No information', attack_name_2: apiSpecimen.attack2pName || localDetail.stats?.base?.attack_name_2 || 'No information', attack_value_1: rawAttack(apiSpecimen.atk1), attack_value_2: rawAttack(apiSpecimen.atk2), health: apiSpecimen.lifePoint ?? localDetail.stats?.base?.health, energy_regen: apiSpecimen.bank != null ? `${apiSpecimen.bank}/hr` : localDetail.stats?.base?.energy_regen }, growth_per_level: {} }, apiStats: { attack1: apiSpecimen.atk1, attack1p: apiSpecimen.atk1p, attack2: apiSpecimen.atk2, attack2p: apiSpecimen.atk2p, unlockAttack: apiSpecimen.unlockAttack, abilities: apiSpecimen.abilities, abilityPct1: apiSpecimen.abilityPct1, abilityPct2: apiSpecimen.abilityPct2, orbSlots: apiSpecimen.orbSlots } }; }
function normalizeSpecimenDetail(apiSpecimen, localDetail = {}, summary = {}, abilitiesConfig = {}) { const normalized = normalizeSpecimen({ ...summary, ...apiSpecimen }); const rawAttack = value => Number.parseInt(String(value || '').split(':')[0], 10) || 0; return { ...localDetail, ...normalized, speed: apiSpecimen.spX100, life: apiSpecimen.lifePoint, unlockattack: apiSpecimen.unlockAttack, attack1p_name: apiSpecimen.attack1pName, attack2p_name: apiSpecimen.attack2pName, abilities: apiSpecimen.abilities, abilityPct1: apiSpecimen.abilityPct1, abilityPct2: apiSpecimen.abilityPct2, appliesTo: abilitiesConfig[apiSpecimen.specimen] || 'both', biography: apiSpecimen.description || localDetail.biography || 'No information', how_to_obtain: localDetail.how_to_obtain || 'No information', bingo: localDetail.bingo ?? 'No information', breedable: localDetail.breedable || 'No information', genes: apiSpecimen.dna ? [apiSpecimen.dna] : (localDetail.genes || []), rarity: normalized.rarity, category: apiSpecimen.type ? normalized.rarity : 'No information', ability: localDetail.ability || 'No information', stats: { base: { ...(localDetail.stats?.base || {}), attack_name_1: apiSpecimen.attack1pName || localDetail.stats?.base?.attack_name_1 || 'No information', attack_name_2: apiSpecimen.attack2pName || localDetail.stats?.base?.attack_name_2 || 'No information', attack_value_1: rawAttack(apiSpecimen.atk1), attack_value_2: rawAttack(apiSpecimen.atk2), health: apiSpecimen.lifePoint ?? localDetail.stats?.base?.health, energy_regen: apiSpecimen.bank != null ? `${apiSpecimen.bank}/hr` : localDetail.stats?.base?.energy_regen }, growth_per_level: {} }, apiStats: { attack1: apiSpecimen.atk1, attack1p: apiSpecimen.atk1p, attack2: apiSpecimen.atk2, attack2p: apiSpecimen.atk2p, unlockAttack: apiSpecimen.unlockAttack, abilities: apiSpecimen.abilities, abilityPct1: apiSpecimen.abilityPct1, abilityPct2: apiSpecimen.abilityPct2, orbSlots: apiSpecimen.orbSlots } }; }

function renderDetail(container, m) { const base = m.stats?.base || {}; const growth = m.stats?.growth_per_level || {}; container.innerHTML = `<div class="detail__crumbs"><a href="/mutants">&lt;- Volver al catálogo</a></div><div class="detail__grid"><div class="detail__main"><h1 class="detail__name">${escapeHtml(m.name)}</h1><div class="detail__block"><h2>Overview</h2><div class="overview"><span class="pill pill--${m.rarity}">${rarityLabel(m.rarity)}</span>${(m.genes || []).map(g => `<span class="gene gene--${g}">${escapeHtml(g)}</span>`).join('')}</div></div><div class="detail__block"><h2>Biography</h2><p class="biography">${escapeHtml(m.biography || 'No information')}</p></div><div class="detail__block"><h2>How to Obtain</h2><p class="howto">${escapeHtml(m.how_to_obtain || 'No information')}</p></div><div class="detail__block"><div class="statshead"><h2>Stats</h2><div class="statshead__actions"><div class="switch" id="statMode"><button class="switch__opt is-active" data-mode="base">Base</button><button class="switch__opt" data-mode="upgraded">Upgraded Lvl.25</button></div><label class="level-control" for="calcLevel"><span>Nivel</span><input type="number" id="calcLevel" min="1" max="99" value="1" hidden></label><button class="btn btn--small btn--outline" id="toggleCalc">Calcular por nivel</button></div></div><div class="statsgrid" id="statsgrid"></div></div><div class="detail__block"><h2>Icons</h2><div class="icons">${iconTemplate(m.icons)}</div></div>${m.larvae?.length ? `<div class="detail__block"><h2>Larvae</h2><div class="icons">${iconTemplate(m.larvae)}</div></div>` : ''}</div><aside class="detail__side"><div class="sidecard"><h3 class="sidecard__title">${escapeHtml(m.name)}</h3><div class="sidecard__tabs">${(m.icons || []).map((icon, i) => `<span class="${i === m.icons.length - 1 ? 'is-current' : ''}">${escapeHtml(icon)}</span>`).join('')}</div><div class="sidecard__art"><img src="${specimenImage(m, true)}" alt="${escapeHtml(m.name)}" style="width:100%;height:100%;object-fit:contain" onerror="this.onerror=null;this.src='${specimenImage(m, false)}'"></div><dl class="sidecard__meta"><div><dt>Genes</dt><dd>${(m.genes || []).map(g => escapeHtml(g)).join(', ') || '-'}</dd></div><div><dt>Category</dt><dd>${escapeHtml(m.category || 'No information')}</dd></div><div><dt>Ability</dt><dd></dd></div><div><dt>Breedable?</dt><dd>${breedableLabel(m.breedable)}</dd></div><div><dt>Bingo</dt><dd>${m.bingo ?? 'No information'}</dd></div></dl></div></aside></div>`; setupStats(container, base, growth, m); }
function specimenImage(m, withSkin) { const specimen = (m.specimen || m.slug || '').replace(/^specimen_/i, '').toLowerCase(); return `https://picmg.pages.dev/specimens/${specimen}.png`; }
function specimenSkinImage(specimen, skin) { const id = String(specimen || '').replace(/^specimen_/i, '').toLowerCase(); return `https://picmg.pages.dev/specimens/${id}${skin === 'basic' ? '' : `_${skin}`}.png`; }
function skinImageUrl(mutant, skin) { const option = window.MGG_STATS.getSkinOptions(mutant).find(item => item.key === skin); const specimen = mutant.specimen.toLowerCase().replace(/^specimen_/i, ''); if (option?.imageSuffix) return `https://picmg.pages.dev/specimens/${specimen}_${option.imageSuffix}.png`; return specimenSkinImage(mutant.specimen, skin); }
function thumbnailSkinImage(specimen, skin) { const id = String(specimen || '').toLowerCase(); return `${API_CONFIG.assets.thumbnails}/${encodeURIComponent(id)}${skin === 'basic' ? '' : `_${encodeURIComponent(skin)}`}.png`; }
function iconTemplate(icons = []) { return icons.length ? icons.map(icon => `<div class="iconchip"><div class="iconchip__badge">${escapeHtml(icon.slice(0, 2).toUpperCase())}</div><div class="iconchip__label">${escapeHtml(icon)}</div></div>`).join('') : ''; }
function renderBingos(container, mutant) { const bingoField = [...container.querySelectorAll('.sidecard__meta dt')].find(item => item.textContent === 'Bingo')?.nextElementSibling; if (!bingoField) return; bingoField.innerHTML = (mutant.bingos || []).map(bingo => `<span class="bingo-item"><img src="https://s-ak.kobojo.com/mutants/assets/${escapeHtml(bingo.gridIcon || '')}" alt=""><span>${escapeHtml(bingo.gridName)}</span></span>`).join('') || 'No information'; }
function setupStats(container, base, growth) { const grid = container.querySelector('#statsgrid'); let mode = 'base'; const value = key => (base[key] ?? 0) + (mode === 'upgraded' ? (growth[key] ?? 0) * 10 : 0); const render = () => { grid.innerHTML = `<div class="statbox statbox--attack"><div class="statbox__label">Ataque 1: ${escapeHtml(base.attack_name_1 || 'Ataque 1')}</div><div class="statbox__value">${value('attack_value_1')}</div></div><div class="statbox statbox--attack"><div class="statbox__label">Ataque 2: ${escapeHtml(base.attack_name_2 || 'Ataque 2')}</div><div class="statbox__value">${value('attack_value_2')}</div></div><div class="statbox"><div class="statbox__label">Salud</div><div class="statbox__value">${value('health')}</div></div><div class="statbox"><div class="statbox__label">Velocidad</div><div class="statbox__value">${base.speed ?? '-'}</div></div><div class="statbox"><div class="statbox__label">Crítico</div><div class="statbox__value">${base.crit_chance ?? '-'}%</div></div><div class="statbox"><div class="statbox__label">Energía</div><div class="statbox__value">${escapeHtml(base.energy_regen || '-')}</div></div>`; }; render(); container.querySelectorAll('.switch__opt').forEach(button => button.addEventListener('click', () => { container.querySelectorAll('.switch__opt').forEach(item => item.classList.remove('is-active')); button.classList.add('is-active'); mode = button.dataset.mode; render(); })); const panel = container.querySelector('#calcPanel'); const level = container.querySelector('#calcLevel'); const results = container.querySelector('#calcResults'); const calculate = () => { const current = Math.max(1, parseInt(level.value, 10) || 1); const grow = key => (base[key] ?? 0) + (growth[key] ?? 0) * (current - 1); results.innerHTML = [['attack_name_1', 'attack_value_1'], ['attack_name_2', 'attack_value_2'], ['Salud', 'health']].map(([label, key]) => `<div class="calc__result"><span>${escapeHtml(base[label] || label)}</span><strong>${grow(key)}</strong></div>`).join(''); }; container.querySelector('#toggleCalc').addEventListener('click', event => { panel.hidden = !panel.hidden; event.currentTarget.classList.toggle('is-on', !panel.hidden); if (!panel.hidden) calculate(); }); level.addEventListener('input', calculate); }
function initQuickSearch() { document.getElementById('quickSearch').addEventListener('keydown', event => { if (event.key === 'Enter' && event.currentTarget.value.trim()) window.location.href = `${url('/mutants')}?q=${encodeURIComponent(event.currentTarget.value.trim())}`; }); }
function slugify(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
function initial(name) { return escapeHtml((name || '?').charAt(0).toUpperCase()); }
function rarityLabel(rarity) { return window.MGG_CATALOG_CONFIG.rarityLabels[rarity] || rarity; }
function breedableLabel(value) { return ({ yes: 'Yes', no: 'No', if_owned: 'If owned' }[value] || value || '-'); }
function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value ?? ''; return div.innerHTML; }
function errorMessage(error) { return `<p class="loading">${escapeHtml(error.message || 'Unable to load the information.')}</p>`; }
function url(path) { return `${SITE_BASE}${path}`; }

// Integra el motor de stats sin mezclar sus formulas con la plantilla visual.
function setupStats(container, base, growth, mutant) {
  renderBingos(container, mutant);
  moveDetailInfoSections(container);
  addLarvaSection(container, mutant);
  const grid = container.querySelector('#statsgrid');
  const levelInput = container.querySelector('#calcLevel');
  levelInput.value = '25';
  const toggle = container.querySelector('#toggleCalc');
  const model = { ...mutant, speed: mutant.speed ?? base.speed, life: mutant.life ?? base.health };
  const orbSelections = {};
  let orbMode = false;
  let skin = window.MGG_STATS.getSkinOptions(model).slice(-1)[0]?.key || 'basic';
  let displayLevel = 25;

  function render(level = 25) {
    const stats = window.MGG_STATS.applyOrbEffectsToStats(window.MGG_STATS.calculate(model, level, skin), orbMode ? Object.values(orbSelections) : [], { baseAbilityType: mutant.abilities?.split(';')[0]?.split(':')[1] });
    const attackAbility = (name, value, abilityKey, percentage, addedValue = 0) => `${name ? `<div class="statbox__ability"><img class="stat-icon stat-icon--ability" src="${abilityIconUrl(abilityKey)}" alt="${escapeHtml(name)}"><span>${escapeHtml(name)}</span><strong>${formatStatValue(value) || 'No information'} (${percentage || 0}%)</strong></div>` : ''}${stats.addedAbilityName && addedValue ? `<div class="statbox__ability statbox__ability--added"><img class="stat-icon stat-icon--ability" src="${abilityIconUrl(stats.addedAbilityName)}" alt="${escapeHtml(stats.addedAbilityName)}"><span>${escapeHtml(stats.addedAbilityName)}</span><strong>${formatStatValue(addedValue)}</strong></div>` : ''}`;
    const attackImage = state => imageMarkup(attackGeneIconUrl(state.gene, mutant[state.selectedKey === '1p' ? 'atk1p' : state.selectedKey === '2p' ? 'atk2p' : state.selectedKey === '1' ? 'atk1' : 'atk2']), '', 'stat-icon stat-icon--attack');
    grid.innerHTML = `<div class="statsgrid__attacks"><div class="statbox statbox--attack"><div class="statbox__attack-header"><div class="statbox__label">${attackImage(stats.attack1State)}${escapeHtml(stats.attack1Name)}</div><div class="statbox__value">${formatStatValue(stats.atk1F) || 'No information'}</div></div>${attackAbility(stats.ability1Name, stats.atk1BaseAbilityF, mutant.abilities?.split(';')[0]?.split(':')[1], stats.ability1Pct, stats.atk1AddedAbilityF)}</div><div class="statbox statbox--attack"><div class="statbox__attack-header"><div class="statbox__label">${attackImage(stats.attack2State)}${escapeHtml(stats.attack2Name)}</div><div class="statbox__value">${formatStatValue(stats.atk2F) || 'No information'}</div></div>${attackAbility(stats.ability2Name, stats.atk2BaseAbilityF, mutant.abilities?.split(';')[1]?.split(':')[1], stats.ability2Pct, stats.atk2AddedAbilityF)}</div></div><div class="statsgrid__right"><div class="statbox statbox--compact"><div class="statbox__label"><img class="stat-icon stat-icon--life" src="${API_CONFIG.assets.icons.life}" alt=""></div><div class="statbox__value">${formatStatValue(stats.lifeF) || 'No information'}</div></div><div class="statbox statbox--compact"><div class="statbox__label"><img class="stat-icon stat-icon--speed" src="${API_CONFIG.assets.icons.speed}" alt=""></div><div class="statbox__value">${formatStatValue(stats.speedF)}</div></div><div class="statbox statbox--compact statbox--additional" aria-hidden="true"></div></div><div class="statsgrid__bottom">${orbMode ? orbSlotMarkup(model.orbSlots, orbSelections, mutant) : '<div class="statbox statbox--additional" aria-hidden="true"></div><div class="statbox statbox--additional" aria-hidden="true"></div><div class="statbox statbox--additional" aria-hidden="true"></div>'}</div>`;
    if (orbMode) bindOrbSelectors(grid, model, orbSelections, render, mutant);
  }

  const skinTabs = container.querySelector('.sidecard__tabs');
  const art = container.querySelector('.sidecard__art img');
  if (skinTabs && art) {
    const skinOptions = window.MGG_STATS.getSkinOptions(model);
    art.src = skinImageUrl(model, skin);
    const skinSelector = document.createElement('div');
    skinSelector.className = 'sidecard__tabs';
    skinSelector.innerHTML = skinOptions.map(option => `<span class="${option.key === skin ? 'is-current' : ''}" data-skin="${option.key}"><img class="skin-tab__icon" src="${skinTabIconUrl(option)}" alt="">${escapeHtml(option.label)}</span>`).join('');
    skinTabs.before(skinSelector);
    skinSelector.addEventListener('click', event => {
      const option = event.target.closest('[data-skin]');
      if (!option) return;
      skin = option.dataset.skin;
      skinSelector.querySelectorAll('[data-skin]').forEach(item => item.classList.toggle('is-current', item === option));
      art.src = skinImageUrl(model, skin);
      render(displayLevel);
    });
  }

  render(25);
  ensureAdditionalStatFields(grid);
  container.querySelectorAll('#statMode .switch__opt').forEach(button => button.addEventListener('click', () => {
    container.querySelectorAll('#statMode .switch__opt').forEach(item => item.classList.remove('is-active'));
    button.classList.add('is-active');
    displayLevel = button.dataset.mode === 'upgraded' ? 25 : 1;
    render(displayLevel);
  }));
  toggle.addEventListener('click', () => {
    orbMode = !orbMode;
    levelInput.hidden = !levelInput.hidden;
    toggle.classList.toggle('is-on', orbMode);
    if (!levelInput.hidden) levelInput.focus();
    render(Number.parseInt(levelInput.value, 10) || 1);
  });
  levelInput.addEventListener('input', () => render(Math.max(1, Number.parseInt(levelInput.value, 10) || 1)));
  enhanceDetailIcons(container, model);
  enhanceAdditionalSections(container, model);
  const statsObserver = new MutationObserver(() => { ensureAdditionalStatFields(grid); enhanceStatsIcons(grid, model); });
  statsObserver.observe(grid, { childList: true });
  enhanceStatsIcons(grid, model);
  const backLink = container.querySelector('.detail__crumbs a');
  if (backLink) backLink.textContent = 'Back to catalog';
  const levelLabel = container.querySelector('label[for="calcLevel"] span');
  if (levelLabel) levelLabel.textContent = 'Level';
  const calculateButton = container.querySelector('#toggleCalc');
  if (calculateButton) calculateButton.textContent = 'Calculate by level';
}

function moveDetailInfoSections(container) {
  container.querySelectorAll('.detail__block').forEach(block => {
    const heading = block.querySelector('h2')?.textContent.trim();
    const sectionClass = heading === 'Biography' ? 'detail__section detail__section--biography' : heading === 'How to Obtain' ? 'detail__section detail__section--howto' : '';
    if (!sectionClass) return;
    const section = document.createElement('section');
    section.className = sectionClass;
    const info = document.createElement('div');
    info.className = `detail__info ${heading === 'Biography' ? 'detail__info--biography' : 'detail__info--howto'}`;
    info.innerHTML = block.innerHTML.replace(/<h2>[\s\S]*?<\/h2>/, '');
    section.innerHTML = `<h2>${escapeHtml(heading)}</h2>`;
    section.append(info);
    block.replaceWith(section);
  });
  const statsBlock = container.querySelector('.statsgrid')?.closest('.detail__block');
  const howToSection = container.querySelector('.detail__section--howto');
  if (statsBlock && howToSection) statsBlock.insertAdjacentElement('afterend', howToSection);
}

function addLarvaSection(container, mutant) {
  if (container.querySelector('.detail__larva')) return;
  const iconsBlock = Array.from(container.querySelectorAll('.detail__block')).find(block => block.querySelector('h2')?.textContent.trim() === 'Icons');
  if (!iconsBlock) return;
  const specimen = String(mutant.specimen || mutant.slug || '').replace(/^specimen_/i, '').toLowerCase();
  const larva = document.createElement('section');
  larva.className = 'detail__block detail__larva';
  const larvaImage = API_CONFIG.assets.larva.replace('{specimenId}', encodeURIComponent(specimen));
  larva.innerHTML = `<h2>Larva</h2><div class="larva-art"><img src="${larvaImage}" alt="Larva of ${escapeHtml(mutant.name)}" onerror="this.hidden=true"></div>`;
  iconsBlock.insertAdjacentElement('afterend', larva);
}

function skinTabIconUrl(option) {
  if (option.key === 'basic') return `${SITE_BASE}${API_CONFIG.assets.skinStars.basic}`;
  if (option.key.startsWith('gacha_')) return API_CONFIG.assets.gachaSkin.replace('{skin}', encodeURIComponent(option.imageSuffix || option.key.slice(6)));
  return API_CONFIG.assets.skinStars[option.key] || '';
}

function iconUrl(template, value) { const url = template.replace(/\{\w+\}/, encodeURIComponent(String(value || '').toLowerCase())); return url.startsWith('/') ? `${SITE_BASE}${url}` : url; }
function geneIconUrl(gene) { const key = String(gene || 'n').trim().toLowerCase(); const file = API_CONFIG.assets.icons.mappings.geneFiles[key] || key; return iconUrl(API_CONFIG.assets.gene, file); }
function attackGeneIconUrl(gene, attack) { if (!gene) return ''; const key = String(gene).trim().toLowerCase(); const file = API_CONFIG.assets.icons.mappings.attackGeneFiles[key] || key; const effect = String(attack || '').toUpperCase().includes(':AOE') ? '_aoe' : ''; return `${SITE_BASE}${API_CONFIG.assets.attackGene.replace('{gene}', encodeURIComponent(file)).replace('{effect}', effect)}`; }
function abilityIconUrl(ability) { const raw = String(ability || '').trim().replace(/^ability_/i, '').replace(/^add/i, '').replace(/_plus$/i, '').toLowerCase(); const parts = raw.split('_').filter(Boolean); const family = /^\d+$/.test(parts[0]) ? (parts[1] || parts[0]) : parts[0]; const file = API_CONFIG.assets.icons.mappings.abilityFiles[raw] || API_CONFIG.assets.icons.mappings.abilityFiles[family] || family; return iconUrl(API_CONFIG.assets.icons.ability, file); }
function typeIconUrl(type) { const key = String(type || '').trim().toUpperCase(); if (key === 'DEFAULT') return 'https://s-ak.kobojo.com/mutants/assets/mobile/hud/m_m_m/mutopedia/icon_mutopedia.png'; const file = API_CONFIG.assets.icons.mappings.typeFiles[key] || key.toLowerCase(); return iconUrl(API_CONFIG.assets.icons.type, file); }

function imageMarkup(src, alt, className = '') { return src ? `<img class="${className}" src="${src}" alt="${escapeHtml(alt)}" onerror="this.hidden=true">` : ''; }

function enhanceStatsIcons(grid, mutant) {
  if (!grid || !window.MGG_STATS) return;
  const attack1 = window.MGG_STATS.getDeclaredAttackState(mutant, '1p');
  const attack2 = window.MGG_STATS.getDeclaredAttackState(mutant, '2p');
  const labels = grid.querySelectorAll('.statbox__label');
  const icons = [attackGeneIconUrl(attack1.gene, mutant.atk1p), attackGeneIconUrl(attack2.gene, mutant.atk2p), API_CONFIG.assets.icons.life, API_CONFIG.assets.icons.speed, abilityIconUrl(mutant.abilities?.split(';')[0]?.split(':')[1]), abilityIconUrl(mutant.abilities?.split(';')[1]?.split(':')[1])];
  labels.forEach((label, index) => {
    const iconClass = ['stat-icon--attack', 'stat-icon--attack', 'stat-icon--life', 'stat-icon--speed'][index] || '';
    if (!label.querySelector('img')) label.insertAdjacentHTML('afterbegin', imageMarkup(icons[index], label.textContent, `stat-icon ${iconClass}`));
  });
}

function ensureAdditionalStatFields(grid) {
  const bottom = grid?.querySelector('.statsgrid__bottom');
  if (!bottom || bottom.children.length) return;
  bottom.innerHTML = '<div class="statbox statbox--additional" aria-hidden="true"></div><div class="statbox statbox--additional" aria-hidden="true"></div><div class="statbox statbox--additional" aria-hidden="true"></div>';
}

function orbEntries(kind) {
  const groups = window.MGG_ORBS?.[kind] || {};
  return Object.entries(groups).flatMap(([groupType, orbs]) => (orbs || []).map(orb => ({
    ...orb,
    category: kind === 'basic' ? `basic_${groupType}` : `special_${groupType}`,
    groupType,
    kind
  })));
}

function orbImageUrl(orbId) { return API_CONFIG.assets.orbImage.replace('{orbId}', encodeURIComponent(orbId)); }

function formatStatValue(value) {
  if (value === null || value === undefined || value === '') return value;
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en-US', { maximumFractionDigits: 2 }) : String(value);
}

function orbAllowedTypes(kind, mutant, selections) {
  const baseAbility = window.MGG_STATS.normalizeAbilityType(mutant.abilities?.split(';')[0]?.split(':')[1] || '');
  if (kind === 'special') return Object.keys(window.MGG_ORBS?.special || {}).filter(type => type.replace(/^add/, '').toLowerCase() !== baseAbility);
  const special = Object.values(selections).find(orb => orb.kind === 'special');
  return window.MGG_STATS.getAllowedBasicOrbTypes(special?.groupType || special?.type || '', baseAbility);
}

function orbSlotMarkup(slotString, selections, mutant) {
  const slots = String(slotString || '').split(';').filter(Boolean);
  return slots.map((slot, index) => {
    const kind = slot.toLowerCase().startsWith('s') ? 'special' : 'basic';
    const selected = selections[index];
    const slotImage = kind === 'special' ? API_CONFIG.assets.icons.orb.s : API_CONFIG.assets.icons.orb.n;
    const selectedImage = selected?.id ? `<img class="orb-picker__selected" src="${orbImageUrl(selected.id)}" alt="${escapeHtml(selected.name)}">` : '';
    return `<div class="statbox statbox--additional orb-slot orb-slot--visual" data-orb-slot="${index}" data-orb-kind="${kind}"><span class="orb-slot__label">Orb ${index + 1}</span><button class="orb-picker" type="button" data-orb-picker="${index}" aria-label="Select orb ${index + 1}" style="background-image:url('${slotImage}')">${selectedImage}</button><div class="orb-picker__menu" data-orb-menu="${index}" hidden></div></div>`;
  }).join('');
}

function orbType(orb) { const category = String(orb?.category || '').toLowerCase(); if (category.startsWith('basic_')) return category.slice(6); if (category.startsWith('special_')) return category.slice(8).replace(/^add/, ''); return String(orb?.groupType || orb?.type || category).replace(/^add/, '').toLowerCase(); }

function bindOrbSelectors(grid, mutant, selections, render) {
  const renderLevel = () => render(Number.parseInt(document.getElementById('calcLevel')?.value, 10) || 1);
  const renderMenu = (menu, index, view = 'categories') => {
    const kind = menu.closest('.orb-slot')?.dataset.orbKind || 'basic';
    const allowed = orbAllowedTypes(kind, mutant, selections);
    const groups = Object.entries(window.MGG_ORBS?.[kind] || {}).filter(([type]) => allowed.includes(kind === 'special' ? type : type.replace(/^add/, '').toLowerCase()));

    if (view === 'levels') {
      const groupType = menu.dataset.orbGroup || '';
      const levels = window.MGG_ORBS?.[kind]?.[groupType] || [];
      menu.innerHTML = `<button class="orb-picker__back" type="button" data-orb-back="${index}">&lt;- Back</button><div class="orb-picker__items">${levels.map(orb => `<button class="orb-picker__option" type="button" data-orb-level-id="${escapeHtml(orb.id)}" data-orb-group="${escapeHtml(groupType)}"><span>${escapeHtml(orb.name)}</span></button>`).join('')}</div>`;
      return;
    }

    menu.dataset.orbGroup = '';
    menu.innerHTML = `<div class="orb-picker__items">${selections[index]?.id ? '<button class="orb-picker__option orb-picker__option--remove" type="button" data-orb-remove="true">Remove orb</button>' : ''}${groups.map(([type]) => `<button class="orb-picker__option" type="button" data-orb-group="${escapeHtml(type)}">${escapeHtml(window.MGG_STATS.formatOrbTypeLabel(type))}</button>`).join('')}</div>`;
  };

  grid.querySelectorAll('[data-orb-picker]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    const menu = button.closest('.orb-slot')?.querySelector('[data-orb-menu]');
    if (!menu) return;
    grid.querySelectorAll('[data-orb-menu]').forEach(item => { if (item !== menu) item.hidden = true; });
    menu.hidden = !menu.hidden;
    if (!menu.hidden) renderMenu(menu, Number(button.dataset.orbPicker));
  }));

  grid.querySelectorAll('[data-orb-menu]').forEach(menu => menu.addEventListener('click', event => {
    event.stopPropagation();
    const index = Number(menu.dataset.orbMenu);
    if (event.target.closest('[data-orb-back]')) {
      renderMenu(menu, index, 'categories');
      return;
    }
    if (event.target.closest('[data-orb-remove]')) {
      delete selections[index];
      menu.hidden = true;
      renderLevel();
      return;
    }
    const group = event.target.closest('[data-orb-group]');
    if (group && !event.target.closest('[data-orb-level-id]')) {
      menu.dataset.orbGroup = group.dataset.orbGroup;
      renderMenu(menu, index, 'levels');
      return;
    }
    const levelButton = event.target.closest('[data-orb-level-id]');
    if (!levelButton) return;
    const orb = [...orbEntries('basic'), ...orbEntries('special')].find(item => item.id === levelButton.dataset.orbLevelId);
    if (orb) selections[index] = orb;
    menu.hidden = true;
    renderLevel();
  }));

  if (grid._orbOutsideHandler) document.removeEventListener('click', grid._orbOutsideHandler);
  grid._orbOutsideHandler = event => {
    if (!event.target.closest('.orb-slot')) grid.querySelectorAll('[data-orb-menu]').forEach(menu => { menu.hidden = true; });
  };
  document.addEventListener('click', grid._orbOutsideHandler);
}

function enhanceDetailIcons(container, mutant) {
  const genes = container.querySelector('.sidecard__meta > div:first-child dd');
  if (genes) genes.innerHTML = Array.from(String(mutant.dna || '').toLowerCase()).map(gene => imageMarkup(geneIconUrl(gene), `Gene ${gene.toUpperCase()}`, 'gene-icon')).join('') || 'No information';
  const category = container.querySelector('.sidecard__meta > div:nth-child(2) dd');
  if (category && mutant.type) { const typeKey = String(mutant.type).trim().toUpperCase(); const typeLabel = typeKey === 'DEFAULT' ? 'Common' : mutant.type; category.innerHTML = imageMarkup(typeIconUrl(mutant.type), typeLabel, 'type-icon'); if (typeKey === 'DEFAULT') category.insertAdjacentHTML('beforeend', `<span>${escapeHtml(typeLabel)}</span>`); }
  const ability = container.querySelector('.sidecard__meta > div:nth-child(3) dd');
  const abilityKey = mutant.abilities?.split(';')[0]?.split(':')[1];
  if (ability && abilityKey) ability.insertAdjacentHTML('afterbegin', imageMarkup(abilityIconUrl(abilityKey), 'Ability', 'type-icon'));
}

function enhanceAdditionalSections(container, mutant) {
  const main = container.querySelector('.detail__main');
  if (!main || main.querySelector('[data-extra-sections]')) return;
  const standardSkins = window.MGG_STATS.getSkinOptions({ ...mutant, gachaSkins: [] }).map(skin => ({ gachaId: skin.key, label: skin.label }));
  const gachaSkins = (window.MGG_GACHA_CONFIG?.[mutant.specimen] || []).filter(skin => skin.gachaId).map(skin => ({ gachaId: skin.gachaId, label: skin.gachaId }));
  const skins = [...standardSkins, ...gachaSkins.filter(gacha => !standardSkins.some(standard => standard.gachaId === gacha.gachaId))];
  const skinItems = skins.map(skin => `<div class="iconchip"><img class="skin-icon" src="${thumbnailSkinImage(mutant.specimen, skin.gachaId)}" alt="${escapeHtml(skin.label)}" onerror="this.hidden=true"><div class="iconchip__label">${escapeHtml(skin.label)}</div></div>`).join('');
  const iconsBlock = Array.from(main.querySelectorAll('.detail__block')).find(block => block.querySelector('h2')?.textContent.trim() === 'Icons');
  if (iconsBlock) iconsBlock.insertAdjacentHTML('beforeend', `<div class="icons specimen-skins">${skinItems}</div>`);
  main.insertAdjacentHTML('beforeend', '<div class="detail__block"><h2>Videos</h2><p class="biography">No information</p></div>');
}
async function loadAbilitiesConfig() { if (!abilitiesConfigPromise) abilitiesConfigPromise = fetch(`${SITE_BASE}/data/abilitiesconfig.csv`).then(response => response.ok ? response.text() : '').then(text => Object.fromEntries(text.split(/\r?\n/).slice(1).filter(Boolean).map(line => { const [specimen, appliesTo] = line.split('|'); return [specimen.trim(), appliesTo.trim()]; }))).catch(() => ({})); return abilitiesConfigPromise; }
async function loadGachaConfig() { if (!gachaConfigPromise) gachaConfigPromise = fetch(API_CONFIG.api.gacha).then(response => response.ok ? response.json() : []).then(rows => rows.reduce((groups, row) => { const gachaId = row.gacha_id; const specimen = row.specimen_id; const stars = Number(row.stars) || 0; if (gachaId && specimen) (groups[specimen] ||= []).push({ gachaId, specimen, stars, bonus: Number(row.bonus) || 0, starKey: ['basic', 'bronze', 'silver', 'gold', 'platinum'][stars] || 'basic' }); return groups; }, {})).then(config => { window.MGG_GACHA_CONFIG = config; return config; }).catch(() => ({})); return gachaConfigPromise; }
async function loadOrbsConfig() { if (!orbsConfigPromise) orbsConfigPromise = fetch(`${SITE_BASE}/data/orbs_organized.json`).then(response => response.ok ? response.json() : {}).then(config => { window.MGG_ORBS = config; return config; }).catch(() => ({})); return orbsConfigPromise; }