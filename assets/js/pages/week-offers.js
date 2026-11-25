function initWeekOffersPage() {
  const page = document.getElementById('pageContent');
  page.innerHTML = `<section class="week-offers"><header class="pvp-hero week-offers__hero"><img src="${SITE_BASE}/assets/img/main/picto_shop.png" alt="Shop"><div><p class="pvp-hero__eyebrow">Current and upcoming sprints</p><h1>Week Offers</h1><p>Browse the offers available each day.</p><p class="week-offers__sprint" id="weekOffersSprint">Loading sprint...</p></div></header><div class="week-offers__controls"><label for="weekOffersSprintSelect">Sprint</label><select id="weekOffersSprintSelect" disabled><option>Loading sprints...</option></select><label for="weekOffersWeekSelect">Week</label><select id="weekOffersWeekSelect" disabled><option>Loading weeks...</option></select></div><nav class="week-offers__days" id="weekOffersDays" aria-label="Select a day"></nav><div class="week-offers__results" id="weekOffersResults" aria-live="polite"><p class="loading">Loading sprint offers...</p></div></section>`;
  loadWeekOffers();
}

async function loadWeekOffers() {
  const sprintSelect = document.getElementById('weekOffersSprintSelect');
  const weekSelect = document.getElementById('weekOffersWeekSelect');
  const sprintLabel = document.getElementById('weekOffersSprint');
  const results = document.getElementById('weekOffersResults');
  try {
    const response = await fetch(API_CONFIG.api.sprintOffers);
    if (!response.ok) throw new Error('Unable to load sprint offers');
    const data = await response.json();
    const today = new Date().toISOString().slice(0, 10);
    const sprints = weekOffersAvailableSprints(data, today);
    if (!sprints.length) throw new Error('No sprint weeks found');

    sprintSelect.innerHTML = sprints.map((sprint, index) =>
      `<option value="${index}">Sprint ${escapeHtml(sprint.number ?? '')} · ${escapeHtml(formatWeekOffersDate(sprint.start_date))} - ${escapeHtml(formatWeekOffersDate(sprint.end_date))}</option>`
    ).join('');
    sprintSelect.value = String(weekOffersDefaultSprintIndex(sprints, today, data.current_sprint));
    sprintSelect.disabled = false;

    const renderSprint = () => {
      const sprint = sprints[Number(sprintSelect.value)] || sprints[0];
      const weeks = [...sprint.weeks].sort((a, b) => Number(a.week) - Number(b.week));
      sprintLabel.textContent = `Sprint ${sprint.number ?? ''} · ${formatWeekOffersDate(sprint.start_date)} - ${formatWeekOffersDate(sprint.end_date)}`;
      weekSelect.innerHTML = weeks.map((week, index) =>
        `<option value="${index}">Week ${escapeHtml(week.week ?? index + 1)} · ${escapeHtml(formatWeekOffersDate(week.start_date))} - ${escapeHtml(formatWeekOffersDate(week.end_date))}</option>`
      ).join('');
      weekSelect.value = String(weekOffersDefaultIndex(weeks));
      weekSelect.disabled = false;
      renderWeekOffersDay(weeks[Number(weekSelect.value)] || weeks[0], sprint.offers);
    };
    sprintSelect.addEventListener('change', renderSprint);
    weekSelect.addEventListener('change', () => {
      const sprint = sprints[Number(sprintSelect.value)] || sprints[0];
      const weeks = [...sprint.weeks].sort((a, b) => Number(a.week) - Number(b.week));
      renderWeekOffersDay(weeks[Number(weekSelect.value)] || weeks[0], sprint.offers);
    });
    renderSprint();
  } catch (error) {
    results.innerHTML = errorMessage(error);
    sprintSelect.disabled = true;
    weekSelect.disabled = true;
  }
}

function weekOffersAvailableSprints(data, today) {
  const source = Array.isArray(data.sprints) && data.sprints.length
    ? data.sprints
    : data.sprint ? [{ ...data.sprint, offers: data.offers }] : [];
  const allOffers = Array.isArray(data.offers) ? data.offers : [];
  const sprints = source
    .map(sprint => {
      const weeks = Array.isArray(sprint.weeks)
        ? [...sprint.weeks].sort((a, b) => Number(a.week) - Number(b.week))
        : [];
      const sprintNumber = Number(sprint.number);
      const offers = Array.isArray(sprint.offers)
        ? sprint.offers
        : allOffers.filter(offer => Number(offer.sprint) === sprintNumber);
      return { ...sprint, weeks, offers };
    })
    .filter(sprint => sprint.weeks.length)
    .sort((a, b) => Number(a.number) - Number(b.number));
  if (!sprints.length) return [];

  const activeIndex = sprints.findIndex(sprint =>
    today >= String(sprint.start_date || '').slice(0, 10) &&
    today <= String(sprint.end_date || '').slice(0, 10)
  );
  const currentSprintIndex = sprints.findIndex(sprint => Number(sprint.number) === Number(data.current_sprint));
  const nextAvailableIndex = sprints.findIndex(sprint => String(sprint.end_date || '').slice(0, 10) >= today);
  const startIndex = activeIndex >= 0
    ? activeIndex
    : currentSprintIndex >= 0
      ? currentSprintIndex
      : nextAvailableIndex >= 0
        ? nextAvailableIndex
        : sprints.length - 1;
  return sprints.slice(startIndex, startIndex + 3);
}

