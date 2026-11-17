window.IronVowOverworldView = (() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const amount = value => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const credits = value => `${Math.round(amount(value)).toLocaleString('en-US')} CR`;
  const coordinate = value => Math.max(0, Math.min(100, amount(value)));

  function routeBetween(routes, from, to) {
    return routes.find(route =>
      (route.from === from && route.to === to) ||
      (route.from === to && route.to === from)
    );
  }

  function findPath(routes, from, to) {
    if (!from || !to) return [];
    if (from === to) return [from];
    const queue = [[from]];
    const visited = new Set([from]);
    while (queue.length) {
      const path = queue.shift();
      const last = path[path.length - 1];
      for (const route of routes) {
        const next = route.from === last ? route.to : route.to === last ? route.from : null;
        if (!next || visited.has(next)) continue;
        const nextPath = [...path, next];
        if (next === to) return nextPath;
        visited.add(next);
        queue.push(nextPath);
      }
    }
    return [];
  }

  function render(data = {}) {
    const ports = Array.isArray(data.ports) ? data.ports : [];
    const routes = Array.isArray(data.routes) ? data.routes : [];
    const currentId = String(data.current ?? '');
    const currentPort = ports.find(port => String(port.id) === currentId) ?? null;
    const selectedPort = ports.find(port => String(port.id) === String(data.selected ?? '')) ?? currentPort ?? ports[0] ?? null;
    const selectedId = selectedPort ? String(selectedPort.id) : '';
    const directRoute = currentPort && selectedPort ? routeBetween(routes, currentId, selectedId) : null;
    const path = findPath(routes, currentId, selectedId);
    const rates = data.rates ?? {};
    const quote = data.quote && typeof data.quote === 'object' ? data.quote : null;
    const cash = amount(data.credits);
    const tripTotal = quote ? amount(quote.total) : 0;
    const samePort = Boolean(currentPort && selectedPort && currentId === selectedId);
    const canTravel = Boolean(!samePort && directRoute && quote && cash >= tripTotal);
    const portById = new Map(ports.map(port => [String(port.id), port]));
    const routeKey = route => [String(route.from), String(route.to)].sort().join('::');
    const plannedRouteKey = directRoute ? routeKey(directRoute) : '';
    const safeSelectedName = selectedPort ? escapeHtml(selectedPort.name) : 'NO PORT SELECTED';
    const statusText = samePort ? 'CURRENT POSITION' : directRoute ? 'DIRECT ROUTE' : path.length > 1
      ? `NO DIRECT ROUTE · ${path.length - 1} LEGS`
      : 'NO CHARTED ROUTE';

    const routesMarkup = routes.map(route => {
      const start = portById.get(String(route.from));
      const end = portById.get(String(route.to));
      if (!start || !end) return '';
      const x1 = coordinate(start.x), y1 = coordinate(start.y);
      const x2 = coordinate(end.x), y2 = coordinate(end.y);
      // The chart keeps a fixed 1.28:1 width-to-height ratio, so routes stay aligned at every viewport size.
      const verticalDelta = (y2 - y1) / 1.28;
      const length = Math.sqrt((x2 - x1) ** 2 + verticalDelta ** 2);
      const angle = Math.atan2(verticalDelta, x2 - x1) * 180 / Math.PI;
      const key = routeKey(route);
      const touchesCurrent = String(route.from) === currentId || String(route.to) === currentId;
      const classes = ['overworld-route'];
      if (touchesCurrent) classes.push('is-connected');
      if (key === plannedRouteKey) classes.push('is-planned');
      const label = `${start.name} to ${end.name}, ${amount(route.days)} day${amount(route.days) === 1 ? '' : 's'}, ${credits(route.fuel)} fuel`;
      return `<span class="${classes.join(' ')}" data-overworld-route="${escapeHtml(key)}" aria-hidden="true" style="left:${x1}%;top:${y1}%;width:${length.toFixed(3)}%;transform:rotate(${angle.toFixed(2)}deg)" title="${escapeHtml(label)}"></span>`;
    }).join('');

    const nodesMarkup = ports.map(port => {
      const id = String(port.id);
      const x = coordinate(port.x), y = coordinate(port.y);
      const isCurrent = id === currentId;
      const isSelected = id === selectedId;
      const isConnected = routes.some(route => String(route.from) === currentId && String(route.to) === id || String(route.to) === currentId && String(route.from) === id);
      const classes = ['overworld-node'];
      if (x <= 22) {
        classes.push('label-east');
        if (y >= 55) classes.push('label-low');
      }
      else if (x >= 78) classes.push('label-west');
      else if (y <= 40) classes.push('label-north');
      else classes.push('label-south');
      if (isCurrent) classes.push('is-current');
      if (isSelected) classes.push('is-selected');
      if (isConnected) classes.push('is-connected');
      const state = [isCurrent ? 'current location' : '', isSelected ? 'selected destination' : '', isConnected ? 'directly connected' : ''].filter(Boolean).join(', ');
      return `<button type="button" class="${classes.join(' ')}" data-overworld-port="${escapeHtml(id)}" style="left:${x}%;top:${y}%" aria-label="${escapeHtml(port.name)}, ${escapeHtml(port.region)}${state ? `, ${escapeHtml(state)}` : ''}"${isCurrent ? ' aria-current="location"' : ''} aria-pressed="${isSelected}">
        <span class="overworld-node__marker" aria-hidden="true"></span>
        <span class="overworld-node__label"><strong>${escapeHtml(port.name)}</strong><small>${escapeHtml(port.region)}${isCurrent ? ' · CURRENT' : ''}${isSelected && !isCurrent ? ' · DESTINATION' : ''}</small></span>
      </button>`;
    }).join('');

    let routeMessage;
    if (samePort) routeMessage = 'Company is already stationed here.';
    else if (directRoute) routeMessage = quote
      ? `${amount(quote.days)} travel day${amount(quote.days) === 1 ? '' : 's'} · ${credits(quote.fuel)} fuel`
      : 'Direct route found. Travel estimate unavailable.';
    else if (path.length > 2) {
      const stops = path.slice(1, -1).map(id => portById.get(id)?.name).filter(Boolean).join(' → ');
      routeMessage = `Travel via ${escapeHtml(stops)} · ${path.length - 1} legs.`;
    } else routeMessage = 'No route is charted from this station.';

    let travelReason = '';
    if (samePort) travelReason = 'Select another port to plot a course.';
    else if (!directRoute) {
      const stops = path.length > 2 ? path.slice(1, -1).map(id => portById.get(id)?.name).filter(Boolean).join(' → ') : '';
      travelReason = path.length > 1
        ? `Choose a connected port first · ${stops ? `via ${escapeHtml(stops)}` : `${path.length - 1} legs required`}.`
        : 'No charted route to this port.';
    }
    else if (!quote) travelReason = 'Travel estimate unavailable.';
    else if (!canTravel) travelReason = `SHORTFALL · ${credits(tripTotal - cash)} MORE REQUIRED`;

    const expense = data.lastExpense;
    let expenseMarkup = '';
    if (expense && typeof expense === 'object' && Number.isFinite(Number(expense.total))) {
      const expenseLabel = expense.kind === 'travel' ? 'LAST TRAVEL COST' : 'LAST OPERATING COST';
      const recovered = amount(expense.paid);
      const overdue = amount(expense.arrearsPaid);
      expenseMarkup = `<div class="overworld-expense"><span>${expenseLabel}${expense.day ? ` · DAY ${escapeHtml(expense.day)}` : ''}</span><b>${credits(expense.total)}</b>${overdue ? `<small>${credits(recovered)} paid · ${credits(overdue)} arrears settled</small>` : ''}</div>`;
    } else if (expense !== null && expense !== undefined && Number.isFinite(Number(expense))) {
      expenseMarkup = `<div class="overworld-expense"><span>LAST OPERATING COST</span><b>${credits(expense)}</b></div>`;
    }
    const arrearsMarkup = amount(data.arrears) > 0
      ? `<div class="is-arrears has-arrears"><span>OVERDUE ARREARS</span><b>${credits(data.arrears)}</b></div>`
      : '';

    const contractMarkup = data.contract
      ? `<div class="overworld-contract"><div><span class="eyebrow">SELECTED CONTRACT</span><strong>${escapeHtml(data.contract)}</strong></div>${data.payment ? `<div class="overworld-payment"><small>GROSS PAYMENT</small><b>${escapeHtml(data.payment)}</b></div>` : ''}</div>`
      : '';
    const quoteMarkup = quote && directRoute ? `
      <section class="overworld-breakdown" aria-label="Travel cost breakdown">
        <div class="overworld-section-heading"><span class="eyebrow">TRAVEL ESTIMATE</span><b>${amount(quote.days)} DAY${amount(quote.days) === 1 ? '' : 'S'}</b></div>
        <dl>
          <div><dt>Fuel</dt><dd>${credits(quote.fuel)}</dd></div>
          <div><dt>Crew wages</dt><dd>${credits(quote.wages)}</dd></div>
          <div><dt>Ship systems</dt><dd>${credits(quote.ship)}</dd></div>
          <div><dt>Hull upkeep</dt><dd>${credits(quote.hulls)}</dd></div>
          <div class="is-total"><dt>TRAVEL TOTAL</dt><dd>${credits(quote.total)}</dd></div>
        </dl>
      </section>` : '';

    const boardButton = '<button type="button" class="overworld-board-button" data-page="contracts"><span>CONTRACT BOARD</span><small>Review available contracts</small></button>';

    return `<div class="page overworld-page">
      <div class="pagehead overworld-head">
        <div><div class="eyebrow">OPERATIONS / COMPANY ROUTES</div><h1>STAR MAP.</h1></div>
        <div class="overworld-head-status"><span>STATIONED AT</span><strong>${currentPort ? escapeHtml(currentPort.name) : 'LOCATION UNKNOWN'}</strong><small>${currentPort ? escapeHtml(currentPort.region) : 'Select a port to continue'}</small></div>
      </div>
      <div class="overworld-layout">
        <section class="overworld-map-panel" aria-label="Sector star map">
          <div class="overworld-map-heading"><div><span class="eyebrow">REGIONAL CHART</span><h2>PORT NETWORK</h2></div><span class="overworld-route-count">${ports.length} PORTS <i></i> ${routes.length} ROUTES</span></div>
          <div class="overworld-map" aria-label="Port locations and direct routes">
            ${routesMarkup}
            ${nodesMarkup}
            ${ports.length ? '' : '<div class="overworld-empty">SECTOR DATA UNAVAILABLE</div>'}
          </div>
          <div class="overworld-legend" aria-label="Map key"><span><i class="is-current"></i> CURRENT</span><span><i class="is-selected"></i> SELECTED</span><span><i class="is-connected"></i> CONNECTED</span></div>
        </section>
        <aside class="overworld-detail-panel" aria-label="Selected port and company costs">
          <section class="overworld-destination">
            <div class="overworld-destination-meta"><span class="eyebrow">${samePort ? 'CURRENT STATION' : 'SELECTED DESTINATION'}</span><span class="overworld-route-status ${directRoute ? 'is-direct' : ''}">${statusText}</span></div>
            <h2>${safeSelectedName}</h2>
            <p>${selectedPort ? escapeHtml(selectedPort.region) : 'No destination data available'}</p>
            <div class="overworld-route-copy">${routeMessage}</div>
            ${contractMarkup}
          </section>
          ${quoteMarkup}
          <div class="overworld-actions">
            <button type="button" class="primary overworld-travel" data-overworld-travel="${escapeHtml(selectedId)}"${canTravel ? '' : ' disabled'}>${samePort ? 'CURRENT STATION' : `TRAVEL TO ${safeSelectedName}`}</button>
            ${travelReason ? `<p class="overworld-travel-note" role="status">${escapeHtml(travelReason)}</p>` : ''}
            <div class="overworld-board-actions">${boardButton}</div>
          </div>
          <section class="overworld-breakdown overworld-operating" aria-label="Daily operating costs">
            <div class="overworld-section-heading"><span class="eyebrow">OPERATING COST / DAY</span><b>${credits(rates.total)}</b></div>
            <dl>
              <div><dt>Crew wages</dt><dd>${credits(rates.wages)}</dd></div>
              <div><dt>Ship systems</dt><dd>${credits(rates.ship)}</dd></div>
              <div><dt>Hull upkeep</dt><dd>${credits(rates.hulls)}</dd></div>
            </dl>
          </section>
          <section class="overworld-finance" aria-label="Company funds">
            <div><span>AVAILABLE CREDITS</span><b>${credits(cash)}</b></div>
            ${arrearsMarkup}
            ${expenseMarkup}
          </section>
        </aside>
      </div>
    </div>`;
  }

  return Object.freeze({ render });
})();
