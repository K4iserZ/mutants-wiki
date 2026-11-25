const DUNGEON_PAGE_TYPES = [
  { type: 'challenge', label: 'Challenge' },
  { type: 'experiment', label: 'Experiment' },
  { type: 'raid', label: 'Raid' },
];

const DUNGEON_CATALOGS = new Map();
const DUNGEON_CATALOG_REQUESTS = new Map();
const DUNGEON_RAID_SCHEDULES = new Map();
const DUNGEON_COUNTDOWN_INTERVALS = new Map();
let activeDungeonCarousel = null;

function initDungeonsPage() {
  const page = document.getElementById('pageContent');
  const background = `${SITE_BASE}/assets/img/dungeons/bg_dungeon.jpg`;
  const dungeonTitle = `${API_CONFIG.assets.dungeonImages}/dungeons_title.png`;
  page.innerHTML = `<section class="dungeons-page" style="--dungeons-background:url('${background}')"><header class="dungeons-hero"><p class="dungeons-hero__eyebrow">Features</p><img class="dungeons-hero__logo" src="${dungeonTitle}" alt="Dungeons"><h1>Dungeons</h1><p>Explore the current challenges, experiments, and raids.</p></header><div class="dungeons-recaps" aria-label="Dungeon types">${DUNGEON_PAGE_TYPES.map(({ type }) => `<button class="dungeons-recap" type="button" data-dungeon-type="${type}" aria-label="${type} dungeons" aria-pressed="false" style="--dungeons-recap-image:url('${dungeonRecapUrl(type)}')"></button>`).join('')}</div><section class="dungeon-carousel" id="dungeonCarousel" aria-labelledby="dungeonCarouselTitle" tabindex="-1" hidden><div class="dungeon-carousel__heading"><div><p class="dungeons-hero__eyebrow">Explore dungeons</p><h2 id="dungeonCarouselTitle"></h2></div><button class="dungeon-carousel__close" type="button" data-carousel-close aria-label="Close carousel">×</button></div><div class="dungeon-carousel__viewport"><div class="dungeon-carousel__stage" id="dungeonCarouselStage"></div></div><div class="dungeon-carousel__controls"><button class="dungeon-carousel__button" type="button" data-carousel-previous aria-label="Previous dungeon">‹ <span>Previous</span></button><span class="dungeon-carousel__count" id="dungeonCarouselCount" aria-live="polite"></span><button class="dungeon-carousel__button" type="button" data-carousel-next aria-label="Next dungeon"><span>Next</span> ›</button></div></section><section class="dungeons-current"><div class="dungeons-current__heading"><p class="dungeons-hero__eyebrow">Featured encounters</p><h2>Current Dungeons</h2></div><div class="dungeons-current__grid">${DUNGEON_PAGE_TYPES.map(({ type, label }) => `<article class="dungeon-card" id="current-${type}" aria-label="${label}"><div class="dungeon-card__content" id="dungeon-${type}"><p class="loading">Loading ${label.toLowerCase()}...</p></div></article>`).join('')}</div></section><section class="dungeons-current__rewards" id="currentDungeonRewards" aria-label="Dungeon rewards" hidden><img id="currentDungeonRewardsImage" alt="" loading="lazy"><p class="dungeons-current__rewards-error" hidden>Dungeon rewards image unavailable</p></section></section>`;
  DUNGEON_PAGE_TYPES.forEach(({ type }) => {
    const countdown = document.createElement('div');
    countdown.id = `dungeon-${type}-countdown`;
    countdown.className = 'dungeon-countdown';
    countdown.hidden = true;
    countdown.setAttribute('aria-live', 'off');
    const content = document.getElementById(`dungeon-${type}`);
    content.parentElement.insertBefore(countdown, content);
  });
  bindDungeonCarouselControls(page);
  bindCurrentDungeonRewardToggles(page);
  loadCurrentDungeons();
}

async function loadCurrentDungeons() {
  await Promise.all(DUNGEON_PAGE_TYPES.map(loadCurrentDungeon));
}

