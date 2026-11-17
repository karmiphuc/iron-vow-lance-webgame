// The chart exposes the next decision. Cost and readiness detail stay behind disclosure.
window.IronVowOverworldView = (() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const credits = value => `${Math.round(value).toLocaleString('en-US')} CR`;


  function render(data) {
    const selected = data.ports.find(port => port.id === data.selected);
    const current = data.ports.find(port => port.id === data.current);
    const quote = data.quote;
    const travelling = selected && selected.id !== data.current;
    const affordable = quote && quote.cashAfterArrival >= 0;
    const ready = data.readiness.filter(unit => unit.condition >= 30 && !unit.wound).length;
    const routes = data.routeOptions.map(route => `
      <button type="button" data-overworld-route-option="${escapeHtml(route.key)}" aria-pressed="${route.key === data.pathKey}">
        <span>${escapeHtml(route.label)}</span><b>${route.days}d <small>${credits(route.total)}</small></b>
      </button>`).join('');
    const markers = data.ports.map(port => `
      <button type="button" class="chart-port${port.id === data.current ? ' is-current' : ''}" data-overworld-port="${port.id}"
        aria-label="${escapeHtml(port.name)}${port.id === data.current ? ', current mooring' : ''}" aria-pressed="${port.id === data.selected}"${port.id === data.current ? ' aria-current="location"' : ''}>
        <span class="chart-port-mark" aria-hidden="true"></span><b>${escapeHtml(port.name)}</b>
      </button>`).join('');
    const cost = quote ? `<details class="chart-detail chart-cost-detail">
      <summary aria-label="Travel cost breakdown"><small>Cost</small><strong data-chart-cost>${credits(quote.total)}</strong></summary>
      <div class="chart-detail-card"><h3>Transit costs</h3><dl>
        ${[['Fuel', quote.fuel], ['Crew wages', quote.wages], ['Ship upkeep', quote.ship], ['Hull upkeep', quote.hulls]].map(([label, amount]) => `<div><dt>${label}</dt><dd>${credits(amount)}</dd></div>`).join('')}
      </dl>${data.arrears ? `<p class="chart-warning">Existing arrears ${credits(data.arrears)}</p>` : ''}</div>
    </details>` : '';
    const readiness = `<details class="chart-detail chart-lance-detail">
      <summary aria-label="Lance readiness on arrival"><small>Lance</small><strong>${ready}/${data.readiness.length}<span class="chart-ready-pips" aria-hidden="true">${data.readiness.map(unit => `<i class="${unit.wound ? 'is-wounded' : unit.condition < 30 ? 'is-damaged' : 'is-ready'}"></i>`).join('')}</span></strong></summary>
      <div class="chart-detail-card"><h3>On arrival</h3>${data.readiness.map(unit => `<div class="chart-readiness-unit"><span><b>${escapeHtml(unit.name)}</b><small>${escapeHtml(unit.pilot)}</small></span><span><b>${unit.condition}%</b><small>${unit.wound ? 'Wounded' : unit.condition < 30 ? 'Repair required' : unit.condition > unit.before ? `+${unit.condition - unit.before} serviced` : 'Ready'}</small></span></div>`).join('')}</div>
    </details>`;
    const forecast = travelling && quote ? `
      <div class="chart-route-options" aria-label="Route options">${routes}</div>
      <section class="chart-forecast" aria-label="Route forecast">
        <div class="chart-arrival"><small>Arrival</small><strong data-chart-arrival>Day ${data.day + quote.days}<span>${quote.days}d transit</span></strong></div>
        ${cost}
        <div class="chart-cash${affordable ? '' : ' chart-warning'}"><small>Cash left</small><strong data-chart-cash>${credits(quote.cashAfterArrival)}</strong></div>
        ${readiness}
        <div class="chart-departure">
          ${data.confirming ? '<span class="chart-confirm-label" role="status">Course locked</span><button type="button" class="chart-cancel" data-overworld-cancel>Cancel</button>' : ''}
          <button type="button" class="primary" data-overworld-travel="${data.selected}"${data.confirming ? ' data-overworld-confirm' : ''}${affordable && !data.departing ? '' : ' disabled'}>${data.departing ? 'Under way' : !affordable ? `Need ${credits(-quote.cashAfterArrival)}` : data.confirming ? 'Confirm departure' : 'Depart'}</button>
        </div>
      </section>` : '<section class="chart-forecast chart-forecast-idle"><p>Choose a destination on the chart.</p><span>IVS Halyard · Moored</span></section>';

    return `<div class="overworld-page chart-page">
      <div id="chart-viewport" class="chart-viewport" tabindex="0" role="group" aria-label="Halyard chart table. Drag to pan, pinch to zoom. Use arrow keys to pan and Home to recenter.">${markers}</div>
      <div class="chart-heading"><span class="eyebrow">IVS HALYARD / BRIDGE</span><h1>CHART TABLE</h1><p>${data.departing ? 'In transit' : 'Moored'} · ${escapeHtml(current.name)}</p></div>
      <button type="button" class="chart-reset" data-chart-reset aria-label="Recenter chart">Recenter</button>
      <aside class="chart-port-card" aria-label="Selected mooring">
        <h2>${escapeHtml(selected.name)}</h2>
        <button type="button" data-chart-contracts="${selected.id}">Contracts ${data.contractCount ?? 1}</button>
      </aside>
      <div class="chart-course">${forecast}</div>
      <div class="chart-load-status" role="status">${data.sceneReady ? '' : 'Preparing chart'}</div>
    </div>`;
  }
  return Object.freeze({ render });
})();
