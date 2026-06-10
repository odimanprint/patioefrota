const FROTA_API = '/api/frota';

let frotaVehicles = [];
let selectedFrotaVehicleId = null;
let plateLookupTimer = null;
let lastLookupPlate = '';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function normalizePlateInput(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
}

function formatPlateForDisplay(value) {
  return normalizePlateInput(value);
}

function getVehicleDisplayPlate(vehicle) {
  return formatPlateForDisplay(vehicle?.patioVehicle?.plate || vehicle?.plate);
}

function getVehicleIdentityLabel(vehicle) {
  const plate = normalizePlateInput(vehicle?.patioVehicle?.plate || vehicle?.plate);
  if (plate) return formatPlateForDisplay(plate);
  const chassis = String(vehicle?.chassis || vehicle?.patioVehicle?.chassis || '').trim();
  return chassis ? `Chassi ${chassis}` : 'Sem placa';
}

function formatChassisCardValue(value) {
  const chassis = String(value || '').trim();
  if (!chassis) return 'Não informado';
  return chassis.length > 6 ? chassis.slice(-6) : chassis;
}

function renderVehicleIdentity(vehicle, title = '') {
  const plate = normalizePlateInput(vehicle?.patioVehicle?.plate || vehicle?.plate);
  if (plate) {
    return renderFrotaPlate(plate, title || plate);
  }
  const chassis = String(vehicle?.chassis || vehicle?.patioVehicle?.chassis || '').trim();
  return renderFrotaPlate('', chassis ? `Chassi ${chassis}` : 'Sem placa', { forceMercosul: true });
}

function getPlateType(plate) {
  const cleanPlate = normalizePlateInput(plate);
  if (/^[A-Z]{3}\d{4}$/.test(cleanPlate)) return 'vermelha';
  return 'mercosul';
}

function renderFrotaPlate(plate, title = '', { forceMercosul = false } = {}) {
  const displayPlate = formatPlateForDisplay(plate);
  const cssClass = forceMercosul ? 'placa-mercosul' : (getPlateType(plate) === 'vermelha' ? 'placa-vermelha' : 'placa-mercosul');
  const safeTitle = title ? ` title="${escapeHtml(title)}"` : '';
  const plateText = displayPlate ? escapeHtml(displayPlate) : '&nbsp;';
  return `<span class="placa-container ${cssClass}"${safeTitle}><span class="placa-texto">${plateText}</span></span>`;
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('pt-BR');
}