function loadDungeonCatalog({ type }) {
  if (DUNGEON_CATALOGS.has(type)) return Promise.resolve(DUNGEON_CATALOGS.get(type));
  if (!DUNGEON_CATALOG_REQUESTS.has(type)) {
    const endpoint = `${API_CONFIG.api.dungeons}?type=${encodeURIComponent(type)}`;
    const request = fetch(endpoint)
      .then(response => {
        if (!response.ok) throw new Error(`Unable to load ${type} dungeons`);
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data.dungeons)) throw new Error('Invalid dungeon response');
        DUNGEON_CATALOGS.set(type, data.dungeons);
        if (type === 'raid') DUNGEON_RAID_SCHEDULES.set(type, data.raidSchedule || null);
        return data.dungeons;
      });
    DUNGEON_CATALOG_REQUESTS.set(type, request);
    request.catch(() => {
      if (DUNGEON_CATALOG_REQUESTS.get(type) === request) DUNGEON_CATALOG_REQUESTS.delete(type);
    });
  }
  return DUNGEON_CATALOG_REQUESTS.get(type);
}

async function loadCurrentDungeon({ type, label }) {
  const content = document.getElementById(`dungeon-${type}`);
  try {
    const dungeons = await loadDungeonCatalog({ type, label });
    const raidSchedule = DUNGEON_RAID_SCHEDULES.get(type);
    if (type === 'raid') renderRaidCountdown(raidSchedule);
    const dungeon = type === 'raid'
      ? currentRaidBySchedule(dungeons, raidSchedule)
      : dungeons.find(item => isDungeonScheduledNow(item));
    if (!dungeon) {
      const message = type === 'raid'
        ? `No active ${label.toLowerCase()} dungeon found.`
        : `No ${label.toLowerCase()} dungeon is scheduled at this time.`;
      content.innerHTML = `<p class="offers-status">${escapeHtml(message)}</p>`;
      return;
    }
    if (type !== 'raid') renderScheduledDungeonCountdown(type, dungeons, dungeon);
    content.innerHTML = currentDungeonTemplate(dungeon, type);
  } catch (error) {
    content.innerHTML = errorMessage(error);
  }
}

function renderRaidCountdown(schedule) {
  const current = schedule?.current;
  const next = Array.isArray(schedule?.upcoming) ? schedule.upcoming[0] : null;
  const now = Date.now();
  const nextStart = Date.parse(next?.startsAt);
  const endDateTime = Date.parse(current?.endDateTime);
  const remainingSeconds = Number(current?.remainingSeconds);
  const endDate = Date.parse(current?.endDate);
  const targetTime = Number.isFinite(nextStart)
    ? nextStart
    : Number.isFinite(endDateTime)
      ? endDateTime
    : Number.isFinite(remainingSeconds) && current?.remainingSeconds !== null && String(current?.remainingSeconds ?? '').trim() !== ''
      ? now + remainingSeconds * 1000
      : endDate;
  const nextRaidName = next?.raid?.name;
  const label = nextRaidName
    ? `Next raid: ${escapeHtml(nextRaidName)} starts in`
    : 'Next raid starts in';
  renderDungeonCountdown('raid', targetTime, label, 'Next raid start not announced', 'Starting now');
}

function renderScheduledDungeonCountdown(type, dungeons, currentDungeon) {
  const endTime = Date.parse(currentDungeon.endAt);
  const nextDungeon = dungeons.find(dungeon => (
    dungeon.id !== currentDungeon.id
    && Date.parse(dungeon.startAt) === endTime
  ));
  const targetTime = nextDungeon ? Date.parse(nextDungeon.startAt) : endTime;
  const label = nextDungeon
    ? `Next ${type} starts in`
    : `${type.charAt(0).toUpperCase() + type.slice(1)} ends in`;
  renderDungeonCountdown(type, targetTime, label, `${type} end date not announced`);
}

