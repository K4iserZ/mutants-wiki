/**
 * main.js — Mutants Genetic Gladiators Wiki
 *
 * Todo el sitio consume /api/mutants.php (ver ese archivo). Hoy ese
 * endpoint lee JSON local de prueba; el día que conectes la API real,
 * este archivo no necesita cambios: solo cambia el origen de datos en
 * config/config.php.
 */

// Ojo: BASE_URL puede ser un string vacío a propósito (proyecto en la raíz
// del sitio), así que se compara con undefined y NO con un check "falsy".
const API_BASE = (typeof window.__BASE_URL__ !== 'undefined')
  ? window.__BASE_URL__
  : document.querySelector('link[href*="style.css"]').href.split('/assets/')[0];

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('mutantGrid');
  const detail = document.getElementById('mutantDetail');

  if (grid) initMutantsPage(grid);
  if (detail) initMutantDetailPage(detail);

  initQuickSearch();
});

/* ==========================================================================
   Página de listado (mutants.php)
   ========================================================================== */
function initMutantsPage(grid) {
  let allMutants = [];
  let activeFilter = 'all';

  fetch(`${API_BASE}/api/mutants.php`)
    .then(r => r.json())
    .then(res => {
      if (!res.ok) throw new Error(res.error || 'Error al cargar');
      allMutants = res.data;
      renderGrid();
    })
    .catch(err => {
      grid.innerHTML = `<p class="loading">No se pudo cargar el catálogo (${err.message}).</p>`;
    });

  document.querySelectorAll('#filters .filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filters .filter').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeFilter = btn.dataset.filter;
      renderGrid();
    });
  });

  function renderGrid() {
    const list = activeFilter === 'all'
      ? allMutants
      : allMutants.filter(m => m.rarity === activeFilter);

    if (!list.length) {
      grid.innerHTML = '<p class="loading">Sin especímenes en esta categoría todavía.</p>';
      return;
    }

    grid.innerHTML = list.map(m => `
      <a class="mcard mcard--${m.rarity}" href="${API_BASE}/mutant.php?slug=${encodeURIComponent(m.slug)}">
        <div class="mcard__art"><span class="mcard__initial">${initial(m.name)}</span></div>
        <div class="mcard__body">
          <h3>${escapeHtml(m.name)}</h3>
          <span class="pill pill--${m.rarity}">${rarityLabel(m.rarity)}</span>
          <div class="mcard__genes">
            ${(m.genes || []).map(g => `<span class="gene gene--${g}">${escapeHtml(g)}</span>`).join('')}
          </div>
        </div>
      </a>
    `).join('');
  }
}

/* ==========================================================================
   Página de ficha individual (mutant.php)
   ========================================================================== */
function initMutantDetailPage(container) {
  const slug = container.dataset.slug;
  if (!slug) {
    container.innerHTML = '<p class="loading">No se especificó un mutante.</p>';
    return;
  }

  fetch(`${API_BASE}/api/mutants.php?slug=${encodeURIComponent(slug)}`)
    .then(r => r.json())
    .then(res => {
      if (!res.ok) throw new Error(res.error || 'No encontrado');
      renderDetail(container, res.data);
    })
    .catch(err => {
      container.innerHTML = `<p class="loading">No se encontró ese mutante (${err.message}).</p>`;
    });
}

function renderDetail(container, m) {
  const tpl = document.getElementById('tpl-mutant-detail');
  const node = tpl.content.cloneNode(true);

  node.querySelector('[data-field="name"]').textContent = m.name;
  node.querySelector('[data-field="name-side"]').textContent = m.name;
  node.querySelector('[data-field="biography"]').textContent = m.biography || 'Sin información todavía.';
  node.querySelector('[data-field="how_to_obtain"]').textContent = m.how_to_obtain || 'Sin información todavía.';

  // Overview: rareza + genes como badges rápidos
  node.querySelector('[data-field="overview-genes"]').innerHTML = `
    <span class="pill pill--${m.rarity}">${rarityLabel(m.rarity)}</span>
    ${(m.genes || []).map(g => `<span class="gene gene--${g}">${escapeHtml(g)}</span>`).join('')}
  `;

  // Sidebar meta
  node.querySelector('[data-field="genes-badges"]').innerHTML =
    (m.genes || []).map(g => `<span class="gene gene--${g}">${escapeHtml(g)}</span>`).join(' ') || '—';
  node.querySelector('[data-field="category"]').textContent = m.category || '—';
  node.querySelector('[data-field="ability"]').textContent = (m.ability || '—').replace(/_/g, ' ');
  node.querySelector('[data-field="breedable"]').textContent = breedableLabel(m.breedable);
  node.querySelector('[data-field="bingo"]').textContent = m.bingo ?? '—';
  const art = node.querySelector('[data-field="art"]');
  art.innerHTML = `<img src="${specimenImage(m, true)}" alt="${escapeHtml(m.name)}" style="width:100%;height:100%;object-fit:contain" onerror="this.onerror=null;this.src='${specimenImage(m, false)}'">`;

  // Tabs de icono (Basic/Bronze/Silver/Gold/Platinum...)
  const iconList = m.icons || [];
  node.querySelector('[data-field="icon-tabs"]').innerHTML = iconList
    .map((ic, i) => `<span class="${i === iconList.length - 1 ? 'is-current' : ''}">${escapeHtml(ic)}</span>`)
    .join('');

  // Icons grid (bloque inferior)
  node.querySelector('[data-field="icons"]').innerHTML = iconList.map(ic => `
    <div class="iconchip">
      <div class="iconchip__badge">${ic.slice(0, 2).toUpperCase()}</div>
      <div class="iconchip__label">${escapeHtml(ic)}</div>
    </div>
  `).join('') || '<p class="loading">Sin iconos registrados.</p>';

  // Larvae (opcional)
  if (m.larvae && m.larvae.length) {
    node.querySelector('[data-field="larvae-block"]').hidden = false;
    node.querySelector('[data-field="larvae"]').innerHTML = m.larvae.map(l => `
      <div class="iconchip">
        <div class="iconchip__badge">${escapeHtml(l.slice(0, 2).toUpperCase())}</div>
        <div class="iconchip__label">${escapeHtml(l)}</div>
      </div>
    `).join('');
  }

  container.innerHTML = '';
  container.appendChild(node);

  setupStats(container, m);
}

