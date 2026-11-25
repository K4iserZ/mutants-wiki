window.MGG_CALCULATOR = {
  async init() {
    document.title = 'MGG Wiki | Calculator';
    const page = document.getElementById('pageContent');
    page.innerHTML = `<section class="section section--tight calculator-page" data-compare="off">
      <div class="section__head">
        <div><h1>Calculator</h1><p class="section__lede">Compare specimen stats, skins and orb combinations.</p></div>
      </div>
      <div class="calculator-toolbar">
        <button class="btn btn--small btn--outline" type="button" data-calculator-action="compare" aria-pressed="false">Compare off</button>
        <div class="calculator-level-controls" id="calculatorLevels" aria-label="Specimen levels"></div>
        <label class="calculator-control calculator-palette" hidden>Colors
          <select id="calculatorPalette"><option value="rank">By ranking</option><option value="specimen">By specimen</option></select>
        </label>
        <button class="btn btn--small btn--outline" type="button" data-calculator-action="export" hidden disabled>Download comparison JPG</button>
        <button class="btn btn--small btn--primary" type="button" data-calculator-action="add" hidden>Add specimen</button>
      </div>
      <p class="calculator-status loading" id="calculatorStatus">Loading specimen catalog...</p>
      <div class="calculator-grid" id="calculatorCards"></div>
    </section>`;

    const calculatorPage = page.querySelector('.calculator-page');
    const catalogHost = document.getElementById('calculatorCards');
    const status = document.getElementById('calculatorStatus');
    const levelControls = document.getElementById('calculatorLevels');
    const paletteInput = document.getElementById('calculatorPalette');
    const exportButton = page.querySelector('[data-calculator-action="export"]');
    let catalog;
    let sortedCatalog = [];
    let abilities;
    let gacha;
    let orbConfig;
    let compare = false;
    let palette = 'rank';
    const detailCache = new Map();
    const states = [];
    let html2CanvasPromise;

    function loadHtml2Canvas() {
      if (window.html2canvas) return Promise.resolve(window.html2canvas);
      if (!html2CanvasPromise) {
        html2CanvasPromise = new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.crossOrigin = 'anonymous';
          script.onload = () => {
            if (window.html2canvas) resolve(window.html2canvas);
            else reject(new Error('The JPG capture library did not load.'));
          };
          script.onerror = () => reject(new Error('Unable to load the JPG capture library.'));
          document.head.appendChild(script);
        });
      }
      return html2CanvasPromise;
    }

    function proxyCalculatorImage(source) {
      const match = String(source).match(/^https:\/\/s-ak\.kobojo\.com\/mutants\/assets\/(.+)$/i);
      if (!match) return source;
      return `${window.location.origin}/.netlify/functions/image-proxy?path=${encodeURIComponent(match[1])}`;
    }

    function proxyCalculatorImageUrls(value) {
      return value.replace(
        /https:\/\/s-ak\.kobojo\.com\/mutants\/assets\/([a-z0-9_./%-]+)/gi,
        (_, path) => proxyCalculatorImage(`https://s-ak.kobojo.com/mutants/assets/${path}`)
      );
    }

    async function exportComparison() {
      if (states.length < 2 || states.some(state => !state.model || state.loading || state.error)) return;
      exportButton.disabled = true;
      exportButton.textContent = 'Preparing JPG...';
      status.classList.add('loading');
      status.textContent = 'Preparing comparison image...';
      status.hidden = false;
      try {
        await document.fonts?.ready;
        const cards = [...catalogHost.querySelectorAll('.calculator-card img:not([hidden])')];
        await Promise.all(cards.map(image => image.decode()));
        const html2canvas = await loadHtml2Canvas();
        const canvas = await html2canvas(catalogHost, {
          backgroundColor: getComputedStyle(document.body).backgroundColor,
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          onclone: async clonedDocument => {
            const clonedCards = clonedDocument.querySelectorAll('#calculatorCards img');
            clonedCards.forEach(image => {
              image.src = proxyCalculatorImage(image.src);
              if (image.dataset.fallback) image.dataset.fallback = proxyCalculatorImage(image.dataset.fallback);
            });
            clonedDocument.querySelectorAll('#calculatorCards [style]').forEach(element => {
              element.setAttribute('style', proxyCalculatorImageUrls(element.getAttribute('style')));
            });
            await Promise.all([...clonedCards].map(image => image.decode()));

            const sourceCards = [...catalogHost.querySelectorAll('.calculator-card')];
            clonedDocument.querySelectorAll('.calculator-card__hero').forEach((hero, index) => {
              const typeColor = getComputedStyle(sourceCards[index]).getPropertyValue('--calculator-type').trim();
              const match = typeColor.match(/^#([0-9a-f]{6})$/i);
              if (!match) throw new Error('Unable to preserve specimen colors in the JPG.');
              const channels = [0, 2, 4].map(offset => Number.parseInt(match[1].slice(offset, offset + 2), 16));
              const glow = `rgba(${channels.join(',')},0.24)`;
              const background = getComputedStyle(sourceCards[index].querySelector('.calculator-card__hero')).backgroundColor;
              hero.style.background = `radial-gradient(70% 60% at 50% 88%,${glow},transparent 72%),${background}`;
            });
          }
        });
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(image => image ? resolve(image) : reject(new Error('Unable to create the JPG image.')), 'image/jpeg', 0.95);
        });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `mgg-comparison-${new Date().toISOString().slice(0, 10)}.jpg`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        status.classList.remove('loading');
        status.textContent = 'JPG downloaded.';
      } catch (error) {
        status.classList.remove('loading');
        status.textContent = `Unable to export comparison: ${error.message || 'unknown error'}`;
      } finally {
        exportButton.disabled = states.length < 2 || states.some(state => !state.model || state.loading || state.error);
        exportButton.textContent = 'Download comparison JPG';
      }
    }

    const sortCatalog = items => [...items].sort((a, b) => a.name.localeCompare(b.name));
    async function loadDetail(summary) {
      const key = summary.specimen;
      if (!detailCache.has(key)) {
        const request = (async () => {
          const endpoint = API_CONFIG.api.specimen.replace('{specimen}', encodeURIComponent(key));
          const response = await fetch(endpoint);
          if (!response.ok) throw new Error(`Unable to load ${summary.name}`);
          const apiDetail = await response.json();
          return normalizeSpecimenDetail(apiDetail, {}, summary, abilities);
        })();
        detailCache.set(key, request);
      }
      return detailCache.get(key);
    }

    function loadState(state) {
      const summary = state.summary;
      loadDetail(summary).then(model => {
        if (!states.includes(state)) return;
        state.model = model;
        state.skin = 'basic';
        state.loading = false;
        state.error = '';
        draw();
      }).catch(error => {
        if (!states.includes(state)) return;
        state.loading = false;
        state.error = error.message || 'Unable to load specimen stats.';
        draw();
      });
    }

    function addState(summary, level = 1) {
      const state = { summary, model: null, skin: null, orbs: {}, level, error: '', loading: true };
      states.push(state);
      loadState(state);
      return state;
    }

    function addEmptyState(level = 1) {
      states.push({ summary: null, model: null, skin: null, orbs: {}, level, error: '', loading: false });
    }

    function orbMarkup(state) {
      const slots = state.model.orbSlots;
      return slots ? orbSlotMarkup(slots, state.orbs, state.model) : '<p class="calculator-empty-orbs">No orb slots available.</p>';
    }

    function resultsFor(state) {
      if (!state.model) return null;
      const model = state.model;
      const base = window.MGG_STATS.calculate(model, state.level, state.skin);
      const calculated = window.MGG_STATS.applyOrbEffectsToStats(base, Object.values(state.orbs), {
        baseAbilityType: model.abilities?.split(';')[0]?.split(':')[1]
      });
      const normalizedAppliesTo = String(model.appliesTo || 'both').toLowerCase();
      const attacks = [1, 2].map(index => {
        const attackState = calculated[`attack${index}State`];
        const field = attackState.selectedKey === `${index}p` ? `atk${index}p` : `atk${index}`;
        const abilityKey = model.abilities?.split(';')[index - 1]?.split(':')[1] || '';
        const abilityApplies = normalizedAppliesTo === 'both' || normalizedAppliesTo === `atk${index}`;
        const configuredAbility = calculated[`ability${index}Name`];
        const hasConfiguredAbility = abilityApplies && configuredAbility && configuredAbility !== 'No information';
        const addedAbilityValue = calculated[`atk${index}AddedAbilityF`];
        return {
          value: calculated[`atk${index}F`],
          geneIcon: attackGeneIconUrl(attackState.gene, model[field]),
          ability: hasConfiguredAbility ? configuredAbility : '',
          abilityIcon: hasConfiguredAbility && abilityKey ? abilityIconUrl(abilityKey) : '',
          abilityValue: hasConfiguredAbility ? calculated[`atk${index}BaseAbilityF`] : 0,
          addedAbility: calculated.addedAbilityName && addedAbilityValue ? {
            name: calculated.addedAbilityName,
            icon: abilityIconUrl(calculated.addedAbilityName),
            value: addedAbilityValue
          } : null
        };
      });
      return {
        model,
        calculated,
        values: {
          life: Number(calculated.lifeF) || 0,
          attack1: Number(calculated.atk1F) || 0,
          attack2: Number(calculated.atk2F) || 0,
          speed: Number(calculated.speedF) || 0
        },
        attacks
      };
    }

    function comparison(metric, current, currentIndex) {
      if (!compare) return { rank: 0, color: '', percent: 100, difference: '' };
      const entries = states.map((state, index) => ({ index, value: state.result?.values[metric] }))
        .filter(entry => entry.value !== undefined && Number.isFinite(entry.value));
      const value = current.values[metric];
      if (entries.length < 2) return { rank: 0, color: '', percent: 100, difference: '' };
      const rank = 1 + entries.filter(entry => entry.value > value).length;
      const equal = entries.every(entry => entry.value === entries[0].value);
      const rankColors = {
        2: ['green', 'red'],
        3: ['green', 'cyan', 'red'],
        4: ['green', 'cyan', 'blue', 'red'],
        5: ['green', 'cyan', 'blue', 'amber', 'red']
      }[entries.length];
      const specimenColors = ['red', 'cyan', 'blue', 'green', 'amber'];
      const color = palette === 'specimen'
        ? specimenColors[currentIndex]
        : (equal ? '' : rankColors[rank - 1]);
      const others = entries.filter(entry => entry.index !== currentIndex).map(entry => entry.value);
      const reference = rank === 1 ? Math.max(...others) : Math.max(...entries.map(entry => entry.value));
      const difference = value - reference;
      return {
        rank,
        color,
        percent: Math.max(6, (value / (Math.max(...entries.map(entry => entry.value)) || 1)) * 100),
        difference: difference === 0 ? '=' : `${difference > 0 ? '+' : '−'}${formatStatValue(Math.abs(difference))}`
      };
    }

    function skillMarkup(attack) {
      if (!attack.ability && !attack.addedAbility) return '';
      const primary = attack.ability
        ? `<span class="calculator-skill__base" title="${escapeHtml(attack.ability)}"><span class="calculator-skill__icon"><img src="${escapeHtml(attack.abilityIcon)}" alt="" onerror="this.hidden=true"></span><span class="calculator-fit" data-max="12">${formatStatValue(attack.abilityValue) || '–'}</span></span>`
        : '';
      const added = attack.addedAbility
        ? `<span class="calculator-added-skill" title="${escapeHtml(attack.addedAbility.name)}"><img src="${escapeHtml(attack.addedAbility.icon)}" alt="" onerror="this.hidden=true"><strong class="calculator-fit" data-max="12">${formatStatValue(attack.addedAbility.value)}</strong></span>`
        : '';
      return `<div class="calculator-skill">${primary}${added}</div>`;
    }

    function metricMarkup(state, metric, label, icon, attack, index) {
      const info = comparison(metric, state.result, index);
      const color = info.color ? `var(--calculator-${info.color})` : 'var(--text-muted)';
      const barWidth = `${info.percent}%`;
      const ranking = states.length > 2 && info.rank ? `<span class="calculator-rank" style="background:${color}">${info.rank}</span>` : '';
      const difference = info.difference ? `<span class="calculator-difference calculator-fit" data-max="11">${info.difference}</span>` : '';
      const ability = attack ? skillMarkup(attack) : '';
      const iconMarkup = icon ? `<img src="${escapeHtml(icon)}" alt="" onerror="this.hidden=true">` : '';
      const value = metric === 'speed' ? state.result.calculated.speedF : formatStatValue(state.result.values[metric]);
      return `<div class="calculator-row${attack ? ' calculator-row--attack' : ''}" style="--calculator-stat-color:${color};--calculator-bar-width:${barWidth}">
        <span class="calculator-stat-icon">${attack ? `<img src="${escapeHtml(attack.geneIcon)}" alt="" onerror="this.hidden=true">` : iconMarkup}</span>
        <span class="calculator-row__label">${escapeHtml(label)}${ranking}${difference}</span>
        <strong class="calculator-fit calculator-row__value" data-max="19">${escapeHtml(value)}</strong>
        <span class="calculator-bar" aria-hidden="true"><i></i></span>${ability}
      </div>`;
    }

    function skinMarkup(state) {
      const options = window.MGG_STATS.getSkinOptions(state.model);
      if (options.length < 2) return '';
      return `<div class="calculator-skins" aria-label="Specimen skin">
        ${options.map(option => `<button class="calculator-skin${option.key === state.skin ? ' is-active' : ''}" type="button" data-calculator-skin="${escapeHtml(option.key)}" title="${escapeHtml(option.label)}" aria-label="${escapeHtml(option.label)}"><img src="${escapeHtml(skinTabIconUrl(option))}" data-fallback="${escapeHtml(skinTabIconFallbackUrl(option))}" alt="" onerror="if(this.dataset.fallback){this.src=this.dataset.fallback;this.removeAttribute('data-fallback')}else{this.hidden=true}"><span>${escapeHtml(option.label)}</span></button>`).join('')}
      </div>`;
    }

    function cardMarkup(state, index) {
      const result = state.result;
      if (!state.model || !result) {
        return `<article class="calculator-card" data-calculator-card="${index}">
          <div class="calculator-card__selector"><div class="calculator-specimen-picker"><input type="search" value="${escapeHtml(state.summary?.name || '')}" placeholder="Search specimen..." aria-label="Search specimen" autocomplete="off" data-calculator-search><div class="calculator-specimen-results" role="listbox" hidden></div></div>${states.length > 1 ? `<button class="calculator-remove" type="button" data-calculator-action="remove" aria-label="Remove ${escapeHtml(state.summary?.name || `specimen ${index + 1}`)}">×</button>` : ''}</div>
          ${state.loading ? '<p class="loading calculator-card__message">Loading specimen stats...</p>' : state.error ? `<p class="calculator-card__message calculator-card__error">${escapeHtml(state.error)}</p>` : '<p class="calculator-card__message">Choose a specimen to compare.</p>'}
        </article>`;
      }

      const mutant = state.model;
      const image = skinImageUrl(mutant, state.skin);
      const typeImage = typeIconUrl(mutant.type);
      const geneIcons = Array.from(String(mutant.dna || '').toLowerCase())
        .filter(gene => /^[a-fn]$/.test(gene))
        .map(gene => `<img class="calculator-gene" src="${geneIconUrl(gene)}" alt="Gene ${gene.toUpperCase()}" title="Gene ${gene.toUpperCase()}" onerror="this.hidden=true">`)
        .join('');
      state.result = result;
      return `<article class="calculator-card" data-calculator-card="${index}" style="--calculator-type:${escapeHtml(mutant.typeColor || 'var(--plasma)')}">
        <div class="calculator-card__selector"><div class="calculator-specimen-picker"><input type="search" value="${escapeHtml(mutant.name)}" placeholder="Search specimen..." aria-label="Search specimen" autocomplete="off" data-calculator-search><div class="calculator-specimen-results" role="listbox" hidden></div></div>${states.length > 1 ? `<button class="calculator-remove" type="button" data-calculator-action="remove" aria-label="Remove ${escapeHtml(mutant.name)}">×</button>` : ''}</div>
        <div class="calculator-card__hero">
          <img class="calculator-card__art" src="${escapeHtml(image)}" alt="${escapeHtml(mutant.name)}">
          <span class="calculator-card__genes">${geneIcons || '<span class="calculator-gene--empty">—</span>'}</span>
          ${skinMarkup(state)}
        </div>
        <div class="calculator-card__identity">
          <h2 class="calculator-card__name">${escapeHtml(mutant.name)}</h2>
          <div class="calculator-card__meta">
            <span class="calculator-card__type"><img src="${escapeHtml(typeImage)}" alt="">${escapeHtml(mutant.typeLabel || mutant.type || 'Common')}</span>
            <span class="calculator-card__shown-level">Level ${escapeHtml(String(state.level))}</span>
          </div>
        </div>
        <div class="calculator-orbs">${orbMarkup(state)}</div>
        <div class="calculator-stats">
          ${metricMarkup(state, 'life', 'Life', API_CONFIG.assets.icons.life, null, index)}
          ${metricMarkup(state, 'attack1', result.calculated.attack1Name || 'Attack 1', '', result.attacks[0], index)}
          ${metricMarkup(state, 'attack2', result.calculated.attack2Name || 'Attack 2', '', result.attacks[1], index)}
          ${metricMarkup(state, 'speed', 'Speed', API_CONFIG.assets.icons.speed, null, index)}
        </div>
      </article>`;
    }

    function fitCard(card) {
      const name = card.querySelector('.calculator-card__name');
      if (name) {
        name.classList.remove('is-wrapped');
        let size = 26;
        name.style.fontSize = `${size}px`;
        while (size > 14 && name.scrollWidth > name.clientWidth + 0.5) {
          size -= 1;
          name.style.fontSize = `${size}px`;
        }
        if (name.scrollWidth > name.clientWidth + 0.5) {
          name.classList.add('is-wrapped');
          name.style.fontSize = '14px';
        }
      }
      card.querySelectorAll('.calculator-fit').forEach(element => {
        let size = Number(element.dataset.max) || 16;
        element.style.fontSize = `${size}px`;
        while (size > 7 && element.scrollWidth > element.clientWidth + 0.5) {
          size -= 0.5;
          element.style.fontSize = `${size}px`;
        }
      });
    }

    function draw() {
      states.forEach(state => { state.result = resultsFor(state); });
      levelControls.innerHTML = states.map((state, index) =>
        `<label class="calculator-control calculator-level-control" for="calculatorLevel${index}"><span>${escapeHtml(state.summary?.name || `Specimen ${index + 1}`)} — Level</span><input id="calculatorLevel${index}" type="number" min="1" value="${state.level}" data-calculator-level aria-label="Level for ${escapeHtml(state.summary?.name || `specimen ${index + 1}`)}"></label>`
      ).join('');
      catalogHost.innerHTML = states.map(cardMarkup).join('');
      catalogHost.querySelectorAll('.calculator-card__art').forEach(image => {
        const state = states[Number(image.closest('[data-calculator-card]').dataset.calculatorCard)];
        image.addEventListener('error', () => {
          if (!image.dataset.baseFallback) {
            image.dataset.baseFallback = 'true';
            image.src = specimenSkinImage(state.model.specimen, 'basic');
          } else if (!image.dataset.thumbnailFallback) {
            image.dataset.thumbnailFallback = 'true';
            image.src = thumbnailSkinImage(state.model.specimen, 'basic');
          } else {
            image.hidden = true;
          }
        });
      });
      catalogHost.querySelectorAll('.calculator-card').forEach(fitCard);
      page.querySelector('[data-calculator-action="add"]').disabled = states.length >= 5;
      page.querySelector('[data-calculator-action="add"]').hidden = !compare;
      page.querySelector('.calculator-palette').hidden = !compare;
      exportButton.hidden = !compare;
      exportButton.disabled = states.length < 2 || states.some(state => !state.model || state.loading || state.error);
      status.hidden = true;
    }

    const refitCards = () => requestAnimationFrame(() => {
      catalogHost.querySelectorAll('.calculator-card').forEach(fitCard);
    });
    window.addEventListener('resize', refitCards, { passive: true });
    if (document.fonts) document.fonts.ready.then(refitCards);

    function showOrbMenu(slot, view = 'categories') {
      const stateIndex = Number(slot.closest('[data-calculator-card]')?.dataset.calculatorCard);
      const state = states[stateIndex];
      const kind = slot.dataset.orbKind || 'basic';
      const menu = slot.querySelector('[data-orb-menu]');
      if (!state || !menu) return;
      const slotIndex = Number(slot.dataset.orbSlot);
      if (view === 'levels') {
        const group = menu.dataset.orbGroup || '';
        const entries = window.MGG_ORBS?.[kind]?.[group] || [];
        menu.innerHTML = `<button class="orb-picker__back" type="button" data-orb-back>← Back</button><div class="orb-picker__items">${entries.map(orb => `<button class="orb-picker__option" type="button" data-orb-level-id="${escapeHtml(orb.id)}"><img class="orb-picker__option-icon" src="${escapeHtml(orbImageUrl(orb.id))}" alt=""><span>${escapeHtml(orb.name)}</span></button>`).join('')}</div>`;
        return;
      }
      const allowed = orbAllowedTypes(kind, state.model, state.orbs);
      const groups = Object.entries(window.MGG_ORBS?.[kind] || {}).filter(([group]) =>
        allowed.includes(kind === 'special' ? group : group.replace(/^add/, '').toLowerCase()));
      const remove = state.orbs[slotIndex] ? '<button class="orb-picker__option orb-picker__option--remove" type="button" data-orb-remove>Remove orb</button>' : '';
      menu.dataset.orbGroup = '';
      menu.innerHTML = groups.length
        ? `<div class="orb-picker__items">${remove}${groups.map(([group]) => `<button class="orb-picker__option" type="button" data-orb-group="${escapeHtml(group)}">${escapeHtml(window.MGG_STATS.formatOrbTypeLabel(group))}</button>`).join('')}</div>`
        : '<span class="calculator-orb-error">Orb options are unavailable.</span>';
    }

    function showSpecimenResults(input) {
      const picker = input.closest('.calculator-specimen-picker');
      const results = picker.querySelector('.calculator-specimen-results');
      const term = input.value.trim().toLowerCase();
      const matches = sortedCatalog.filter(mutant =>
        !term || `${mutant.name} ${mutant.specimen} ${mutant.dna || ''}`.toLowerCase().includes(term)).slice(0, 12);
      results.innerHTML = matches.map(mutant => {
        const index = sortedCatalog.indexOf(mutant);
        return `<button class="calculator-specimen-result" type="button" role="option" data-calculator-select="${index}">${escapeHtml(mutant.name)}<span>${escapeHtml(mutant.typeLabel || mutant.type || '')}</span></button>`;
      }).join('') || '<span class="calculator-specimen-empty">No matching specimens</span>';
      results.hidden = false;
    }

    catalogHost.addEventListener('click', event => {
      const specimenChoice = event.target.closest('[data-calculator-select]');
      if (specimenChoice) {
        const card = specimenChoice.closest('[data-calculator-card]');
        const index = Number(card.dataset.calculatorCard);
        const summary = sortedCatalog[Number(specimenChoice.dataset.calculatorSelect)];
        if (!summary) return;
        states[index] = { summary, model: null, skin: null, orbs: {}, level: states[index].level, error: '', loading: true };
        loadState(states[index]);
        draw();
        return;
      }
      const action = event.target.closest('[data-calculator-action]');
      if (action?.dataset.calculatorAction === 'remove') {
        if (states.length <= 1) return;
        states.splice(Number(action.closest('[data-calculator-card]').dataset.calculatorCard), 1);
        if (states.length === 1) {
          compare = false;
          calculatorPage.dataset.compare = 'off';
          const compareButton = page.querySelector('[data-calculator-action="compare"]');
          compareButton.classList.remove('is-on');
          compareButton.setAttribute('aria-pressed', 'false');
          compareButton.textContent = 'Compare off';
        }
        draw();
        return;
      }
      const skinButton = event.target.closest('[data-calculator-skin]');
      if (skinButton) {
        const state = states[Number(skinButton.closest('[data-calculator-card]').dataset.calculatorCard)];
        state.skin = skinButton.dataset.calculatorSkin;
        draw();
        return;
      }
      const orbButton = event.target.closest('[data-orb-picker]');
      if (orbButton) {
        const orbSlot = orbButton.closest('[data-orb-slot]');
        const menu = orbSlot.querySelector('[data-orb-menu]');
        const opening = menu.hidden;
        catalogHost.querySelectorAll('[data-orb-menu]').forEach(item => { item.hidden = true; });
        menu.hidden = !opening;
        if (opening) showOrbMenu(orbSlot, 'categories');
        return;
      }
      const menu = event.target.closest('[data-orb-menu]');
      if (!menu) return;
      const slot = menu.closest('[data-orb-slot]');
      if (event.target.closest('[data-orb-back]')) {
        showOrbMenu(slot);
        return;
      }
      const removeOrb = event.target.closest('[data-orb-remove]');
      const slotIndex = Number(slot.dataset.orbSlot);
      const state = states[Number(slot.closest('[data-calculator-card]').dataset.calculatorCard)];
      if (removeOrb) {
        delete state.orbs[slotIndex];
        draw();
        return;
      }
      const group = event.target.closest('[data-orb-group]');
      if (group && group !== menu && !event.target.closest('[data-orb-level-id]')) {
        menu.dataset.orbGroup = group.dataset.orbGroup;
        showOrbMenu(slot, 'levels');
        return;
      }
      const levelButton = event.target.closest('[data-orb-level-id]');
      if (levelButton) {
        const orb = [...orbEntries('basic'), ...orbEntries('special')].find(item => item.id === levelButton.dataset.orbLevelId);
        if (orb) state.orbs[slotIndex] = orb;
        draw();
      }
    });

    catalogHost.addEventListener('input', event => {
      if (event.target.matches('[data-calculator-search]')) showSpecimenResults(event.target);
    });

    levelControls.addEventListener('change', event => {
      if (!event.target.matches('[data-calculator-level]')) return;
      const state = states[Number(event.target.id.replace('calculatorLevel', ''))];
      state.level = Math.max(1, Number.parseInt(event.target.value, 10) || 1);
      draw();
    });

    page.addEventListener('click', event => {
      if (!event.target.closest('.calculator-specimen-picker')) {
        catalogHost.querySelectorAll('.calculator-specimen-results').forEach(results => { results.hidden = true; });
      }
      const addButton = event.target.closest('[data-calculator-action="add"]');
      if (addButton) {
        if (states.length >= 5) return;
        addEmptyState();
        draw();
        return;
      }
      const exportButtonClicked = event.target.closest('[data-calculator-action="export"]');
      if (exportButtonClicked) {
        exportComparison();
        return;
      }
      const compareButton = event.target.closest('[data-calculator-action="compare"]');
      if (compareButton) {
        compare = !compare;
        if (compare && states.length === 1) {
          addEmptyState(states[0].level);
        } else if (!compare && states.length > 1) {
          states.splice(1);
        }
        calculatorPage.dataset.compare = compare ? 'on' : 'off';
        compareButton.classList.toggle('is-on', compare);
        compareButton.setAttribute('aria-pressed', String(compare));
        compareButton.textContent = compare ? 'Compare on' : 'Compare off';
        draw();
        return;
      }
    });

    paletteInput.addEventListener('change', () => {
      palette = paletteInput.value;
      draw();
    });

    try {
      [catalog, abilities, gacha, orbConfig] = await Promise.all([
        loadIndex(),
        loadAbilitiesConfig(),
        loadGachaConfig(),
        loadOrbsConfig()
      ]);
      window.MGG_GACHA_CONFIG = gacha;
      window.MGG_ORBS = orbConfig;
      sortedCatalog = sortCatalog(catalog);
      const initialSpecimens = sortedCatalog.filter((mutant, index, items) =>
        items.findIndex(item => item.specimen === mutant.specimen) === index);
      if (!initialSpecimens.length) throw new Error('No specimens are available for the calculator.');
      status.hidden = true;
      const testSpecimen = initialSpecimens.find(mutant => /(?:^|_)d_14$/i.test(mutant.specimen));
      addState(testSpecimen || initialSpecimens[0]);
      draw();
    } catch (error) {
      status.classList.remove('loading');
      status.textContent = error.message || 'Unable to load the calculator.';
    }
  }
};