function showToast(message, tone = 'primary') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${tone} border-0`;
  toast.role = 'status';
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  container.appendChild(toast);
  const instance = bootstrap.Toast.getOrCreateInstance(toast, { delay: 3600 });
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
  instance.show();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function updateMetrics() {
  document.getElementById('metricTotal').textContent = frotaVehicles.length;
  document.getElementById('metricOpen').textContent = frotaVehicles.filter(vehicle => vehicle.status !== 'pronto').length;
  document.getElementById('metricReady').textContent = frotaVehicles.filter(vehicle => vehicle.status === 'pronto').length;
  const openVehicles = frotaVehicles.filter(vehicle => vehicle.status !== 'pronto');
  const oldest = openVehicles
    .map(vehicle => ({ vehicle, days: getPreparationDays(vehicle) }))
    .sort((left, right) => right.days - left.days)[0];
  document.getElementById('metricOldestDays').textContent = oldest ? `${oldest.days} dias` : '0 dias';
  document.getElementById('metricOldestPlate').textContent = oldest ? getVehicleIdentityLabel(oldest.vehicle) : '-';
}

function buildUpdatesList() {
  return frotaVehicles
    .flatMap(vehicle => (vehicle.logs || []).map(log => ({ ...log, vehicle })))
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
    .slice(0, 6);
}

function renderUpdates() {
  const updates = buildUpdatesList();
  const grid = document.getElementById('frotaUpdatesGrid');
  if (!grid) return;
  grid.innerHTML = updates.length ? updates.map(update => {
    const plate = getVehicleIdentityLabel(update.vehicle);
    const user = update.username || 'sistema';
    return `
      <article class="update-card">
        <p><strong>${escapeHtml(plate)}</strong> ${escapeHtml(update.action || 'Atualização registrada')}</p>
        <small>${escapeHtml(user)} · ${escapeHtml(formatDateTime(update.createdAt))}</small>
      </article>
    `;
  }).join('') : '<div class="empty-state py-3">Nenhuma atualização registrada.</div>';
}

function getPreparationDays(vehicle) {
  const createdAt = vehicle?.createdAt ? new Date(vehicle.createdAt) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) return 0;
  return Math.max(1, Math.ceil((Date.now() - createdAt.getTime()) / 86400000));
}

function getAreaShortLabel(area) {
  const slug = String(area?.slug || '').toLowerCase();
  if (slug.includes('document')) return 'DOC';
  if (slug.includes('licenc')) return 'LIC';
  if (slug.includes('manut')) return 'MAN';
  if (slug.includes('rast')) return 'RAS';
  return String(area?.name || '---').slice(0, 3).toUpperCase();
}

function getAreaChipClass(area) {
  if (area.status === 'concluido') return 'done';
  if (area.completed > 0) return 'progress';
  return 'pending';
}

function getVehicleFullChassis(vehicle) {
  return String(vehicle?.chassis || vehicle?.patioVehicle?.chassis || '').trim();
}

function getPreparationStageLabel(vehicle) {
  if (vehicle?.status === 'pronto') return 'Pronto para operar';
  const areas = vehicle?.areas || [];
  const currentArea = areas.find(area => Number(area.total || 0) > Number(area.completed || 0));
  if (currentArea) return `${currentArea.name}: ${currentArea.completed}/${currentArea.total}`;
  return `${vehicle?.completedItems || 0}/${vehicle?.totalItems || 0} itens concluídos`;
}

function getNextPendingLabel(vehicle) {
  for (const area of vehicle?.areas || []) {
    const pending = (area.items || []).find(item => !item.completed);
    if (pending) return `${area.name} - ${pending.templateName}`;
  }
  return 'Checklist concluído';
}

function renderInfoCard(label, value) {
  return `
    <div class="checklist-window-card">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(value || 'Não informado')}</strong>
    </div>
  `;
}

function renderChecklistAreas(vehicle, { editable = true } = {}) {
  const areas = vehicle?.areas || [];
  return areas.length ? areas.map(area => `
    <div class="area-block">
      <div class="area-header">
        <div>
          <strong>${escapeHtml(area.name)}</strong>
          <div class="small text-muted">${area.completed}/${area.total} item(ns)</div>
        </div>
        <span class="badge ${area.status === 'concluido' ? 'text-bg-success' : area.status === 'andamento' ? 'text-bg-warning' : 'text-bg-secondary'}">${escapeHtml(area.status)}</span>
      </div>
      ${(area.items || []).map(item => `
        <div class="check-row" data-item-id="${escapeHtml(item.id)}">
          <label class="form-check d-flex align-items-center gap-2 mb-0">
            <input class="form-check-input frota-item-check" type="checkbox" ${item.completed ? 'checked' : ''} ${editable ? '' : 'disabled'}>
            <span>
              <strong>${escapeHtml(item.templateName)}</strong>
              ${item.completedBy ? `<span class="d-block small text-muted">Concluído por ${escapeHtml(item.completedBy)} ${item.completedAt ? `em ${escapeHtml(formatDateTime(item.completedAt))}` : ''}</span>` : ''}
            </span>
          </label>
          <input class="form-control form-control-sm frota-item-observation" value="${escapeHtml(item.observation || '')}" placeholder="Observação" ${editable ? '' : 'disabled'}>
          ${editable ? '<button class="btn btn-sm btn-outline-primary frota-save-item" title="Salvar item"><i class="bi bi-check2"></i></button>' : ''}
        </div>
      `).join('')}
    </div>
  `).join('') : '<div class="empty-state">Checklist ainda não criado para este veículo.</div>';
}

function renderVehicleRows() {
  const query = String(document.getElementById('frotaSearch').value || '').trim().toUpperCase();
  const grid = document.getElementById('frotaVehiclesTable');
  const filteredVehicles = frotaVehicles
    .filter(vehicle => {
      const patio = vehicle.patioVehicle || {};
      return [
        vehicle.plate,
        vehicle.fleetNumber,
        vehicle.model,
        vehicle.chassis,
        vehicle.invoiceNumber,
        patio.yard,
        patio.status
      ].filter(Boolean).join(' ').toUpperCase().includes(query);
    });
  const columnCount = Math.min(6, Math.max(1, filteredVehicles.length));
  grid.style.setProperty('--frota-grid-columns', String(columnCount));
  grid.classList.toggle('dense', columnCount >= 5);
  grid.classList.toggle('ultra-dense', false);

  const cards = filteredVehicles
    .map(vehicle => {
      const active = String(vehicle.id) === String(selectedFrotaVehicleId) ? 'active' : '';
      const ready = vehicle.status === 'pronto';
      const statusLabel = ready ? 'Pronto' : 'Em preparação';
      const rawPlate = normalizePlateInput(vehicle.plate);
      const days = getPreparationDays(vehicle);
      const dayIcon = ready ? 'check2' : 'stopwatch';
      const dayClass = !ready && days >= 7 ? 'late' : '';
      const fleetLabel = vehicle.fleetNumber ? `Frota ${vehicle.fleetNumber}` : (vehicle.model || vehicle.patioVehicle?.type || 'Preparação');
      const patio = vehicle.patioVehicle || {};
      const fullChassis = getVehicleFullChassis(vehicle);
      const chassis = formatChassisCardValue(fullChassis);
      const renavam = vehicle.renavam || 'Não informado';
      const invoiceNumber = vehicle.invoiceNumber || 'Não informado';
      const stageLabel = getPreparationStageLabel(vehicle);
      const nextPending = getNextPendingLabel(vehicle);
      const modelLabel = vehicle.model || patio.type || 'Não informado';
      const patioLabel = patio.yard || 'Não informado';
      const patioStatus = patio.status || 'Não informado';
      const areaChips = (vehicle.areas || []).map(area => `
        <span class="prep-area-chip ${getAreaChipClass(area)}">${escapeHtml(getAreaShortLabel(area))} ${area.completed}/${area.total}</span>
      `).join('');
      return `
        <article class="prep-vehicle-card vehicle-card ${active} ${ready ? 'ready' : ''}" data-id="${escapeHtml(vehicle.id)}">
          <div class="prep-card-hero">
            <div class="prep-card-topline">
              <span class="prep-pill ${dayClass}"><i class="bi bi-${dayIcon}"></i>${days} dias</span>
              <span class="prep-pill status">${escapeHtml(statusLabel)}</span>
            </div>
            <div class="prep-card-main">
              <div class="prep-fleet-number">${escapeHtml(fleetLabel)}</div>
              ${renderVehicleIdentity(vehicle, rawPlate ? `Cadastro: ${rawPlate}` : '')}
            </div>
            <div class="prep-card-truck">
              <span class="prep-card-wheel one"></span>
              <span class="prep-card-wheel two"></span>
              <span class="prep-card-wheel three"></span>
            </div>
          </div>
          <div class="prep-card-body">
            <div class="prep-stage-summary">
              <small>Estágio da preparação</small>
              <strong>${escapeHtml(stageLabel)}</strong>
            </div>
            <div class="prep-meta-row"><span>Próximo</span><strong title="${escapeHtml(nextPending)}">${escapeHtml(nextPending)}</strong></div>
            <div class="prep-meta-row"><span>Modelo</span><strong title="${escapeHtml(modelLabel)}">${escapeHtml(modelLabel)}</strong></div>
            <div class="prep-meta-row"><span>Frota</span><strong>${escapeHtml(vehicle.fleetNumber || 'Não informado')}</strong></div>
            <div class="prep-meta-row"><span>Chassi</span><strong title="${escapeHtml(fullChassis || 'Não informado')}">${escapeHtml(chassis)}</strong></div>
            <div class="prep-meta-row"><span>RENAVAM</span><strong>${escapeHtml(renavam)}</strong></div>
            <div class="prep-meta-row"><span>NF</span><strong>${escapeHtml(invoiceNumber)}</strong></div>
            <div class="prep-meta-row"><span>Pátio</span><strong title="${escapeHtml(patioLabel)}">${escapeHtml(patioLabel)}</strong></div>
            <div class="prep-meta-row"><span>Status</span><strong title="${escapeHtml(patioStatus)}">${escapeHtml(patioStatus)}</strong></div>
            <div class="prep-progress-row">
              <div class="prep-progress-track"><div class="prep-progress-fill" style="width: ${vehicle.progress || 0}%"></div></div>
              <span class="prep-progress-value">${vehicle.progress || 0}%</span>
            </div>
            <div class="prep-area-chips">${areaChips}</div>
            <div class="prep-card-actions">
              <button type="button" class="prep-open-button prep-open-checklist">Abrir checklist →</button>
              <button type="button" class="prep-icon-action prep-edit-card" title="Editar veículo"><i class="bi bi-pencil"></i></button>
              <button type="button" class="prep-icon-action danger prep-delete-card" title="Excluir veículo"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </article>
      `;
    }).join('');

  grid.innerHTML = cards || `
    <div class="empty-state">Nenhum veículo encontrado.</div>
  `;
}

function renderDetails(vehicle) {
  if (!vehicle) {
    document.getElementById('frotaDetails').innerHTML = `
      <div class="empty-state">
        <i class="bi bi-clipboard2-check fs-1 d-block mb-2"></i>
        Selecione um veículo para acompanhar a preparação.
      </div>
    `;
    return;
  }

  const patio = vehicle.patioVehicle || {};
  const rawPlate = normalizePlateInput(vehicle.plate);
  const areasHtml = (vehicle.areas || []).map(area => `
    <div class="area-block">
      <div class="area-header">
        <div>
          <strong>${escapeHtml(area.name)}</strong>
          <div class="small text-muted">${area.completed}/${area.total} item(ns)</div>
        </div>
        <span class="badge ${area.status === 'concluido' ? 'text-bg-success' : area.status === 'andamento' ? 'text-bg-warning' : 'text-bg-secondary'}">${escapeHtml(area.status)}</span>
      </div>
      ${(area.items || []).map(item => `
        <div class="check-row" data-item-id="${escapeHtml(item.id)}">
          <label class="form-check d-flex align-items-center gap-2 mb-0">
            <input class="form-check-input frota-item-check" type="checkbox" ${item.completed ? 'checked' : ''}>
            <span>
              <strong>${escapeHtml(item.templateName)}</strong>
              ${item.completedBy ? `<span class="d-block small text-muted">Concluído por ${escapeHtml(item.completedBy)} ${item.completedAt ? `em ${escapeHtml(formatDateTime(item.completedAt))}` : ''}</span>` : ''}
            </span>
          </label>
          <input class="form-control form-control-sm frota-item-observation" value="${escapeHtml(item.observation || '')}" placeholder="Observação">
          <button class="btn btn-sm btn-outline-primary frota-save-item" title="Salvar item"><i class="bi bi-check2"></i></button>
        </div>
      `).join('')}
    </div>
  `).join('');

  const logsHtml = (vehicle.logs || []).slice(0, 8).map(log => `
    <li class="list-group-item d-flex justify-content-between gap-3">
      <span>${escapeHtml(log.action)}</span>
      <small class="text-muted text-nowrap">${escapeHtml(formatDateTime(log.createdAt))}</small>
    </li>
  `).join('');

  document.getElementById('frotaDetails').innerHTML = `
    <div class="p-3 border-bottom d-flex align-items-start justify-content-between gap-3 flex-wrap">
      <div>
        <div class="d-flex align-items-center gap-2 flex-wrap">
          ${renderVehicleIdentity(vehicle, rawPlate ? `Cadastro: ${rawPlate}` : '')}
          <span class="badge ${vehicle.status === 'pronto' ? 'text-bg-success' : 'text-bg-warning'}">${vehicle.status === 'pronto' ? 'Pronto' : 'Em preparação'}</span>
        </div>
        <div class="small text-muted mt-2">
          ${escapeHtml(vehicle.model || patio.type || 'Modelo não informado')}
          ${vehicle.chassis || patio.chassis ? ` • Chassi ${escapeHtml(vehicle.chassis || patio.chassis)}` : ''}
          ${vehicle.invoiceNumber ? ` • NF ${escapeHtml(vehicle.invoiceNumber)}` : ''}
          ${patio.yard ? ` • ${escapeHtml(patio.yard)}` : ''}
        </div>
      </div>
      <div class="text-end" style="min-width: 210px">
        <div class="d-flex justify-content-end gap-2 mb-2">
          <button class="btn btn-sm btn-outline-primary frota-edit-vehicle" data-vehicle-id="${escapeHtml(vehicle.id)}" title="Editar veículo"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger frota-delete-vehicle" data-vehicle-id="${escapeHtml(vehicle.id)}" title="Excluir veículo"><i class="bi bi-trash"></i></button>
        </div>
        <strong class="fs-4">${vehicle.progress || 0}%</strong>
        <div class="progress mt-1" style="height: 8px"><div class="progress-bar ${vehicle.status === 'pronto' ? 'bg-success' : ''}" style="width: ${vehicle.progress || 0}%"></div></div>
      </div>
    </div>
    ${areasHtml || '<div class="empty-state">Checklist ainda não criado para este veículo.</div>'}
    <div class="p-3 border-top">
      <h2 class="h6 mb-2"><i class="bi bi-clock-history me-1"></i>Histórico</h2>
      <ul class="list-group list-group-flush">${logsHtml || '<li class="list-group-item text-muted">Sem histórico.</li>'}</ul>
    </div>
  `;
}

function renderChecklistWindow(vehicle) {
  const container = document.getElementById('frotaChecklistWindow');
  if (!container) return;
  if (!vehicle) {
    container.innerHTML = '<div class="empty-state py-3">Selecione um veículo para abrir o checklist.</div>';
    return;
  }

  const patio = vehicle.patioVehicle || {};
  const fullChassis = getVehicleFullChassis(vehicle);
  const statusLabel = vehicle.status === 'pronto' ? 'Pronto para operar' : 'Em preparação';
  const logsHtml = (vehicle.logs || []).slice(0, 10).map(log => `
    <li class="list-group-item d-flex justify-content-between gap-3">
      <span>${escapeHtml(log.action)}</span>
      <small class="text-muted text-nowrap">${escapeHtml(formatDateTime(log.createdAt))}</small>
    </li>
  `).join('');

  document.getElementById('frotaChecklistTitle').textContent = `Checklist ${getVehicleIdentityLabel(vehicle)}`;
  container.innerHTML = `
    <div class="d-flex align-items-center justify-content-between gap-3 flex-wrap mb-3">
      <div>
        <div class="d-flex align-items-center gap-2 flex-wrap">
          ${renderVehicleIdentity(vehicle)}
          <span class="badge ${vehicle.status === 'pronto' ? 'text-bg-success' : 'text-bg-warning'}">${escapeHtml(statusLabel)}</span>
        </div>
        <div class="small text-muted mt-2">${escapeHtml(getPreparationStageLabel(vehicle))} • Próximo: ${escapeHtml(getNextPendingLabel(vehicle))}</div>
      </div>
      <div class="text-end" style="min-width: 220px">
        <strong class="fs-4">${vehicle.progress || 0}%</strong>
        <div class="progress mt-1" style="height: 8px"><div class="progress-bar ${vehicle.status === 'pronto' ? 'bg-success' : ''}" style="width: ${vehicle.progress || 0}%"></div></div>
        <small class="text-muted">${vehicle.completedItems || 0}/${vehicle.totalItems || 0} itens concluídos</small>
      </div>
    </div>
    <div class="checklist-window-grid">
      ${renderInfoCard('Placa', getVehicleDisplayPlate(vehicle) || vehicle.plate || patio.plate || 'Sem placa')}
      ${renderInfoCard('Frota', vehicle.fleetNumber)}
      ${renderInfoCard('Modelo', vehicle.model || patio.type)}
      ${renderInfoCard('Chassi', fullChassis)}
      ${renderInfoCard('RENAVAM', vehicle.renavam)}
      ${renderInfoCard('Nota fiscal', vehicle.invoiceNumber)}
      ${renderInfoCard('Data de compra', vehicle.purchaseDate ? String(vehicle.purchaseDate).slice(0, 10) : '')}
      ${renderInfoCard('Pátio', patio.yard)}
      ${renderInfoCard('Status do pátio', patio.status)}
      ${renderInfoCard('Base', patio.base)}
      ${renderInfoCard('Destino', patio.baseDestino)}
      ${renderInfoCard('Atualizado por', vehicle.updatedBy)}
      ${renderInfoCard('Criado em', formatDateTime(vehicle.createdAt))}
      ${renderInfoCard('Atualizado em', formatDateTime(vehicle.updatedAt))}
      ${renderInfoCard('Observações', vehicle.notes)}
    </div>
    <div class="mb-3">
      <h3 class="h6 mb-2"><i class="bi bi-list-check me-1"></i>Checklist de preparação</h3>
      <div class="panel overflow-hidden">${renderChecklistAreas(vehicle, { editable: true })}</div>
    </div>
    <div>
      <h3 class="h6 mb-2"><i class="bi bi-clock-history me-1"></i>Histórico</h3>
      <ul class="list-group list-group-flush">${logsHtml || '<li class="list-group-item text-muted">Sem histórico.</li>'}</ul>
    </div>
  `;
}

function openChecklistWindow(vehicle) {
  if (!vehicle) return;
  selectedFrotaVehicleId = vehicle.id;
  renderChecklistWindow(vehicle);
  bootstrap.Modal.getOrCreateInstance(document.getElementById('frotaChecklistModal')).show();
}

async function loadFrotaData({ keepSelection = true } = {}) {
  frotaVehicles = await fetchJson(`${FROTA_API}/vehicles`);
  if (!keepSelection || !frotaVehicles.some(vehicle => String(vehicle.id) === String(selectedFrotaVehicleId))) {
    selectedFrotaVehicleId = frotaVehicles[0]?.id || null;
  }
  updateMetrics();
  renderUpdates();
  renderVehicleRows();
  renderDetails(frotaVehicles.find(vehicle => String(vehicle.id) === String(selectedFrotaVehicleId)));
}

function getVehicleTypeLabel(source) {
  return String(source?.type || source?.model || source?.vehicleType || '').trim();
}

async function lookupPlate({ silent = false } = {}) {
  const plateField = document.getElementById('frotaPlate');
  const chassisField = document.getElementById('frotaChassis');
  const plate = normalizePlateInput(plateField.value);
  const chassis = String(chassisField.value || '').trim();
  plateField.value = plate;
  if (!plate && !chassis) {
    if (!silent) showToast('Informe uma placa ou chassi para consultar.', 'warning');
    return;
  }

  const params = new URLSearchParams();
  if (plate) params.set('plate', plate);
  if (chassis) params.set('chassis', chassis);
  const data = await fetchJson(`${FROTA_API}/lookup?${params.toString()}`);
  const hint = document.getElementById('lookupHint');
  if (data.existingPreparation) {
    hint.textContent = 'Este veículo já está no módulo de Preparação de Frota.';
    if (!silent) showToast('Veículo já cadastrado na preparação.', 'warning');
    return;
  }

  const source = data.catalogVehicle || data.patioVehicle || {};
  const vehicleType = getVehicleTypeLabel(source);
  if (source.sourceId) document.getElementById('frotaFleetNumber').value = source.sourceId;
  if (vehicleType) document.getElementById('frotaModel').value = vehicleType;
  if (source.chassis) document.getElementById('frotaChassis').value = source.chassis;
  if (source.renavam) document.getElementById('frotaRenavam').value = source.renavam;
  hint.textContent = data.patioVehicle
    ? `Vínculo encontrado no pátio: ${data.patioVehicle.yard || 'pátio não informado'} / ${data.patioVehicle.status || 'status não informado'}${vehicleType ? ` / tipo: ${vehicleType}` : ''}.`
    : data.catalogVehicle ? `Dados encontrados no catálogo mestre${vehicleType ? ` / tipo: ${vehicleType}` : ''}.` : 'Nenhum vínculo encontrado; o cadastro será criado com os dados preenchidos.';
}

function schedulePlateLookup() {
  const plate = normalizePlateInput(document.getElementById('frotaPlate').value);
  clearTimeout(plateLookupTimer);
  if (plate.length < 7) {
    document.getElementById('lookupHint').textContent = '';
    lastLookupPlate = '';
    return;
  }
  plateLookupTimer = setTimeout(async () => {
    if (plate === lastLookupPlate) return;
    lastLookupPlate = plate;
    try {
      await lookupPlate({ silent: true });
    } catch (error) {
      document.getElementById('lookupHint').textContent = error.message || 'Não foi possível consultar a placa.';
    }
  }, 450);
}

function scheduleChassisLookup() {
  const chassis = String(document.getElementById('frotaChassis').value || '').trim();
  const plate = normalizePlateInput(document.getElementById('frotaPlate').value);
  clearTimeout(plateLookupTimer);
  if (plate || chassis.length < 6) {
    if (!plate && chassis.length < 6) document.getElementById('lookupHint').textContent = '';
    return;
  }
  plateLookupTimer = setTimeout(async () => {
    try {
      await lookupPlate({ silent: true });
    } catch (error) {
      document.getElementById('lookupHint').textContent = error.message || 'Não foi possível consultar o chassi.';
    }
  }, 450);
}

async function saveVehicle(event) {
  event.preventDefault();
  const payload = {
    plate: normalizePlateInput(document.getElementById('frotaPlate').value),
    fleetNumber: document.getElementById('frotaFleetNumber').value,
    model: document.getElementById('frotaModel').value,
    chassis: document.getElementById('frotaChassis').value,
    renavam: document.getElementById('frotaRenavam').value,
    invoiceNumber: document.getElementById('frotaInvoiceNumber').value,
    notes: document.getElementById('frotaNotes').value
  };
  if (!payload.plate && !String(payload.chassis || '').trim()) {
    showToast('Informe placa ou chassi para incluir o veículo.', 'warning');
    return;
  }

  const result = await fetchJson(`${FROTA_API}/vehicles`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  selectedFrotaVehicleId = result.vehicle?.id || selectedFrotaVehicleId;
  document.getElementById('frotaVehicleForm').reset();
  document.getElementById('lookupHint').textContent = '';
  await loadFrotaData();
  showToast('Veículo incluído na preparação de frota.', 'success');
}

async function saveItem(row) {
  const itemId = row.dataset.itemId;
  const completed = row.querySelector('.frota-item-check').checked;
  const observation = row.querySelector('.frota-item-observation').value;
  const result = await fetchJson(`${FROTA_API}/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ completed, observation })
  });
  const updatedVehicle = result.vehicle;
  frotaVehicles = frotaVehicles.map(vehicle => String(vehicle.id) === String(updatedVehicle.id) ? updatedVehicle : vehicle);
  selectedFrotaVehicleId = updatedVehicle.id;
  updateMetrics();
  renderUpdates();
  renderVehicleRows();
  renderDetails(updatedVehicle);
  if (document.getElementById('frotaChecklistModal')?.classList.contains('show')) {
    renderChecklistWindow(updatedVehicle);
  }
  showToast('Item salvo.', 'success');
}