function renderDungeonCountdown(type, targetTime, label, missingLabel, finishedLabel = 'Finished') {
  const previousInterval = DUNGEON_COUNTDOWN_INTERVALS.get(type);
  if (previousInterval !== undefined) {
    clearInterval(previousInterval);
    DUNGEON_COUNTDOWN_INTERVALS.delete(type);
  }
  const countdown = document.getElementById(`dungeon-${type}-countdown`);
  if (!countdown) return;
  countdown.hidden = false;
  if (!Number.isFinite(targetTime)) {
    countdown.innerHTML = `<span class="dungeon-countdown__label">${escapeHtml(missingLabel)}</span>`;
    return;
  }
  countdown.innerHTML = `<span class="dungeon-countdown__label">${label}</span><strong class="dungeon-countdown__value" role="timer"></strong>`;
  const value = countdown.querySelector('.dungeon-countdown__value');
  const updateCountdown = () => {
    const totalSeconds = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
    if (totalSeconds === 0) {
      value.textContent = finishedLabel;
      value.setAttribute('aria-label', finishedLabel);
      const interval = DUNGEON_COUNTDOWN_INTERVALS.get(type);
      if (interval !== undefined) clearInterval(interval);
      DUNGEON_COUNTDOWN_INTERVALS.delete(type);
      return;
    }
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    value.textContent = `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    value.setAttribute('aria-label', `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`);
  };
  updateCountdown();
  if (targetTime > Date.now()) {
    DUNGEON_COUNTDOWN_INTERVALS.set(type, setInterval(updateCountdown, 1000));
  }
}

function currentRaidBySchedule(dungeons, schedule) {
  const currentDungeonId = schedule?.current?.dungeonId;
  if (!currentDungeonId) return null;
  return dungeons.find(dungeon => dungeon.id === currentDungeonId) || null;
}

function isDungeonScheduledNow(dungeon, now = Date.now()) {
  const startAt = Date.parse(dungeon.startAt);
  const endAt = Date.parse(dungeon.endAt);
  return Number.isFinite(startAt)
    && Number.isFinite(endAt)
    && startAt <= now
    && now < endAt;
}

function bindDungeonCarouselControls(page) {
  const carousel = page.querySelector('#dungeonCarousel');
  const viewport = carousel.querySelector('.dungeon-carousel__viewport');
  let dragStart = null;
  page.querySelectorAll('[data-dungeon-type]').forEach(button => {
    button.addEventListener('click', () => openDungeonCarousel(button.dataset.dungeonType));
  });
  carousel.querySelector('[data-carousel-previous]').addEventListener('click', () => moveDungeonCarousel(-1));
  carousel.querySelector('[data-carousel-next]').addEventListener('click', () => moveDungeonCarousel(1));
  viewport.addEventListener('pointerdown', event => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    dragStart = { pointerId: event.pointerId, x: event.clientX };
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener('pointerup', event => {
    if (dragStart?.pointerId !== event.pointerId) return;
    const distance = event.clientX - dragStart.x;
    dragStart = null;
    viewport.classList.remove('is-dragging');
    if (Math.abs(distance) >= 45) moveDungeonCarousel(distance < 0 ? 1 : -1);
  });
  viewport.addEventListener('pointercancel', () => {
    dragStart = null;
    viewport.classList.remove('is-dragging');
  });
  carousel.querySelector('[data-carousel-close]').addEventListener('click', () => {
    carousel.hidden = true;
    activeDungeonCarousel = null;
    page.querySelectorAll('[data-dungeon-type]').forEach(button => button.setAttribute('aria-pressed', 'false'));
  });
}

function bindCurrentDungeonRewardToggles(page) {
  const grid = page.querySelector('.dungeons-current__grid');
  const rewards = page.querySelector('#currentDungeonRewards');
  const image = page.querySelector('#currentDungeonRewardsImage');
  const error = rewards.querySelector('.dungeons-current__rewards-error');
  image.addEventListener('error', () => {
    image.hidden = true;
    error.hidden = false;
  });
  grid.addEventListener('click', event => {
    const toggle = event.target.closest('[data-dungeon-rewards-toggle]');
    if (!toggle) return;
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    grid.querySelectorAll('[data-dungeon-rewards-toggle]').forEach(button => {
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', `Show ${button.dataset.dungeonType} dungeon rewards`);
    });
    rewards.hidden = expanded;
    if (expanded) return;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', `Hide ${toggle.dataset.dungeonType} dungeon rewards`);
    image.hidden = false;
    error.hidden = true;
    image.alt = `${toggle.dataset.dungeonType} dungeon rewards`;
    image.src = toggle.dataset.dungeonRewardsSrc;
  });
}

async function openDungeonCarousel(type) {
  const config = DUNGEON_PAGE_TYPES.find(item => item.type === type);
  if (!config) return;
  const carousel = document.getElementById('dungeonCarousel');
  const title = document.getElementById('dungeonCarouselTitle');
  const stage = document.getElementById('dungeonCarouselStage');
  if (activeDungeonCarousel?.type === type && !carousel.hidden) return;
  activeDungeonCarousel = { type, dungeons: [], index: 0 };
  title.textContent = `${config.label} Dungeons`;
  stage.innerHTML = '<p class="loading">Loading dungeons...</p>';
  carousel.hidden = false;
  document.querySelectorAll('[data-dungeon-type]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.dungeonType === type));
  });
  carousel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  try {
    const dungeons = await loadDungeonCatalog(config);
    if (activeDungeonCarousel?.type !== type) return;
    activeDungeonCarousel.dungeons = dungeons;
    renderDungeonCarousel();
  } catch (error) {
    if (activeDungeonCarousel?.type === type) stage.innerHTML = errorMessage(error);
  }
}

function renderDungeonCarousel() {
  const carousel = activeDungeonCarousel;
  if (!carousel) return;
  const stage = document.getElementById('dungeonCarouselStage');
  const count = carousel.dungeons.length;
  if (!count) {
    stage.innerHTML = '<p class="offers-status">No dungeons found.</p>';
    updateDungeonCarouselControls();
    return;
  }
  const visibleCount = Math.min(5, count);
  const firstOffset = -Math.floor((visibleCount - 1) / 2);
  const offsets = Array.from({ length: visibleCount }, (_, index) => firstOffset + index);
  stage.innerHTML = offsets.map(offset => {
    const dungeonIndex = (carousel.index + offset + count) % count;
    return dungeonCarouselCard(carousel.dungeons[dungeonIndex], carousel.type, dungeonIndex, offset, count);
  }).join('');
  updateDungeonCarouselControls();
}

function dungeonCarouselCard(dungeon, type, index, offset, count) {
  const image = dungeonImageUrl(type, dungeon.imgdungeon);
  return `<div class="dungeon-carousel__card is-position-${offset}" data-position="${offset}" role="group" aria-label="Dungeon ${index + 1} of ${count}"><img src="${escapeHtml(image)}" alt="" loading="eager" decoding="async" onerror="this.hidden=true"></div>`;
}

function moveDungeonCarousel(direction) {
  const carousel = activeDungeonCarousel;
  const count = carousel?.dungeons.length || 0;
  if (count < 2) return;
  carousel.index = (carousel.index + direction + count) % count;
  if (count <= 5) {
    renderDungeonCarousel();
    return;
  }
  const stage = document.getElementById('dungeonCarouselStage');
  const cards = Array.from(stage.querySelectorAll('.dungeon-carousel__card'));
  cards.forEach(card => {
    const oldPosition = Number(card.dataset.position);
    const nextPosition = oldPosition - direction;
    if (nextPosition < -2 || nextPosition > 2) {
      card.remove();
      return;
    }
    card.classList.remove(`is-position-${oldPosition}`);
    card.classList.add(`is-position-${nextPosition}`);
    card.dataset.position = String(nextPosition);
    const dungeonIndex = (carousel.index + nextPosition + count) % count;
    card.setAttribute('aria-label', `Dungeon ${dungeonIndex + 1} of ${count}`);
  });
  const nextPosition = direction > 0 ? 2 : -2;
  const dungeonIndex = (carousel.index + nextPosition + count) % count;
  stage.insertAdjacentHTML(direction > 0 ? 'beforeend' : 'afterbegin', dungeonCarouselCard(
    carousel.dungeons[dungeonIndex],
    carousel.type,
    dungeonIndex,
    nextPosition,
    count
  ));
  updateDungeonCarouselControls();
}

function updateDungeonCarouselControls() {
  if (!activeDungeonCarousel) return;
  const count = activeDungeonCarousel.dungeons.length;
  document.getElementById('dungeonCarouselCount').textContent = count
    ? `${activeDungeonCarousel.index + 1} / ${count}`
    : '0 / 0';
  document.querySelector('[data-carousel-previous]').disabled = count < 2;
  document.querySelector('[data-carousel-next]').disabled = count < 2;
}

function currentDungeonTemplate(dungeon, type) {
  const image = dungeonImageUrl(type, dungeon.imgdungeon);
  const toggle = dungeon.imgdungeonrewards
    ? `<button class="dungeon-card__toggle" type="button" data-dungeon-rewards-toggle data-dungeon-type="${escapeHtml(type)}" data-dungeon-rewards-src="${escapeHtml(dungeonImageUrl(type, dungeon.imgdungeonrewards))}" aria-label="Show ${escapeHtml(type)} dungeon rewards" aria-expanded="false" aria-controls="currentDungeonRewards">`
    : '';
  const toggleEnd = dungeon.imgdungeonrewards ? '</button>' : '';
  return `<div class="dungeon-card__art">${toggle}<img src="${escapeHtml(image)}" alt="${escapeHtml(type)} dungeon" loading="lazy" onerror="this.remove()">${toggleEnd}</div>`;
}

function dungeonRecapUrl(type) {
  return `${API_CONFIG.assets.dungeonImages}/machine_${encodeURIComponent(type)}_recap.png`;
}

function dungeonImageUrl(type, image) {
  const filename = String(image || '').split('/').pop();
  return `${API_CONFIG.assets.dungeonImages}/${encodeURIComponent(type)}/${encodeURIComponent(filename)}`;
}
