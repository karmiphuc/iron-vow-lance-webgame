// On-demand mooring services. Business rules and event bindings belong to the career.
window.IronVowPortView = (() => {
  'use strict';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const credits = value => Number.isFinite(value) ? `${Math.round(value).toLocaleString('en-US')} CR` : '—';
  const integrity = value => Number.isFinite(value) ? `${Math.round(Math.max(0, Math.min(100, value)))}%` : '—';

  function services(data) {
    const hulls = data.hulls || [];
    const selected = hulls.find(hull => String(hull.key) === String(data.selectedHull)) || hulls[0];
    const reason = !data.local ? 'Moor here' : !selected ? 'No chassis aboard' : data.repairReason || '';
    const disabled = !data.local || !selected || data.repairDisabled;
    return `<div class="port-services-repair" role="tabpanel" id="port-panel-services" aria-labelledby="port-tab-services">
      <label for="port-hull">Chassis</label>
      <select id="port-hull" data-port-hull ${hulls.length ? '' : 'disabled'}>
        ${hulls.length ? hulls.map(hull => `<option value="${escapeHtml(hull.key)}" ${hull === selected ? 'selected' : ''}>${escapeHtml(hull.name)}</option>`).join('') : '<option>No chassis aboard</option>'}
      </select>
      <dl class="port-services-quote">
        <div><dt>Integrity</dt><dd>${integrity(selected?.condition)}</dd></div>
        <div><dt>Repair quote</dt><dd>${credits(data.repairCost)}</dd></div>
      </dl>
      <button type="button" class="port-services-primary" data-port-repair ${disabled ? 'disabled' : ''} ${reason ? 'aria-describedby="port-repair-reason"' : ''}>Repair</button>
      ${reason ? `<p class="port-services-reason" id="port-repair-reason">${escapeHtml(reason)}</p>` : ''}
    </div>`;
  }

  function market(data) {
    const items = data.items || [];
    const groups = [['weapon', 'Weapons'], ['frame', 'Chassis']];
    return `<div class="port-services-market" role="tabpanel" id="port-panel-market" aria-labelledby="port-tab-market">
      <p class="port-services-rate">${Number.isFinite(data.discountPercent) && data.discountPercent > 0 ? `Local rate · ${escapeHtml(data.discountPercent)}% below carrier` : 'Carrier rate'}</p>
      ${groups.map(([kind, name]) => {
        const stock = items.filter(item => item.kind === kind);
        if (!stock.length) return '';
        return `<section class="port-services-stock" aria-label="${name}"><h3>${name}</h3><ul>
          ${stock.map((item, index) => {
            const disabled = item.owned || item.disabled || !data.local;
            const reason = item.owned ? '' : !data.local ? 'Moor here' : item.reason || '';
            const reasonId = `port-stock-${kind}-${index}-reason`;
            const state = item.owned ? 'owned' : disabled ? 'unavailable' : 'available';
            return `<li data-stock-state="${state}">
              <div class="port-services-item"><b>${escapeHtml(item.name)}</b><span>${credits(item.price)}${item.copies?' · '+item.copies+' owned':''}</span>${reason ? `<small id="${reasonId}">${escapeHtml(reason)}</small>` : ''}</div>
              <button type="button" data-port-buy-${kind === 'frame' ? 'frame' : 'weapon'}="${escapeHtml(item.id)}" ${disabled ? 'disabled' : ''} ${reason ? `aria-describedby="${reasonId}"` : ''} aria-label="${escapeHtml(item.owned ? `${item.name} owned` : disabled ? `${item.name} unavailable` : `Buy ${item.name}`)}">${item.owned ? 'Owned' : disabled ? 'Unavailable' : 'Buy'}</button>
            </li>`;
          }).join('')}
        </ul></section>`;
      }).join('') || '<p class="port-services-empty">No stock listed.</p>'}
    </div>`;
  }

  function render(data) {
    const tab = data.tab === 'market' ? 'market' : 'services';
    const standing = Number.isFinite(data.standing) ? `${data.standing > 0 ? '+' : ''}${data.standing}` : '0';
    return `<aside class="port-services" role="dialog" aria-modal="false" aria-labelledby="port-services-name">
      <div class="port-services-header"><h2 id="port-services-name">${escapeHtml(data.name)}</h2><button type="button" data-port-close aria-label="Close port services">Close</button></div>
      <div class="port-services-tabs" role="tablist" aria-label="Port services">
        <button type="button" role="tab" id="port-tab-services" data-port-tab="services" aria-selected="${tab === 'services'}" aria-controls="port-panel-services">Services</button>
        <button type="button" role="tab" id="port-tab-market" data-port-tab="market" aria-selected="${tab === 'market'}" aria-controls="port-panel-market">Market</button>
      </div>
      <div class="port-services-body">${tab === 'market' ? market(data) : services(data)}<div role="tabpanel" id="port-panel-${tab === 'market' ? 'services' : 'market'}" aria-labelledby="port-tab-${tab === 'market' ? 'services' : 'market'}" hidden></div></div>
      ${data.faction ? `<p class="port-services-standing">${escapeHtml(data.faction)} <span>Standing ${escapeHtml(standing)}</span></p>` : ''}
    </aside>`;
  }
  return { render };
})();
