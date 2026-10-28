(() => {
  'use strict';
  const root = document.documentElement;
  const syncTheme = () => {
    const theme = root.dataset.theme;
    if (theme !== 'dark' && theme !== 'light') return;
    try {
      localStorage.setItem('zurich-theme', theme);
      localStorage.setItem('alloc-theme', theme);
      localStorage.setItem('schede-theme', theme);
    } catch (_) {}
  };
  syncTheme();
  new MutationObserver(syncTheme).observe(root, {attributes:true, attributeFilter:['data-theme']});

  // sul sito cifrato il service worker lo registra sblocca.js e i dati della Home sono dentro la pagina (#portfolio-data)
  const start = () => {
    const dashboard = document.getElementById('portfolio-dashboard');
    if (!dashboard) return;
    const byId = id => document.getElementById(id);
    const money = value => new Intl.NumberFormat('it-IT', {style:'currency', currency:'EUR', maximumFractionDigits:2}).format(value);
    const number = (value, digits=1) => new Intl.NumberFormat('it-IT', {minimumFractionDigits:digits, maximumFractionDigits:digits}).format(value);
    const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

    const inline = byId('portfolio-data');
    (inline ? Promise.resolve(JSON.parse(inline.textContent)) : fetch('portfolio.json', {cache:'no-store'}).then(response => {
      if (!response.ok) throw new Error('Dati non disponibili');
      return response.json();
    })).then(data => {
      byId('data-status').textContent = 'Snapshot · ' + data.asof;
      byId('total').textContent = money(data.total);
      const difference = data.total - data.costBasis;
      byId('profit').textContent = (difference >= 0 ? '+' : '−') + money(Math.abs(difference)) + ' sul carico';
      byId('profit').classList.add(difference >= 0 ? 'positive' : 'negative');
      byId('count').textContent = data.count + ' fondi';
      byId('equity-pct').textContent = number(data.equity / data.total * 100, 1) + '%';
      byId('equity-value').textContent = money(data.equity);
      byId('bonds-pct').textContent = number(data.bonds / data.total * 100, 1) + '%';
      byId('bonds-value').textContent = money(data.bonds);
      byId('beta').textContent = number(data.risk.beta, 2);
      byId('vol').textContent = number(data.risk.vol, 1) + '%';
      byId('return').textContent = (data.risk.ret >= 0 ? '+' : '') + number(data.risk.ret, 1) + '%';
      byId('drawdown').textContent = number(data.risk.dd, 1) + '%';
      byId('risk-date').textContent = data.risk.data.split('-').reverse().join('/');
      byId('holdings').innerHTML = [...data.positions].sort((a,b) => b.value-a.value).slice(0,5).map((position,index) => {
        const weight = position.value / data.total * 100;
        const part = position.part === 'azionario' ? 'Azionario' : 'Obbligazionario';
        return `<div class="holding"><span class="holding-rank">${index+1}</span><span class="holding-name"><strong>${escape(position.name)}</strong><small>${part}</small></span><span class="holding-value"><strong>${money(position.value)}</strong><small>${number(weight,1)}%</small></span></div>`;
      }).join('');
    }).catch(() => {
      byId('data-status').textContent = 'Snapshot non disponibile';
      byId('holdings').innerHTML = '<p class="loading">Apri la pagina con una connessione per salvare i dati più recenti.</p>';
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