function getSelectedVehicle() {
  return frotaVehicles.find(vehicle => String(vehicle.id) === String(selectedFrotaVehicleId)) || null;
}

function selectVehicle(vehicleId, { scrollToDetails = false } = {}) {
  selectedFrotaVehicleId = vehicleId;
  renderVehicleRows();
  renderDetails(getSelectedVehicle());
  if (scrollToDetails) {
    document.getElementById('frotaDetails')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function openEditVehicleModal(vehicle) {
  if (!vehicle) return;
  document.getElementById('frotaEditId').value = vehicle.id;
  document.getElementById('frotaEditTitle').textContent = `Editar veículo ${getVehicleIdentityLabel(vehicle)}`;
  document.getElementById('frotaEditPlate').value = vehicle.plate || '';
  document.getElementById('frotaEditFleetNumber').value = vehicle.fleetNumber || '';
  document.getElementById('frotaEditModel').value = vehicle.model || vehicle.patioVehicle?.type || '';
  document.getElementById('frotaEditChassis').value = vehicle.chassis || vehicle.patioVehicle?.chassis || '';
  document.getElementById('frotaEditRenavam').value = vehicle.renavam || '';
  document.getElementById('frotaEditInvoiceNumber').value = vehicle.invoiceNumber || '';
  document.getElementById('frotaEditPurchaseDate').value = vehicle.purchaseDate ? String(vehicle.purchaseDate).slice(0, 10) : '';
  document.getElementById('frotaEditNotes').value = vehicle.notes || '';
  renderEditChecklist(vehicle);
  bootstrap.Modal.getOrCreateInstance(document.getElementById('frotaEditModal')).show();
}

function renderEditChecklist(vehicle) {
  const container = document.getElementById('frotaEditChecklist');
  if (!container) return;
  const areas = vehicle?.areas || [];
  container.innerHTML = areas.length ? areas.map(area => `
    <div class="edit-checklist-area">
      <div class="edit-checklist-area-title">
        <span>${escapeHtml(area.name)}</span>
        <small class="text-muted">${area.completed}/${area.total}</small>
      </div>
      ${(area.items || []).map(item => `
        <div class="edit-checklist-row" data-edit-item-id="${escapeHtml(item.id)}">
          <label class="form-check d-flex align-items-center gap-2 mb-0">
            <input class="form-check-input frota-edit-item-check" type="checkbox" ${item.completed ? 'checked' : ''}>
            <span>
              <strong>${escapeHtml(item.templateName)}</strong>
              ${item.completedBy ? `<span class="d-block small text-muted">ConcluÃ­do por ${escapeHtml(item.completedBy)} ${item.completedAt ? `em ${escapeHtml(formatDateTime(item.completedAt))}` : ''}</span>` : ''}
            </span>
          </label>
          <input class="form-control form-control-sm frota-edit-item-observation" value="${escapeHtml(item.observation || '')}" placeholder="ObservaÃ§Ã£o">
        </div>
      `).join('')}
    </div>
  `).join('') : '<div class="empty-state py-3">Checklist ainda não criado para este veículo.</div>';
}

function collectEditChecklistItems() {
  return Array.from(document.querySelectorAll('#frotaEditChecklist [data-edit-item-id]')).map(row => ({
    id: row.dataset.editItemId,
    completed: row.querySelector('.frota-edit-item-check')?.checked || false,
    observation: row.querySelector('.frota-edit-item-observation')?.value || ''
  }));
}

async function saveEditedVehicle(event) {
  event.preventDefault();
  const id = document.getElementById('frotaEditId').value;
  const submittedPlate = normalizePlateInput(document.getElementById('frotaEditPlate').value);
  const result = await fetchJson(`${FROTA_API}/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      plate: submittedPlate,
      fleetNumber: document.getElementById('frotaEditFleetNumber').value,
      model: document.getElementById('frotaEditModel').value,
      chassis: document.getElementById('frotaEditChassis').value,
      renavam: document.getElementById('frotaEditRenavam').value,
      invoiceNumber: document.getElementById('frotaEditInvoiceNumber').value,
      purchaseDate: document.getElementById('frotaEditPurchaseDate').value,
      notes: document.getElementById('frotaEditNotes').value,
      items: collectEditChecklistItems()
    })
  });
  const updatedVehicle = submittedPlate && !normalizePlateInput(result.vehicle?.plate)
    ? { ...result.vehicle, plate: submittedPlate }
    : result.vehicle;
  frotaVehicles = frotaVehicles.map(vehicle => String(vehicle.id) === String(updatedVehicle.id) ? updatedVehicle : vehicle);
  selectedFrotaVehicleId = updatedVehicle.id;
  bootstrap.Modal.getInstance(document.getElementById('frotaEditModal'))?.hide();
  updateMetrics();
  renderUpdates();
  renderVehicleRows();
  renderDetails(updatedVehicle);
  if (document.getElementById('frotaChecklistModal')?.classList.contains('show')) {
    renderChecklistWindow(updatedVehicle);
  }
  showToast('Veículo atualizado.', 'success');
}

function downloadJsonFile(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function backupFrotaData() {
  const payload = await fetchJson(`${FROTA_API}/backup`);
  const date = new Date().toISOString().slice(0, 10);
  downloadJsonFile(payload, `print-preparacao-backup-${date}.json`);
  showToast('Backup da preparação gerado.', 'success');
}

function restoreFrotaFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const payload = JSON.parse(String(reader.result || '{}'));
      const vehiclesCount = Array.isArray(payload.vehicles) ? payload.vehicles.length : 0;
      if (!window.confirm(`Restaurar backup da Preparação de Frota e substituir os dados atuais por ${vehiclesCount} veículo(s)?`)) return;
      const result = await fetchJson(`${FROTA_API}/restore`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      selectedFrotaVehicleId = null;
      await loadFrotaData({ keepSelection: false });
      showToast(`Backup restaurado. Segurança criada: ${result.backupFile || 'ok'}.`, 'success');
    } catch (error) {
      showToast(error.message || 'Não foi possível restaurar o backup.', 'danger');
    } finally {
      document.getElementById('frotaRestoreInput').value = '';
    }
  };
  reader.onerror = () => showToast('Não foi possível ler o arquivo.', 'danger');
  reader.readAsText(file);
}

async function deleteSelectedVehicle(vehicle) {
  if (!vehicle) return;
  if (!window.confirm(`Excluir o veículo ${getVehicleIdentityLabel(vehicle)} da Preparação de Frota? O checklist e o histórico deste módulo serão removidos.`)) return;
  await fetchJson(`${FROTA_API}/vehicles/${vehicle.id}`, { method: 'DELETE' });
  frotaVehicles = frotaVehicles.filter(item => String(item.id) !== String(vehicle.id));
  selectedFrotaVehicleId = frotaVehicles[0]?.id || null;
  updateMetrics();
  renderUpdates();
  renderVehicleRows();
  renderDetails(getSelectedVehicle());
  showToast('Veículo excluído da preparação.', 'warning');
}

function bindEvents() {
  document.getElementById('btnBackToPatio').addEventListener('click', () => { window.location.href = '/'; });
  document.getElementById('btnBackupFrota').addEventListener('click', () => backupFrotaData().catch(error => showToast(error.message, 'danger')));
  document.getElementById('btnRestoreFrota').addEventListener('click', () => document.getElementById('frotaRestoreInput').click());
  document.getElementById('frotaRestoreInput').addEventListener('change', event => restoreFrotaFromFile(event.target.files?.[0]));
  document.getElementById('btnRefreshFrota').addEventListener('click', () => loadFrotaData().then(() => showToast('Módulo atualizado.', 'success')));
  document.getElementById('btnLookupPlate').addEventListener('click', () => lookupPlate().catch(error => showToast(error.message, 'danger')));
  document.getElementById('frotaVehicleForm').addEventListener('submit', event => saveVehicle(event).catch(error => showToast(error.message, 'danger')));
  document.getElementById('frotaEditForm').addEventListener('submit', event => saveEditedVehicle(event).catch(error => showToast(error.message, 'danger')));
  document.getElementById('frotaPlate').addEventListener('input', event => {
    event.target.value = normalizePlateInput(event.target.value);
    schedulePlateLookup();
  });
  document.getElementById('frotaEditPlate').addEventListener('input', event => {
    event.target.value = normalizePlateInput(event.target.value);
  });
  document.getElementById('frotaChassis').addEventListener('input', scheduleChassisLookup);
  document.getElementById('frotaSearch').addEventListener('input', renderVehicleRows);
  document.getElementById('frotaVehiclesTable').addEventListener('click', event => {
    const card = event.target.closest('.vehicle-card');
    if (!card) return;
    const vehicleId = card.dataset.id;
    const vehicle = frotaVehicles.find(item => String(item.id) === String(vehicleId));
    if (event.target.closest('.prep-open-checklist')) {
      selectVehicle(vehicleId);
      openChecklistWindow(vehicle);
      return;
    }
    if (event.target.closest('.prep-edit-card')) {
      selectVehicle(vehicleId);
      openEditVehicleModal(vehicle);
      return;
    }
    if (event.target.closest('.prep-delete-card')) {
      selectVehicle(vehicleId);
      deleteSelectedVehicle(vehicle).catch(error => showToast(error.message, 'danger'));
      return;
    }
    selectVehicle(vehicleId);
  });
  document.getElementById('frotaChecklistModal').addEventListener('click', event => {
    const editButton = event.target.closest('.frota-modal-edit-vehicle');
    if (editButton) {
      openEditVehicleModal(getSelectedVehicle());
      return;
    }
    const button = event.target.closest('.frota-save-item');
    if (!button) return;
    const row = button.closest('[data-item-id]');
    saveItem(row).catch(error => showToast(error.message, 'danger'));
  });
  document.getElementById('frotaDetails').addEventListener('click', event => {
    const editButton = event.target.closest('.frota-edit-vehicle');
    if (editButton) {
      openEditVehicleModal(getSelectedVehicle());
      return;
    }
    const deleteButton = event.target.closest('.frota-delete-vehicle');
    if (deleteButton) {
      deleteSelectedVehicle(getSelectedVehicle()).catch(error => showToast(error.message, 'danger'));
      return;
    }
    const button = event.target.closest('.frota-save-item');
    if (!button) return;
    const row = button.closest('[data-item-id]');
    saveItem(row).catch(error => showToast(error.message, 'danger'));
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  bindEvents();
  try {
    const auth = await fetchJson('/api/auth/me');
    if (!auth.authenticated) {
      window.location.href = '/';
      return;
    }
    await loadFrotaData({ keepSelection: false });
  } catch (error) {
    showToast(error.message || 'Não foi possível carregar o módulo.', 'danger');
  }
});
