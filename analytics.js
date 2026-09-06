/* Google Analytics 4 - single source of truth for the whole site.
 * Property: G-EZ4EEMW6C2. Loaded on every page via:
 *   <script async src="/analytics.js"></script>
 * Provides: (1) standard page_view, (2) a 'link_click' event on every <a>
 * so we can see entry into the different gates/links across the site,
 * including outbound (bots -> onrender) and internal (StemGrade, library) links.
 */
(function () {
  var GA_ID = 'G-EZ4EEMW6C2';

  // 1) Load gtag.js and configure the property.
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);

  // 2) Track clicks on any link, uniformly across all pages.
  //    Capture phase so it fires even if the anchor stops propagation.
  document.addEventListener('click', function (e) {
    var a = (e.target && e.target.closest) ? e.target.closest('a') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    // Skip in-page anchors, javascript: and empty hrefs (kept low-noise).
    if (!href || href.charAt(0) === '#' || href.slice(0, 11).toLowerCase() === 'javascript:') return;

    // Prefer an explicit data-ga label; else the link's own text.
    var label = (a.getAttribute('data-ga') || a.textContent || '')
      .trim().replace(/\s+/g, ' ').slice(0, 100);

    var url, domain = '', outbound = false, full = href;
    try {
      url = new URL(href, window.location.href);
      full = url.href;
      domain = url.hostname;
      outbound = (url.hostname !== window.location.hostname);
    } catch (err) { /* relative/odd href: keep raw values */ }

    gtag('event', 'link_click', {
      link_text: label,
      link_url: full,
      link_domain: domain,
      outbound: outbound
    });
  }, true);
})();
