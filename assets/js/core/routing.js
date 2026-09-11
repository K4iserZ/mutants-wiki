let statsEnginePromise;

function loadStatsEngine() {
  if (window.MGG_STATS) return Promise.resolve();
  if (statsEnginePromise) return statsEnginePromise;
  statsEnginePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${window.MGG_SITE_BASE}/assets/js/calculator/stats-engine.js`;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Unable to load the stats engine'));
    document.head.appendChild(script);
  });
  return statsEnginePromise;
}

document.addEventListener('DOMContentLoaded', () => {
  window.MGG_TEMPLATES.renderShell();
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="/"]');
    if (!link || !window.MGG_SITE_BASE) return;
    event.preventDefault();
    window.location.href = url(link.getAttribute('href'));
  });

  const path = window.location.pathname.slice(window.MGG_SITE_BASE.length).replace(/\/$/, '');
  if (/\/specimen\/[^/]+$/i.test(path)) {
    loadStatsEngine().then(() => initMutantDetailPage(path.split('/').pop())).catch(error => {
      document.getElementById('pageContent').innerHTML = errorMessage(error);
    });
  }
  else if (path === '/mutants' || path === '/mutants.html') initMutantsPage();
  else window.MGG_HOME.init();
  initQuickSearch();
});
