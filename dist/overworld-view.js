// The chart exposes the next decision. Cost and readiness detail stay behind disclosure.
window.IronVowOverworldView = (() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const credits = value => `${Math.round(value).toLocaleString('en-US')} CR`;


  function transitReport(event) {
    return `<aside class="port-services transit-report" role="dialog" aria-modal="false" aria-labelledby="transit-report-title" aria-describedby="transit-report-description" data-event-id="${escapeHtml(event.id)}">
      <div class="port-services-header"><h2 id="transit-report-title"><span class="transit-report-label">Transit report</span>${escapeHtml(event.title)}</h2></div>
      <div class="port-services-body">
        <p id="transit-report-description">${escapeHtml(event.description)}</p>
        <div class="transit-report-choices">${(event.choices || []).map(choice => `<button type="button" data-transit-choice="${escapeHtml(choice.id)}" data-event-id="${escapeHtml(event.id)}"${choice.disabled ? ' disabled' : ''}><b>${escapeHtml(choice.label)}</b>${choice.detail ? `<span>${escapeHtml(choice.detail)}</span>` : ''}</button>`).join('')}</div>
      </div>
      <span class="visually-hidden" role="status" aria-live="polite">${escapeHtml(event.title)}. Choose a response to continue.</span>
    </aside>`;
  }

  function directory(data) {
    const regions = ['Central Line', 'North Divide', 'Salt March'];
    return `<details class="rail-directory">
      <summary>Rail network · ${data.ports.length} stops</summary>
      <div class="rail-directory-list">${regions.map(region => {
        const ports = data.ports.filter(port => (port.region || 'Central Line') === region);
        return `<section><h3>${region}</h3><div>${ports.map(port =>
          `<button type="button" data-rail-directory="${escapeHtml(port.id)}"${port.id === data.selected ? ' aria-current="true"' : ''}>
             <b>${escapeHtml(port.name)}</b>${port.role ? `<small>${escapeHtml(port.role)}</small>` : ''}
           </button>`).join('')}</div></section>`;
      }).join('')}</div>
    </details>`;
  }
  function render(data) {
    const selected = data.ports.find(port => port.id === data.selected);
    const current = data.ports.find(port => port.id === data.current);
    const quote = data.quote;
    const travelling = selected && selected.id !== data.current || data.holding;
    const affordable = quote && (quote.cashAfterArrival >= 0 || data.holding);
    const ready = data.readiness.filter(unit => unit.condition >= 30 && !unit.wound).length;
    const routes = data.routeOptions.map(route => `
      <button type="button" data-overworld-route-option="${escapeHtml(route.key)}" aria-pressed="${route.key === data.pathKey}">
        <span>${escapeHtml(route.label)}</span><b>${route.days}d <small>${credits(route.total)}</small></b>
      </button>`).join('');
    const markers = data.ports.map(port => `
      <button type="button" class="chart-port${port.region ? ' chart-outer-port' : ''}${port.id === data.current ? ' is-current' : ''}" data-overworld-port="${port.id}"
        aria-label="${escapeHtml(port.name)}${port.id === data.current ? ', current railhead' : ''}" aria-pressed="${port.id === data.selected}"${port.id === data.current ? ' aria-current="location"' : ''}>
        <span class="chart-port-mark" aria-hidden="true"></span><b>${escapeHtml(port.name)}</b>
      </button>`).join('');
    const cost = quote ? `<details class="chart-detail chart-cost-detail">
      <summary aria-label="Travel cost breakdown"><small>Cost</small><strong data-chart-cost>${credits(quote.total)}</strong></summary>
      <div class="chart-detail-card"><h3>Transit costs</h3><dl>
        ${[['Route charges', quote.fuel], ['Crew wages', quote.wages], ['Train upkeep', quote.ship], ['Hull upkeep', quote.hulls]].map(([label, amount]) => `<div><dt>${label}</dt><dd>${credits(amount)}</dd></div>`).join('')}
      </dl>${quote.toll ? `<p class="chart-warning">Includes ${credits(quote.toll)} in disruption surcharges</p>` : ''}${quote.discount ? `<p>Includes ${credits(quote.discount)} in freight discounts</p>` : ''}${data.holdArrears || data.arrears ? `<p class="chart-warning">Arrears ${credits(data.holdArrears || data.arrears)}</p>` : ''}</div>
    </details>` : '';
    const readiness = `<details class="chart-detail chart-lance-detail">
      <summary aria-label="Lance readiness on arrival"><small>Lance</small><strong>${ready}/${data.readiness.length}<span class="chart-ready-pips" aria-hidden="true">${data.readiness.map(unit => `<i class="${unit.wound ? 'is-wounded' : unit.condition < 30 ? 'is-damaged' : 'is-ready'}"></i>`).join('')}</span></strong></summary>
      <div class="chart-detail-card"><h3>On arrival</h3>${data.readiness.map(unit => `<div class="chart-readiness-unit"><span><b>${escapeHtml(unit.name)}</b><small>${escapeHtml(unit.pilot)}</small></span><span><b>${unit.condition}%</b><small>${unit.wound ? 'Wounded' : unit.condition < 30 ? 'Repair required' : unit.condition > unit.before ? `+${unit.condition - unit.before} serviced` : 'Ready'}</small></span></div>`).join('')}</div>
    </details>`;
    const forecast = data.transitEvent ? `<section class="chart-forecast chart-forecast-complete" aria-label="Completed crossing"><p>Crossing complete</p><div><small>Day</small><strong>${data.day}</strong></div><div><small>Credits</small><strong data-chart-cash>${credits(data.credits)}</strong></div></section>` : travelling && quote ? `
      <div class="chart-route-options" aria-label="Route options">${routes}</div>
      <section class="chart-forecast" aria-label="Route forecast">
        <div class="chart-arrival"><small>Arrival</small><strong data-chart-arrival>Day ${data.day + quote.days}<span>${quote.days}d transit</span></strong></div>
        ${cost}
        <div class="chart-cash${affordable && !data.holdArrears && !data.arrears ? '' : ' chart-warning'}"><small>Cash left</small><strong data-chart-cash>${credits(quote.cashAfterArrival)}</strong></div>
        ${readiness}
        <div class="chart-departure">
          ${data.confirming ? '<span class="chart-confirm-label" role="status">Course locked</span><button type="button" class="chart-cancel" data-overworld-cancel>Cancel</button>' : ''}
          <button type="button" class="primary" data-overworld-travel="${data.selected}"${data.confirming ? ' data-overworld-confirm' : ''}${affordable && !data.departing && !data.transitEvent ? '' : ' disabled'}>${data.departing ? 'Under way' : !affordable ? `Need ${credits(-quote.cashAfterArrival)}` : data.confirming ? data.holding ? 'Confirm hold' : 'Confirm departure' : data.holding ? 'Hold one day' : 'Depart'}</button>
        </div>
      </section>` : `<section class="chart-forecast chart-forecast-idle"><p>Choose a destination on the chart.</p><button type="button" data-chart-hold${data.transitEvent ? ' disabled' : ''}>Hold 1d</button></section>`;

    return `<div class="overworld-page chart-page">
      <div id="chart-viewport" class="chart-viewport" tabindex="0" role="group" aria-label="Halyard chart table. Drag to pan, pinch to zoom. Use arrow keys to pan and Home to recenter.">${markers}</div>
      <div class="chart-heading"><span class="eyebrow">HALYARD / DISPATCH</span><h1>CHART TABLE</h1><p>${data.departing ? 'In transit' : data.transitEvent ? 'Transit report' : 'At railhead'} · ${escapeHtml(current.name)}</p></div>
      <button type="button" class="chart-reset" data-chart-reset aria-label="Recenter chart">Recenter</button>
      <aside class="chart-port-card" aria-label="Selected railhead">
        <h2>${escapeHtml(selected.name)}</h2>
        ${!data.departing && !data.transitEvent ? directory(data) : ''}
        ${!data.departing && !data.transitEvent ? `<details class="chart-strategy">
          <summary>${data.reward?.available ? escapeHtml(data.reward.label) : 'Regional dispatch'}${data.pressure?.active ? ' · disruption' : ''}</summary>
          <div class="chart-strategy-detail">
        ${selected.launchAP ? '<p>Forward staging · +1 AP for the lance in round one.</p>' : ''}
        ${selected.intel ? '<p>Signals post · exact hostile intel on local contracts.</p>' : ''}
        ${selected.repairCap ? '<p>Repair depot · at least 25% off the standard repair rate.</p>' : ''}
        ${data.freight ? `<p>Shared freight today · ${escapeHtml(data.ports.find(port => port.id === data.freight.from).name)} to ${escapeHtml(data.ports.find(port => port.id === data.freight.to).name)} · 20% off base freight.</p>` : ''}
        ${data.reward ? `<p>${data.reward.available ? escapeHtml(data.reward.label) + ' · through Day ' + data.reward.until : data.reward.claimed ? 'Regional bonus claimed' : 'Regional bonus expired by arrival'}</p>` : ''}
        ${data.standing ? `<p>${data.standing >= 6 ? 'Freight partner · 25% base freight discount' : 'Local standing ' + data.standing + ' / 6 for freight discount'}</p>` : ''}
        ${data.pressure?.next && !data.departing ? `<p class="chart-warning">${escapeHtml(data.pressure.next.name)} · counter at ${escapeHtml(data.ports.find(port => port.id === data.pressure.next.port).name)} by Day ${data.pressure.next.until}</p>` : ''}
        ${data.pressure?.active && !data.departing ? `<p class="chart-warning">${escapeHtml(data.pressure.active.name)} active · +${credits(data.pressure.active.cost)} on the affected line through Day ${data.pressure.active.until}</p>` : ''}${data.arrivingContracts < data.contractCount && quote ? `<small class="chart-expiry-warning">${data.contractCount - data.arrivingContracts} expire en route</small>` : ''}
          </div>
        </details>` : ''}
        <div class="chart-port-actions"><button type="button" data-chart-contracts="${selected.id}"${data.transitEvent || data.departing ? ' disabled' : ''}>Contracts ${data.contractCount ?? 1}</button><button type="button" class="chart-services-link" data-port-services="${escapeHtml(selected.id)}" aria-haspopup="dialog" aria-expanded="${!!data.portServices && !data.transitEvent}"${data.transitEvent || data.departing ? ' disabled' : ''}>Services</button></div>
        ${!data.departing&&!data.transitEvent?`<button type="button" class="navigation-quiet chart-ship-upgrades" data-campaign-board>${data.campaign?'Campaign operations':'Directorate campaign'}</button>`:''}
        <button type="button" class="navigation-quiet chart-ship-upgrades" data-page="ship">Train Upgrades</button>
      </aside>
      <div class="chart-course">${forecast}</div>
      ${data.transitEvent ? transitReport(data.transitEvent) : data.portServices ? window.IronVowPortView.render(data.portServices) : ''}
      <div class="chart-load-status" role="status">${data.sceneReady ? '' : 'Preparing chart'}</div>
    </div>`;
  }
  return Object.freeze({ render });
})();