function weekOffersDefaultSprintIndex(sprints, today, currentSprint) {
  const activeIndex = sprints.findIndex(sprint =>
    today >= String(sprint.start_date || '').slice(0, 10) &&
    today <= String(sprint.end_date || '').slice(0, 10)
  );
  if (activeIndex >= 0) return activeIndex;
  const currentIndex = sprints.findIndex(sprint => Number(sprint.number) === Number(currentSprint));
  return currentIndex >= 0 ? currentIndex : 0;
}

function renderWeekOffersDay(week, offers) {
  const daysElement = document.getElementById('weekOffersDays');
  const results = document.getElementById('weekOffersResults');
  const days = weekOffersDates(week.start_date, week.end_date);
  if (!days.length) {
    daysElement.innerHTML = '';
    results.innerHTML = '<p class="week-offers__empty">No valid dates found for this week.</p>';
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = days.includes(today) ? today : days[0];
  daysElement.innerHTML = days.map(date => {
    const count = offers.filter(offer => String(offer.date || '').slice(0, 10) === date).length;
    const weekday = new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
    const dayNumber = date.slice(-2);
    return `<button class="week-offers__day${date === selectedDate ? ' is-active' : ''}" type="button" data-offer-date="${date}" aria-pressed="${date === selectedDate}" aria-label="${escapeHtml(new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)))}"><span>${weekday}</span><strong>${dayNumber}</strong><small>${count} ${count === 1 ? 'offer' : 'offers'}</small></button>`;
  }).join('');

  daysElement.onclick = event => {
    const button = event.target.closest('[data-offer-date]');
    if (!button) return;
    daysElement.querySelectorAll('.week-offers__day').forEach(dayButton => {
      const isSelected = dayButton === button;
      dayButton.classList.toggle('is-active', isSelected);
      dayButton.setAttribute('aria-pressed', String(isSelected));
    });
    renderWeekOffersResults(button.dataset.offerDate, offers);
  };
  renderWeekOffersResults(selectedDate, offers);
}

function renderWeekOffersResults(date, offers) {
  const results = document.getElementById('weekOffersResults');
  const dayOffers = offers.filter(offer => String(offer.date || '').slice(0, 10) === date);
  const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
  if (!dayOffers.length) {
    results.innerHTML = `<p class="week-offers__empty">No offers for ${escapeHtml(dateLabel)}.</p>`;
    return;
  }

  results.innerHTML = `<div class="week-offers__results-heading"><h2>${escapeHtml(dateLabel)}</h2><span>${dayOffers.length} ${dayOffers.length === 1 ? 'offer' : 'offers'}</span></div><div class="week-offers__grid">${dayOffers.map(weekOfferCard).join('')}</div>`;
  results.querySelectorAll('.week-offer__image').forEach(image => {
    image.addEventListener('error', () => {
      if (image.dataset.fallbackSrc && image.dataset.fallbackAttempted !== 'true') {
        image.dataset.fallbackAttempted = 'true';
        image.src = image.dataset.fallbackSrc;
        return;
      }
      image.hidden = true;
      image.nextElementSibling.hidden = false;
    });
  });
}

function weekOfferCard(offer) {
  const name = String(offer.name || offer.offer_id || 'Offer');
  const picture = weekOfferImageName(offer.picture);
  const id = weekOfferImageName(offer.offer_id);
  const isSpecimen = /^Specimen_/i.test(id);
  const primaryName = isSpecimen ? id : picture || id;
  const fallbackName = isSpecimen ? picture : id;
  const primaryImage = weekOfferImageUrl(primaryName);
  const fallbackImage = fallbackName && fallbackName !== primaryName ? weekOfferImageUrl(fallbackName) : '';
  return `<article class="week-offer"><div class="week-offer__art"><img class="week-offer__image" src="${escapeHtml(primaryImage)}"${fallbackImage ? ` data-fallback-src="${escapeHtml(fallbackImage)}"` : ''} alt="${escapeHtml(name)}" loading="lazy"><span class="week-offer__missing" hidden>Image unavailable</span></div><h3>${escapeHtml(name)}</h3></article>`;
}

function weekOfferImageName(value) {
  return String(value || '').trim().replace(/-?\$\$/g, '-en');
}

function weekOfferImageUrl(name) {
  return `${API_CONFIG.assets.offerImages}/${encodeURIComponent(name)}.png`;
}

function weekOffersDates(startDate, endDate) {
  const start = new Date(`${String(startDate || '').slice(0, 10)}T00:00:00Z`);
  const end = new Date(`${String(endDate || '').slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const dates = [];
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}

function weekOffersDefaultIndex(weeks) {
  const today = new Date().toISOString().slice(0, 10);
  const currentIndex = weeks.findIndex(week => today >= week.start_date && today <= week.end_date);
  if (currentIndex >= 0) return currentIndex;
  return today < weeks[0].start_date ? 0 : weeks.length - 1;
}

function formatWeekOffersDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}