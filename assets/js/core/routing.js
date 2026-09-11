document.addEventListener('DOMContentLoaded', () => {
  window.MGG_TEMPLATES.renderShell();
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="/"]');
    if (!link || !window.MGG_SITE_BASE) return;
    event.preventDefault();
    window.location.href = url(link.getAttribute('href'));
  });

  const path = window.location.pathname.slice(window.MGG_SITE_BASE.length).replace(/\/$/, '');
  if (/\/specimen\/[^/]+$/i.test(path)) initMutantDetailPage(path.split('/').pop());
  else if (path === '/mutants' || path === '/mutants.html') initMutantsPage();
  else window.MGG_HOME.init();
  initQuickSearch();
});