/* ---------- Stats: switch Base/Upgraded + calculadora por nivel ---------- */
function setupStats(container, m) {
  const base = (m.stats && m.stats.base) || {};
  const growth = (m.stats && m.stats.growth_per_level) || {};
  const statsgrid = container.querySelector('[data-field="statsgrid"]');
  const switchBtns = container.querySelectorAll('#statMode .switch__opt');
  const calcPanel = container.querySelector('#calcPanel');
  const toggleCalcBtn = container.querySelector('#toggleCalc');
  const calcLevelInput = container.querySelector('#calcLevel');
  const calcResults = container.querySelector('#calcResults');

  let mode = 'base';

  function renderStatsgrid() {
    // "Upgraded" es una demostración con datos de prueba: simula la forma
    // evolucionada (base + 10 niveles de crecimiento). Sustitúyelo por los
    // valores reales de "upgraded" cuando la API los entregue.
    const factor = mode === 'upgraded' ? 10 : 0;
    const val = (key) => (base[key] ?? 0) + (growth[key] ?? 0) * factor;

    statsgrid.innerHTML = `
      <div class="statbox statbox--attack">
        <div class="statbox__label">⚔ ${escapeHtml(base.attack_name_1 || 'Ataque 1')}</div>
        <div class="statbox__value">${val('attack_value_1')}</div>
      </div>
      <div class="statbox statbox--attack">
        <div class="statbox__label">⚔ ${escapeHtml(base.attack_name_2 || 'Ataque 2')}</div>
        <div class="statbox__value">${val('attack_value_2')}</div>
      </div>
      <div class="statbox">
        <div class="statbox__label">❤ Salud</div>
        <div class="statbox__value">${val('health')}</div>
      </div>
      <div class="statbox">
        <div class="statbox__label">⚡ Velocidad</div>
        <div class="statbox__value">${base.speed ?? '—'}</div>
      </div>
      <div class="statbox">
        <div class="statbox__label">🎯 Crítico</div>
        <div class="statbox__value">${base.crit_chance ?? '—'}%</div>
      </div>
      <div class="statbox">
        <div class="statbox__label">🔋 Energía</div>
        <div class="statbox__value">${escapeHtml(base.energy_regen || '—')}</div>
      </div>
    `;
  }
  renderStatsgrid();

  switchBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      mode = btn.dataset.mode;
      renderStatsgrid();
    });
  });

  toggleCalcBtn.addEventListener('click', () => {
    const isHidden = calcPanel.hasAttribute('hidden');
    if (isHidden) {
      calcPanel.removeAttribute('hidden');
      toggleCalcBtn.classList.add('is-on');
      renderCalc();
    } else {
      calcPanel.setAttribute('hidden', '');
      toggleCalcBtn.classList.remove('is-on');
    }
  });

  calcLevelInput.addEventListener('input', renderCalc);

  function renderCalc() {
    const level = Math.max(1, parseInt(calcLevelInput.value, 10) || 1);
    const grow = (key) => (base[key] ?? 0) + (growth[key] ?? 0) * (level - 1);

    calcResults.innerHTML = `
      <div class="calc__result">
        <span>${escapeHtml(base.attack_name_1 || 'Ataque 1')}</span>
        <strong>${grow('attack_value_1')}</strong>
      </div>
      <div class="calc__result">
        <span>${escapeHtml(base.attack_name_2 || 'Ataque 2')}</span>
        <strong>${grow('attack_value_2')}</strong>
      </div>
      <div class="calc__result">
        <span>Salud</span>
        <strong>${grow('health')}</strong>
      </div>
    `;
  }
}

/* ==========================================================================
   Buscador rápido del header
   ========================================================================== */
function initQuickSearch() {
  const input = document.getElementById('quickSearch');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      window.location.href = `${API_BASE}/mutants.php?q=${encodeURIComponent(input.value.trim())}`;
    }
  });
}

/* ==========================================================================
   Helpers
   ========================================================================== */
function initial(name) {
  return escapeHtml((name || '?').charAt(0).toUpperCase());
}
function specimenImage(m, withSkin) {
  const specimen = (m.specimen || m.slug || '').replace(/^specimen_/i, '').toLowerCase();
  return `https://picmg.pages.dev/specimens/${specimen}${withSkin ? '_platinum' : ''}.png`;
}
function rarityLabel(r) {
  const labels = { common: 'Común', rare: 'Rara', epic: 'Épica', legendary: 'Legendaria' };
  return labels[r] || r;
}
function breedableLabel(v) {
  const labels = { yes: 'Sí', no: 'No', if_owned: 'Si ya lo tienes' };
  return labels[v] || v || '—';
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
