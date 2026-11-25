const BUILDING_PAGE_ITEMS = [
  { id: 'Building_Event_1' },
  { id: 'Building_Tokens_Jackpot' },
  { id: 'Building_Mystery' },
];

function initBuildingsPage() {
  const page = document.getElementById('pageContent');
  page.innerHTML = `<section class="buildings-page"><header class="buildings-hero"><p class="dungeons-hero__eyebrow">Features</p><h1>Buildings</h1><p>Explore current exchanges and rewards.</p></header><section class="buildings-current" aria-labelledby="buildingsCurrentTitle"><div class="dungeons-current__heading"><p class="dungeons-hero__eyebrow">Active contracts</p><h2 id="buildingsCurrentTitle">Current Buildings</h2></div><div class="buildings-current__grid">${BUILDING_PAGE_ITEMS.map(building => `<article class="building-card" id="building-${escapeHtml(building.id)}"><div class="building-card__content"><p class="loading">Loading building...</p></div></article>`).join('')}</div></section></section>`;
  loadCurrentBuildings();
}

async function loadCurrentBuildings() {
  let specimensById = new Map();
  try {
    const specimens = await loadIndex();
    specimensById = new Map(specimens.map(specimen => [
      String(specimen.specimen || '').toLowerCase(),
      specimen,
    ]));
  } catch (error) {
    console.error('Unable to load specimen catalog for building links.', error);
  }
  await Promise.all(BUILDING_PAGE_ITEMS.map(building => loadCurrentBuilding(building, specimensById)));
}

async function loadCurrentBuilding(building, specimensById) {
  const card = document.getElementById(`building-${building.id}`);
  const content = card.querySelector('.building-card__content');
  const endpoint = API_CONFIG.api.currentBuilding.replace('{building}', encodeURIComponent(building.id));
  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Unable to load building');
    const data = await response.json();
    if (!data || !data.contracts || typeof data.contracts !== 'object' || Array.isArray(data.contracts)) {
      throw new Error('Invalid building response');
    }
    content.innerHTML = currentBuildingTemplate(data, building, specimensById);
  } catch (error) {
    content.innerHTML = errorMessage(error);
  }
}

function currentBuildingTemplate(data, building, specimensById = new Map()) {
  const image = `${API_CONFIG.assets.buildingImages}/${encodeURIComponent(building.id.toLowerCase())}.png`;
  const contracts = Object.values(data.contracts || {});
  const contractContent = contracts.length
    ? `<div class="building-contracts">${contracts.map(contract => buildingContractTemplate(contract, specimensById)).join('')}</div>`
    : '<p class="building-card__empty">No active contracts.</p>';
  const buildingName = String(data.name || 'Building');
  return `<img class="building-card__image" src="${escapeHtml(image)}" alt="${escapeHtml(buildingName)}" loading="lazy" onerror="this.hidden=true"><div class="building-card__body"><h3>${escapeHtml(buildingName)}</h3>${data.description ? `<p class="building-card__description">${escapeHtml(data.description)}</p>` : ''}<p class="building-card__count">${contracts.length} active ${contracts.length === 1 ? 'contract' : 'contracts'}</p>${contractContent}</div>`;
}

function buildingContractTemplate(contract, specimensById = new Map()) {
  const cost = contract.cost || {};
  const costImage = cost.id
    ? `${API_CONFIG.assets.thumbnails}/${encodeURIComponent(String(cost.id).toLowerCase())}.png`
    : '';
  const rewards = Array.isArray(contract.rewards) ? contract.rewards : [];
  if (!rewards.length) {
    return `<article class="building-contract"><div class="building-contract__heading"><strong>Reward</strong><span class="building-contract__status">${contract.active === true ? 'Active' : 'Inactive'}</span></div><div class="building-contract__details"><span class="building-contract__cost">${costImage ? `<img src="${escapeHtml(costImage)}" alt="" loading="lazy" onerror="this.hidden=true">` : ''}<span>${escapeHtml(cost.name || 'Cost')} × ${escapeHtml(cost.amount ?? '—')}</span></span></div></article>`;
  }
  return rewards.map(reward => {
    const rewardId = String(reward.id || '');
    const skin = String(reward.tags?.skin || '').trim().toLowerCase();
    const rewardName = reward.name || 'Reward';
    const skinName = skin
      ? `${skin.replace(/[_-]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase())} `
      : '';
    const specimen = /^Specimen_/i.test(rewardId)
      ? specimensById.get(rewardId.toLowerCase())
      : null;
    const specimenLink = specimen?.name
      ? `<a class="building-contract__specimen-link" href="${escapeHtml(url(`/specimen/${slugify(specimen.name)}`))}">${escapeHtml(rewardName)}</a>`
      : escapeHtml(rewardName);
    const rewardImage = rewardId
      ? `${API_CONFIG.assets.thumbnails}/${encodeURIComponent(rewardId.toLowerCase())}${skin && skin !== '_any' ? `_${encodeURIComponent(skin)}` : ''}.png`
      : '';
    const skinIcon = skin
      ? API_CONFIG.assets.gachaSkin.replace('{skin}', encodeURIComponent(skin))
      : '';
    const skinIconFallback = skin
      ? API_CONFIG.assets.gachaSkinFallback.replace('{skin}', encodeURIComponent(skin))
      : '';
    return `<article class="building-contract"><div class="building-contract__heading"><strong>${escapeHtml(skinName)}${specimenLink}</strong><span class="building-contract__status">${contract.active === true ? 'Active' : 'Inactive'}</span></div><div class="building-contract__details"><span class="building-contract__reward">${rewardImage ? `<img src="${escapeHtml(rewardImage)}" alt="" loading="lazy" onerror="this.hidden=true">` : ''}${skinIcon ? `<img class="building-contract__skin-icon" src="${escapeHtml(skinIcon)}" alt="${escapeHtml(`${skin} skin`)}" title="${escapeHtml(`${skin} skin`)}" loading="lazy" onerror="if(this.dataset.fallback){this.src=this.dataset.fallback;this.removeAttribute('data-fallback')}else{this.hidden=true}" data-fallback="${escapeHtml(skinIconFallback)}">` : ''}<span>× ${escapeHtml(reward.amount ?? 1)}</span></span><span class="building-contract__cost">${costImage ? `<img src="${escapeHtml(costImage)}" alt="" loading="lazy" onerror="this.hidden=true">` : ''}<span>${escapeHtml(cost.name || 'Cost')} × ${escapeHtml(cost.amount ?? '—')}</span></span></div></article>`;
  }).join('');
}
