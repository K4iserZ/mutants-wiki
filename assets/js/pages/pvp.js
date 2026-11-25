function initPvpPage() {
  const page = document.getElementById('pageContent');
  page.innerHTML = `<section class="pvp-page"><header class="pvp-hero" style="--pvp-background-image:url('${SITE_BASE}/assets/img/pvp/bg_pvp.jpg')"><img src="${SITE_BASE}/assets/img/pvp/pvp-logo.png.png" alt="PvP"><div><p class="pvp-hero__eyebrow">Competitive arena</p><h1>PvP</h1><p>Seasons, leagues, and rewards.</p></div></header><div class="pvp-season-bar"><label for="pvpSeasonSelect">Season</label><select id="pvpSeasonSelect" disabled><option>Loading seasons...</option></select><span class="pvp-season-bar__status" id="pvpSeasonStatus"></span></div><div id="pvpSeasonContent"><p class="loading">Loading PvP seasons...</p></div></section>`;
  loadPvpData();
}

async function loadPvpData() {
  const select = document.getElementById('pvpSeasonSelect');
  const content = document.getElementById('pvpSeasonContent');
  const status = document.getElementById('pvpSeasonStatus');
  try {
    const response = await fetch(API_CONFIG.api.pvp);
    if (!response.ok) throw new Error('Unable to load PvP seasons');
    const data = await response.json();
    const seasons = Array.isArray(data.seasons) ? data.seasons : [];
    const leagues = Array.isArray(data.leagues_definition) ? [...data.leagues_definition].sort((a, b) => a.order - b.order) : [];
    if (!seasons.length) {
      content.innerHTML = '<p class="pvp-empty">No PvP seasons found.</p>';
      select.disabled = true;
      return;
    }
    select.innerHTML = seasons.map(season => `<option value="${escapeHtml(season.season_number)}">Season ${escapeHtml(season.season_number)}</option>`).join('');
    select.value = String(seasons.find(season => season.active)?.season_number ?? data.active_season_number ?? seasons[0].season_number);
    select.disabled = false;
    const render = () => {
      const season = seasons.find(item => String(item.season_number) === select.value) || seasons[0];
      const dateRange = `${formatPvpDate(season.start_date)} - ${formatPvpDate(season.end_date)}`;
      status.textContent = season.active ? `Active · ${dateRange}` : dateRange;
      content.innerHTML = pvpSeasonTemplate(season, leagues);
    };
    select.addEventListener('change', render);
    render();
  } catch (error) {
    content.innerHTML = errorMessage(error);
    select.disabled = true;
  }
}

function pvpSeasonTemplate(season, leagues) {
  const rewards = season.rewards || {};
  return `<section class="pvp-season"><div class="pvp-season__heading"><div><p class="pvp-season__eyebrow">Season</p><h2>${escapeHtml(season.season_number)}</h2></div><span class="pvp-season__state${season.active ? ' is-active' : ''}">${season.active ? 'Active' : 'Completed'}</span></div><div class="pvp-leagues">${leagues.map(league => {
    const leagueRewards = Array.isArray(rewards[league.id]) ? rewards[league.id] : [];
    const icon = league.icon ? pvpAssetUrl(league.icon) : `${SITE_BASE}/assets/img/pvp/league_${league.order}.png`;
    const requirement = league.top_percentage == null ? `${league.min_attacks || 0}+ attacks` : `Top ${league.top_percentage}%`;
    return `<article class="pvp-league"><div class="pvp-league__identity"><img src="${escapeHtml(icon)}" alt="" loading="lazy"><div><h3>${escapeHtml(league.name)}</h3><span>${escapeHtml(requirement)}</span></div></div><div class="pvp-league__rewards">${leagueRewards.length ? leagueRewards.map(pvpRewardTemplate).join('') : '<span class="pvp-league__empty">No rewards</span>'}</div></article>`;
  }).join('')}</div></section>`;
}

function pvpRewardTemplate(reward) {
  const itemId = String(reward.item_id || '');
  const name = reward.name || itemId || 'Unknown reward';
  const icon = itemId ? `${API_CONFIG.assets.thumbnails}/${encodeURIComponent(itemId.toLowerCase())}.png` : '';
  const fallbackIcon = `${SITE_BASE}/assets/img/thumbnails/icon_mutants.png`;
  const label = itemId.startsWith('Specimen_')
    ? `<a href="${url(`/specimen/${slugify(name)}`)}">${escapeHtml(name)}</a>`
    : `<span>${escapeHtml(name)}</span>`;
  return `<div class="pvp-reward">${icon ? `<img class="pvp-reward__image" src="${icon}" alt="${escapeHtml(name)}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackIcon}'">` : ''}<span class="pvp-reward__amount">${escapeHtml(reward.amount ?? 1)}x</span>${label}</div>`;
}

function pvpAssetUrl(path) {
  return /^https?:\/\//i.test(path) ? path : `${SITE_BASE}/${String(path).replace(/^\/+/, '')}`;
}

function formatPvpDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}