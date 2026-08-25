const FROTA_API = '/api/frota';

let frotaVehicles = [];
let frotaConjuntos = [];
let expandedFrotaConjuntoId = null;
let selectedFrotaVehicleId = null;
let plateLookupTimer = null;
let lastLookupPlate = '';
let activePurposeFilter = '';
let activeGuideFilter = '';
let activeStatusFilter = 'preparacao';
let currentFrotaAuth = {
  user: null,
  canManage: false,
  canCreateVehicles: false,
  canEditVehicles: false,
  canEditConcessionaria: false,
  canDeliver: false,
  allowedAreas: []
};
let frotaVoiceRecognition = null;
let frotaVoiceListening = false;
let frotaVoiceEnabled = false;
let frotaVoiceProcessing = false;
let frotaVoiceCommitTimer = null;
let frotaVoiceRestartTimer = null;
let frotaVoiceStatusTimer = null;
let frotaVoiceTranscriptPrefix = '';
let frotaVoiceSessionTranscript = '';
let frotaVoicePendingTranscript = '';
let frotaVoiceManualStop = false;

const FrotaVoiceRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const FROTA_VOICE_REQUIRES_MANUAL_RESTART = Boolean(
  navigator.userAgentData?.mobile || /Android|iPad|iPhone|iPod/i.test(navigator.userAgent || '')
);
const FROTA_VOICE_COMMIT_DELAY_MS = 1000;
const FROTA_VOICE_AUDIO_BASE_PATH = '/audio';
const FROTA_VOICE_AUDIO_FILES = Object.freeze({
  delivered: 'veículos entregues.mp3',
  ready: 'veículos prontos.mp3',
  preparing: 'veículos em preparação.mp3',
  requestedVehicle: 'Exibindo veículo solicitado.mp3'
});
const frotaVoiceAudioPlayers = new Map();
let frotaVoiceAudioUnlocked = false;
let frotaVoiceAudioPlaying = false;

const FROTA_MODEL_IMAGE_BASE = '/images/frota-modelos/';
const FROTA_READY_MODEL_IMAGE_BASE = '/images/';
const FROTA_MODEL_IMAGES = Object.freeze([
  { keywords: ['AXOR 2038', '2038S', 'CAVALO AXOR'], file: 'AXOR-2038S.png' },
  { keywords: ['ATEGO 2429', '2429 6X2'], file: 'ATEGO-2429 6X2.png', readyFile: 'ATEGO-2429 6X2-bau.png' },
  { keywords: ['ATEGO 1719', '1719'], file: 'ATEGO-1719.png', readyFile: 'ATEGO-1719-bau.png' },
  {
    keywords: ['IVECO DAILY', 'VAN IVECO', 'IVECO'],
    file: 'IVECO Daily 30.png',
    readyFile: 'IVECO Daily 30 pronta.png',
    readyBase: FROTA_MODEL_IMAGE_BASE
  },
  { keywords: ['ACCELO 817', 'ACCELO', '817'], file: 'Accelo-817.png' },
  { keywords: ['VOLKS 19360', 'VOLKS 19.360', '19360', '19.360'], file: 'Volks-19360.png' },
  { keywords: ['VANDERLEIA'], file: 'Vanderléia.png', trailer: true },
  { keywords: ['FACCHINI'], file: 'Facchini.png', trailer: true },
  { keywords: ['RANDON'], file: 'Randon.png', trailer: true }
]);

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

function normalizePurpose(value) {
  const purpose = String(value || '').trim().toLowerCase();
  return ['diversos', 'correios', 'concessionaria'].includes(purpose) ? purpose : '';
}

function normalizeModelSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9.]+/gi, ' ')
    .trim()
    .toUpperCase();
}

function getFrotaModelImage(vehicle) {
  const patio = vehicle?.patioVehicle || {};
  const searchable = normalizeModelSearchText([
    vehicle?.vehicleType,
    vehicle?.type,
    vehicle?.model,
    patio.type,
    patio.model
  ].filter(Boolean).join(' '));
  const match = FROTA_MODEL_IMAGES.find(item =>
    item.keywords.some(keyword => searchable.includes(normalizeModelSearchText(keyword)))
  );
  if (!match) return null;
  const ready = vehicle?.status === 'pronto' || Number(vehicle?.progress || 0) >= 100;
  if (ready && match.readyFile) {
    return { ...match, file: match.readyFile, base: match.readyBase || FROTA_READY_MODEL_IMAGE_BASE };
  }
  return { ...match, base: FROTA_MODEL_IMAGE_BASE };
}

function renderFrotaModelImage(vehicle, altText = '') {
  const image = getFrotaModelImage(vehicle);
  if (!image) return '';
  const className = image.trailer ? 'prep-vehicle-thumb trailer' : 'prep-vehicle-thumb';
  return `<img class="${className}" src="${image.base}${encodeURIComponent(image.file)}" alt="${escapeHtml(altText || image.file)}" loading="lazy">`;
}

function getPurposeLabel(value) {
  const purpose = normalizePurpose(value);
  if (purpose === 'diversos') return 'Diversos';
  if (purpose === 'correios') return 'Correios';
  return 'Padrão';
}

function getFrotaRoleLabel(role) {
  if (role === 'fleet_diretoria') return 'Diretoria';
  if (role === 'fleet_posto_diesel') return 'Posto Diesel';
  return {
    admin: 'Admin',
    fleet_documentacao: 'Documentação',
    fleet_processo_frota: 'Processo Frota',
    fleet_manutencao: 'Manutenção'
  }[role] || role || 'Usuário';
}

function canManagePreparation() {
  return Boolean(currentFrotaAuth.canManage);
}

function canDeliverPreparation() {
  return Boolean(currentFrotaAuth.canDeliver);
}

function canCreatePreparationVehicle() {
  return Boolean(currentFrotaAuth.canCreateVehicles || currentFrotaAuth.canManage);
}

function canEditPreparationVehicleData() {
  return Boolean(currentFrotaAuth.canEditVehicles || currentFrotaAuth.canManage);
}

function canEditPreparationConcessionaria() {
  return Boolean(currentFrotaAuth.canEditConcessionaria || canEditPreparationVehicleData());
}

function canEditPreparation() {
  return canManagePreparation() || Boolean(currentFrotaAuth.allowedAreas?.length);
}

function applyFrotaPermissions() {
  document.body.classList.toggle('is-prep-admin', canManagePreparation());
  document.body.classList.toggle('is-prep-limited', !canManagePreparation());
  document.body.classList.toggle('is-prep-cannot-create', !canCreatePreparationVehicle());
  document.body.classList.toggle('is-prep-readonly', !canEditPreparation());
  const userLabel = document.getElementById('frotaUserLabel');
  if (userLabel) {
    const username = currentFrotaAuth.user?.username || '';
    const roleLabel = getFrotaRoleLabel(currentFrotaAuth.user?.role);
    userLabel.textContent = username ? `${username} · ${roleLabel}` : roleLabel;
  }
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

function getFrotaVoiceAudioPlayer(key) {
  const fileName = FROTA_VOICE_AUDIO_FILES[key];
  if (!fileName) return null;
  if (!frotaVoiceAudioPlayers.has(key)) {
    const audio = new Audio(`${FROTA_VOICE_AUDIO_BASE_PATH}/${encodeURIComponent(fileName)}`);
    audio.preload = 'auto';
    frotaVoiceAudioPlayers.set(key, audio);
  }
  return frotaVoiceAudioPlayers.get(key);
}

function primeFrotaVoiceAudio() {
  Object.keys(FROTA_VOICE_AUDIO_FILES).forEach(key => {
    try {
      getFrotaVoiceAudioPlayer(key)?.load();
    } catch (error) {}
  });
}

function unlockFrotaVoiceAudio() {
  primeFrotaVoiceAudio();
  if (frotaVoiceAudioUnlocked) return;
  frotaVoiceAudioUnlocked = true;
  Object.keys(FROTA_VOICE_AUDIO_FILES).forEach(key => {
    const audio = getFrotaVoiceAudioPlayer(key);
    if (!audio) return;
    audio.muted = true;
    audio.currentTime = 0;
    const promise = audio.play();
    if (promise && typeof promise.then === 'function') {
      promise
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
        })
        .catch(() => {})
        .finally(() => {
          audio.muted = false;
        });
    }
  });
}

function playFrotaVoiceAudio(key) {
  const selected = getFrotaVoiceAudioPlayer(key);
  if (!selected) return false;
  frotaVoiceAudioPlayers.forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });
  selected.muted = false;
  frotaVoiceAudioPlaying = true;
  try {
    frotaVoiceRecognition?.stop();
  } catch (error) {}
  selected.onended = () => {
    frotaVoiceAudioPlaying = false;
    if (FROTA_VOICE_REQUIRES_MANUAL_RESTART) {
      pauseFrotaVoiceUntilNextTouch();
    } else {
      scheduleFrotaVoiceRestart(250);
    }
  };
  const promise = selected.play();
  if (promise && typeof promise.catch === 'function') {
    promise.catch(() => {
      frotaVoiceAudioPlaying = false;
      if (FROTA_VOICE_REQUIRES_MANUAL_RESTART) {
        pauseFrotaVoiceUntilNextTouch();
      } else {
        scheduleFrotaVoiceRestart(250);
      }
    });
  }
  return true;
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
  const pairedPlates = getFrotaPairedPlates();
  const deliveredVehicles = frotaVehicles.filter(vehicle => !pairedPlates.has(normalizePlateInput(vehicle.plate)) && vehicle.deliveredAt).length;
  const deliveredConjuntos = frotaConjuntos.filter(conjunto => conjunto.deliveredAt).length;
  document.getElementById('metricDelivered').textContent = deliveredVehicles + deliveredConjuntos;
  document.getElementById('metricDiversos').textContent = frotaVehicles.filter(vehicle => normalizePurpose(vehicle.purpose) === 'diversos').length;
  document.getElementById('metricConcessionaria').textContent = frotaVehicles.filter(vehicle => Boolean(vehicle.aindaNaConcessionaria)).length;
  document.getElementById('metricCorreios').textContent = frotaVehicles.filter(vehicle => normalizePurpose(vehicle.purpose) === 'correios').length;
  setMetricSignal('metricPendingDocs', countVehiclesByGuideFilter('documentos'));
  setMetricSignal('metricPendingTires', countVehiclesByGuideFilter('pneus'));
  setMetricSignal('metricPendingTracker', countVehiclesByGuideFilter('rastreador'));
  setMetricSignal('metricPendingBodywork', countVehiclesByGuideFilter('bau-plataforma'));
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
  if (slug.includes('frota')) return 'FRO';
  if (slug.includes('estetica')) return 'EST';
  if (slug.includes('tecnologia')) return 'TEC';
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

function isChecklistItemDone(item) {
  return Boolean(item?.completed || item?.notApplicable);
}

function normalizeChecklistText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function vehicleHasPendingInArea(vehicle, matcher) {
  return (vehicle?.areas || []).some(area => matcher(area, null) && (area.items || []).some(item => !isChecklistItemDone(item)));
}

function vehicleHasPendingItem(vehicle, matcher) {
  return (vehicle?.areas || []).some(area => (area.items || []).some(item => !isChecklistItemDone(item) && matcher(item, area)));
}

function vehicleMatchesGuideFilter(vehicle, filter = activeGuideFilter) {
  if (!filter) return true;
  if (filter === 'documentos') {
    return vehicleHasPendingInArea(vehicle, area => normalizeChecklistText(area.slug || area.name).includes('document'));
  }
  if (filter === 'pneus') {
    return vehicleHasPendingItem(vehicle, item => {
      const text = normalizeChecklistText(item.templateName);
      return text.includes('pneu') || text.includes('borrachar');
    });
  }
  if (filter === 'rastreador') {
    return vehicleHasPendingItem(vehicle, item => normalizeChecklistText(item.templateName).includes('rastreador'));
  }
  if (filter === 'bau-plataforma') {
    return vehicleHasPendingItem(vehicle, (item, area) => {
      const areaText = normalizeChecklistText(`${area?.slug || ''} ${area?.name || ''}`);
      if (!areaText.includes('upgrade')) return false;
      const text = normalizeChecklistText(item.templateName);
      return text.includes('bau') || text.includes('plataforma');
    });
  }
  return true;
}

function countVehiclesByGuideFilter(filter) {
  return frotaVehicles.filter(vehicle => vehicleMatchesGuideFilter(vehicle, filter)).length;
}

function setMetricSignal(id, count) {
  const value = document.getElementById(id);
  if (!value) return;
  value.textContent = count;
  value.closest('.metric-guide')?.classList.toggle('has-signal', count > 0);
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
    const pending = (area.items || []).find(item => !isChecklistItemDone(item));
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

function renderChecklistItemMeta(item) {
  return item.completedBy
    ? `<small>Concluido por ${escapeHtml(item.completedBy)} ${item.completedAt ? `em ${escapeHtml(formatDateTime(item.completedAt))}` : ''}</small>`
    : '';
}

function renderChecklistItemRow(item, { editable = true, editMode = false } = {}) {
  const idAttribute = editMode ? 'data-edit-item-id' : 'data-item-id';
  const checkClass = editMode ? 'frota-edit-item-check' : 'frota-item-check';
  const naClass = editMode ? 'frota-edit-item-na' : 'frota-item-na';
  const observationClass = editMode ? 'frota-edit-item-observation' : 'frota-item-observation';
  const disabled = editable ? '' : 'disabled';
  const saveButton = !editMode && editable
    ? '<button class="btn btn-sm btn-outline-primary frota-save-item" title="Salvar item"><i class="bi bi-check2"></i></button>'
    : '';

  return `
    <div class="${editMode ? 'edit-checklist-row' : 'check-row'}" ${idAttribute}="${escapeHtml(item.id)}">
      <div class="check-item-title">
        <strong>${escapeHtml(item.templateName)}</strong>
        ${renderChecklistItemMeta(item)}
      </div>
      <div class="check-item-controls">
        <label class="form-check d-flex align-items-center gap-2 mb-0">
          <input class="form-check-input ${checkClass}" type="checkbox" ${item.completed ? 'checked' : ''} ${disabled}>
          <span>Concluido</span>
        </label>
        <label class="form-check d-flex align-items-center gap-2 mb-0">
          <input class="form-check-input ${naClass}" type="checkbox" ${item.notApplicable ? 'checked' : ''} ${disabled}>
          <span>Nao aplicavel</span>
        </label>
        <input class="form-control form-control-sm ${observationClass}" value="${escapeHtml(item.observation || '')}" placeholder="Observacao" ${disabled}>
        ${saveButton}
      </div>
    </div>
  `;
}

function getLookupVehicleType(source = {}) {
  return String(source.vehicleType || source.type || '').trim();
}

function getLookupValue(...values) {
  return values.map(value => String(value || '').trim()).find(Boolean) || '';
}

function renderLookupSourceBlock(title, source = {}) {
  if (!source || !Object.keys(source).length) return '';
  return `
    <div class="mb-3">
      <h3 class="h6 mb-2">${escapeHtml(title)}</h3>
      <div class="checklist-window-grid">
        ${renderInfoCard('Placa', source.plate)}
        ${renderInfoCard('Frota', source.fleetNumber || source.sourceId)}
        ${renderInfoCard('Tipo', getLookupVehicleType(source))}
        ${renderInfoCard('Modelo', source.model)}
        ${renderInfoCard('Chassi', source.chassis)}
        ${renderInfoCard('RENAVAM', source.renavam)}
        ${renderInfoCard('Pátio', source.yard)}
        ${renderInfoCard('Status', source.status)}
        ${renderInfoCard('Base', source.base)}
        ${renderInfoCard('Destino', source.baseDestino)}
      </div>
    </div>
  `;
}

function showVehicleLookupModal(data = {}) {
  const body = document.getElementById('frotaLookupBody');
  const title = document.getElementById('frotaLookupTitle');
  if (!body || !title) return;

  const preparation = data.existingPreparation || null;
  const patio = data.patioVehicle || {};
  const catalog = data.catalogVehicle || {};
  const source = preparation || catalog || patio || {};
  const identity = getLookupValue(
    preparation ? getVehicleIdentityLabel(preparation) : '',
    source.plate,
    data.plate,
    source.chassis,
    data.chassis
  );
  title.textContent = identity ? `Veículo ${identity}` : 'Veículo encontrado';

  body.innerHTML = `
    <div class="alert ${preparation ? 'alert-warning' : 'alert-info'} mb-3">
      ${preparation ? 'Este veículo já está na Preparação de Frota.' : 'Dados encontrados para conferência antes da inclusão.'}
    </div>
    <div class="checklist-window-grid">
      ${renderInfoCard('Placa', getLookupValue(preparation?.plate, patio.plate, catalog.plate, data.plate))}
      ${renderInfoCard('Frota', getLookupValue(preparation?.fleetNumber, catalog.sourceId))}
      ${renderInfoCard('Tipo', getLookupValue(preparation?.vehicleType, getLookupVehicleType(catalog), getLookupVehicleType(patio)))}
      ${renderInfoCard('Modelo', getLookupValue(preparation?.model, catalog.model))}
      ${renderInfoCard('Chassi', getLookupValue(preparation?.chassis, catalog.chassis, patio.chassis, data.chassis))}
      ${renderInfoCard('RENAVAM', getLookupValue(preparation?.renavam, catalog.renavam))}
      ${renderInfoCard('Status preparação', preparation ? (preparation.status === 'pronto' ? 'Pronto' : 'Em preparação') : 'Ainda não incluído')}
      ${renderInfoCard('Pátio', patio.yard)}
      ${renderInfoCard('Status pátio', patio.status)}
      ${renderInfoCard('Base', patio.base)}
      ${renderInfoCard('Destino', patio.baseDestino)}
      ${renderInfoCard('Operação', preparation ? getPurposeLabel(preparation.purpose) : '')}
    </div>
    ${renderLookupSourceBlock('Cadastro na preparação', preparation)}
    ${renderLookupSourceBlock('Catálogo mestre', catalog)}
    ${renderLookupSourceBlock('Registro no pátio', patio)}
  `;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('frotaLookupModal')).show();
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
            <span>Concluído</span>
            <span>
              <strong>${escapeHtml(item.templateName)}</strong>
              ${item.completedBy ? `<span class="d-block small text-muted">Concluído por ${escapeHtml(item.completedBy)} ${item.completedAt ? `em ${escapeHtml(formatDateTime(item.completedAt))}` : ''}</span>` : ''}
            </span>
          </label>
          <input class="form-control form-control-sm frota-item-observation" value="${escapeHtml(item.observation || '')}" placeholder="Observação" ${editable ? '' : 'disabled'}>
          <label class="form-check d-flex align-items-center gap-2 mb-0">
            <input class="form-check-input frota-item-na" type="checkbox" ${item.notApplicable ? 'checked' : ''} ${editable ? '' : 'disabled'}>
            <span>Não aplicável</span>
          </label>
          ${editable ? '<button class="btn btn-sm btn-outline-primary frota-save-item" title="Salvar item"><i class="bi bi-check2"></i></button>' : ''}
        </div>
      `).join('')}
    </div>
  `).join('') : '<div class="empty-state">Checklist ainda não criado para este veículo.</div>';
}

function renderChecklistAreasGrouped(vehicle, { editable = true } = {}) {
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
      ${(area.items || []).map(item => renderChecklistItemRow(item, { editable })).join('')}
    </div>
  `).join('') : '<div class="empty-state">Checklist ainda nao criado para este veiculo.</div>';
}

function renderChecklistAreas(vehicle, { editable = true } = {}) {
  return renderChecklistAreasGrouped(vehicle, { editable });
}

function getFrotaVehicleSearchText(vehicle) {
  const patio = vehicle?.patioVehicle || {};
  return [
    vehicle?.plate,
    patio.plate,
    vehicle?.fleetNumber,
    vehicle?.vehicleType,
    vehicle?.type,
    patio.type,
    vehicle?.model,
    vehicle?.chassis,
    vehicle?.renavam,
    vehicle?.invoiceNumber,
    getPurposeLabel(vehicle?.purpose),
    patio.yard,
    patio.status
  ].filter(Boolean).join(' ').toUpperCase();
}

function normalizeFrotaSearchValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function frotaVehicleMatchesSearch(vehicle, query) {
  const normalizedQuery = normalizeFrotaSearchValue(query);
  if (!normalizedQuery) return true;
  const normalizedText = normalizeFrotaSearchValue(getFrotaVehicleSearchText(vehicle));
  if (normalizedText.includes(normalizedQuery)) return true;
  const compactQuery = normalizedQuery.replace(/[^A-Z0-9]/g, '');
  const compactText = normalizedText.replace(/[^A-Z0-9]/g, '');
  return Boolean(compactQuery) && compactText.includes(compactQuery);
}

function vehicleMatchesCurrentFilters(vehicle, query) {
  if (activePurposeFilter === 'concessionaria' && !vehicle?.aindaNaConcessionaria) return false;
  if (activePurposeFilter && activePurposeFilter !== 'concessionaria' && normalizePurpose(vehicle?.purpose) !== activePurposeFilter) return false;
  if (!vehicleMatchesGuideFilter(vehicle)) return false;
  if (activeStatusFilter === 'pronto' && vehicle?.status !== 'pronto') return false;
  if (activeStatusFilter === 'preparacao' && vehicle?.status === 'pronto') return false;
  if (activeStatusFilter === 'pendencias' && (vehicle?.deliveredAt || !vehicleHasPreparationPending(vehicle))) return false;
  if (activeStatusFilter === 'pronto-disponivel' && (vehicle?.status !== 'pronto' || vehicle?.deliveredAt)) return false;
  if (activeStatusFilter === 'entregue' && !vehicle?.deliveredAt) return false;
  return frotaVehicleMatchesSearch(vehicle, query);
}

function vehicleHasPreparationPending(vehicle) {
  if (!vehicle || vehicle.status !== 'pronto') return true;
  return (vehicle.areas || []).some(area =>
    (area.items || []).some(item => !isChecklistItemDone(item))
  );
}

function getFrotaVehicleByPlate(plate) {
  const normalized = normalizePlateInput(plate);
  return frotaVehicles.find(vehicle => normalizePlateInput(getVehicleDisplayPlate(vehicle)) === normalized) || null;
}

function normalizeFrotaChassis(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function getFrotaVehicleByChassisSuffix(chassisValue) {
  const normalized = normalizeFrotaChassis(chassisValue);
  const suffix = normalized.length > 6 ? normalized.slice(-6) : normalized;
  if (suffix.length !== 6) return null;
  return frotaVehicles.find(vehicle => normalizeFrotaChassis(getVehicleFullChassis(vehicle)).endsWith(suffix)) || null;
}

function getFrotaConjuntoVehicles(conjunto) {
  return {
    cavalo: getFrotaVehicleByPlate(conjunto?.cavaloPlate),
    carreta: getFrotaVehicleByPlate(conjunto?.carretaPlate)
  };
}

function conjuntoMatchesVehicle(conjunto, vehicle) {
  const plate = normalizePlateInput(getVehicleDisplayPlate(vehicle));
  return Boolean(plate) && [conjunto?.cavaloPlate, conjunto?.carretaPlate]
    .some(item => normalizePlateInput(item) === plate);
}

function getFrotaPairedPlates() {
  return new Set(frotaConjuntos.flatMap(conjunto => [
    normalizePlateInput(conjunto.cavaloPlate),
    normalizePlateInput(conjunto.carretaPlate)
  ]).filter(Boolean));
}

function renderFrotaVehicleCard(vehicle) {
  const active = String(vehicle.id) === String(selectedFrotaVehicleId) ? 'active' : '';
  const ready = vehicle.status === 'pronto';
  const delivered = Boolean(vehicle.deliveredAt);
  const statusLabel = ready ? 'Pronto' : 'Em preparação';
  const rawPlate = normalizePlateInput(vehicle.plate);
  const days = getPreparationDays(vehicle);
  const dayIcon = ready ? 'check2' : 'stopwatch';
  const dayClass = !ready && days >= 7 ? 'late' : '';
  const patio = vehicle.patioVehicle || {};
  const modelImageHtml = renderFrotaModelImage(vehicle, vehicle.vehicleType || patio.type || '');
  const vehicleTypeLabel = vehicle.vehicleType || patio.type || 'Tipo não informado';
  const purpose = normalizePurpose(vehicle.purpose);
  const purposeLabel = getPurposeLabel(vehicle.purpose);
  const fullChassis = getVehicleFullChassis(vehicle);
  const chassis = formatChassisCardValue(fullChassis);
  const renavam = vehicle.renavam || 'Não informado';
  const invoiceNumber = vehicle.invoiceNumber || 'Não informado';
  const stageLabel = getPreparationStageLabel(vehicle);
  const nextPending = getNextPendingLabel(vehicle);
  const typeLabel = vehicle.vehicleType || patio.type || 'Não informado';
  const modelLabel = vehicle.model || 'Não informado';
  const patioLabel = patio.yard || 'Não informado';
  const patioStatus = patio.status || 'Não informado';
  const areaChips = (vehicle.areas || []).map(area => `
    <span class="prep-area-chip ${getAreaChipClass(area)}">${escapeHtml(getAreaShortLabel(area))} ${area.completed}/${area.total}</span>
  `).join('');
  const deliveryAction = ready && canDeliverPreparation()
    ? `<button type="button" class="btn btn-sm ${delivered ? 'btn-outline-success' : 'btn-success'} prep-deliver-vehicle"><i class="bi bi-box-arrow-right me-1"></i>${delivered ? 'Editar entrega' : 'Entregar'}</button>`
    : '';
  const undoDeliveryAction = delivered && canDeliverPreparation()
    ? '<button type="button" class="btn btn-sm btn-outline-danger prep-undo-delivery-vehicle"><i class="bi bi-arrow-counterclockwise me-1"></i>Desfazer entrega</button>'
    : '';
  return `
    <article class="prep-vehicle-card vehicle-card ${active} ${ready ? 'ready' : ''}" data-id="${escapeHtml(vehicle.id)}">
      <div class="prep-card-hero">
        <div class="prep-card-topline">
          <span class="prep-pill ${dayClass}"><i class="bi bi-${dayIcon}"></i>${days} dias</span>
          <span class="prep-pill status ${delivered ? 'delivery-signal' : ''}">${delivered ? '<i class="bi bi-circle-fill"></i>Entregue' : escapeHtml(purpose ? purposeLabel : statusLabel)}</span>
        </div>
        <div class="prep-card-main">
          <div class="prep-fleet-number">${escapeHtml(vehicleTypeLabel)}</div>
          ${renderVehicleIdentity(vehicle, rawPlate ? `Cadastro: ${rawPlate}` : '')}
        </div>
        ${modelImageHtml}
      </div>
      <div class="prep-card-body">
        <div class="prep-stage-summary"><small>Estágio da preparação</small><strong>${delivered ? 'Veículo entregue' : escapeHtml(stageLabel)}</strong></div>
        <div class="prep-meta-row"><span>Próximo</span><strong title="${escapeHtml(nextPending)}">${escapeHtml(nextPending)}</strong></div>
        <div class="prep-meta-row"><span>Tipo</span><strong title="${escapeHtml(typeLabel)}">${escapeHtml(typeLabel)}</strong></div>
        <div class="prep-meta-row"><span>Modelo</span><strong title="${escapeHtml(modelLabel)}">${escapeHtml(modelLabel)}</strong></div>
        <div class="prep-meta-row"><span>Frota</span><strong>${escapeHtml(vehicle.fleetNumber || 'Não informado')}</strong></div>
        <div class="prep-meta-row"><span>Chassi</span><strong title="${escapeHtml(fullChassis || 'Não informado')}">${escapeHtml(chassis)}</strong></div>
        <div class="prep-meta-row"><span>RENAVAM</span><strong>${escapeHtml(renavam)}</strong></div>
        <div class="prep-meta-row"><span>NF</span><strong>${escapeHtml(invoiceNumber)}</strong></div>
        <div class="prep-meta-row"><span>Operação</span><strong>${escapeHtml(purposeLabel)}</strong></div>
        <div class="prep-meta-row"><span>Pátio</span><strong title="${escapeHtml(patioLabel)}">${escapeHtml(patioLabel)}</strong></div>
        <div class="prep-meta-row"><span>Status</span><strong title="${escapeHtml(patioStatus)}">${escapeHtml(patioStatus)}</strong></div>
        ${vehicle.deliveredAt ? `<div class="prep-meta-row"><span>Entrega</span><strong title="${escapeHtml(`${formatDateTime(vehicle.deliveredAt)} · ${vehicle.deliveredTo} · ${getPurposeLabel(vehicle.deliveryOperation)}`)}">${escapeHtml(`${formatDateTime(vehicle.deliveredAt)} · ${vehicle.deliveredTo}`)}</strong></div>` : ''}
        ${vehicle.deliveryNotes ? `<div class="prep-meta-row"><span>Observação</span><strong title="${escapeHtml(vehicle.deliveryNotes)}">${escapeHtml(vehicle.deliveryNotes)}</strong></div>` : ''}
        <div class="prep-progress-row">
          <div class="prep-progress-track"><div class="prep-progress-fill" style="width: ${vehicle.progress || 0}%"></div></div>
          <span class="prep-progress-value">${vehicle.progress || 0}%</span>
        </div>
        <div class="prep-area-chips">${areaChips}</div>
        <div class="prep-card-actions">
          <button type="button" class="prep-open-button prep-open-checklist">Abrir checklist →</button>
          ${deliveryAction}
          ${undoDeliveryAction}
          ${canEditPreparation() ? `<button type="button" class="prep-icon-action prep-edit-card" title="${canEditPreparationVehicleData() ? 'Editar veículo' : 'Atualizar checklist'}"><i class="bi bi-pencil"></i></button>` : ''}
          ${canManagePreparation() ? '<button type="button" class="prep-icon-action danger prep-delete-card" title="Excluir veículo"><i class="bi bi-trash"></i></button>' : ''}
        </div>
      </div>
    </article>
  `;
}

function renderFrotaConjuntoCard(conjunto, cavalo, carreta) {
  const days = Math.max(getPreparationDays(cavalo), getPreparationDays(carreta));
  const progress = Math.min(Number(cavalo.progress || 0), Number(carreta.progress || 0));
  const purposes = [...new Set([getPurposeLabel(cavalo.purpose), getPurposeLabel(carreta.purpose)])].join(' + ');
  const patioLabels = [...new Set([
    cavalo.patioVehicle?.yard,
    carreta.patioVehicle?.yard
  ].filter(Boolean))].join(' + ') || 'Não informado';
  const areaChips = (cavalo.areas || []).map(area => `
    <span class="prep-area-chip ${getAreaChipClass(area)}">${escapeHtml(getAreaShortLabel(area))} ${area.completed}/${area.total}</span>
  `).join('');
  const cavaloPlate = normalizePlateInput(cavalo.plate);
  const carretaPlate = normalizePlateInput(carreta.plate);
  const delivered = Boolean(conjunto.deliveredAt);
  const deliveryLabel = delivered
    ? `${formatDateTime(conjunto.deliveredAt)} · ${conjunto.deliveredTo} · ${getPurposeLabel(conjunto.deliveryOperation)}`
    : '';
  const deliveryAction = canDeliverPreparation()
    ? (delivered
      ? `<button type="button" class="btn btn-sm btn-outline-success prep-deliver-conjunto"><i class="bi bi-pencil-square me-1"></i>Editar entrega</button>`
      : '<button type="button" class="btn btn-sm btn-success prep-deliver-conjunto"><i class="bi bi-box-arrow-right me-1"></i>Entregar</button>')
    : '';
  const undoDeliveryAction = delivered && canDeliverPreparation()
    ? '<button type="button" class="btn btn-sm btn-outline-danger prep-undo-delivery-conjunto"><i class="bi bi-arrow-counterclockwise me-1"></i>Desfazer entrega</button>'
    : '';
  return `
    <article class="prep-vehicle-card prep-conjunto-card conjunto-card ready" data-conjunto-id="${escapeHtml(conjunto.id)}">
      <div class="prep-card-hero">
        <div class="prep-card-topline">
          <span class="prep-pill"><i class="bi bi-check2"></i>${days} dias</span>
          <span class="prep-pill status ${delivered ? 'delivery-signal' : ''}">${delivered ? '<i class="bi bi-circle-fill"></i>Entregue' : 'Pronto'}</span>
        </div>
        <div class="prep-conjunto-title">CONJUNTO MONTADO</div>
        <div class="prep-conjunto-plates">
          <div><small>Cavalo</small>${renderFrotaPlate(cavaloPlate, `Cavalo ${cavaloPlate}`)}</div>
          <div><small>Carreta</small>${renderFrotaPlate(carretaPlate, `Carreta ${carretaPlate}`)}</div>
        </div>
        <img class="prep-conjunto-thumb" src="/images/conjunto.png" alt="Cavalo e carreta formando um conjunto">
      </div>
      <div class="prep-card-body">
        <div class="prep-stage-summary"><small>Estágio da preparação</small><strong>${delivered ? 'Conjunto entregue' : 'Conjunto pronto para operar'}</strong></div>
        <div class="prep-meta-row"><span>Próximo</span><strong>Checklist concluído</strong></div>
        <div class="prep-meta-row"><span>Cavalo</span><strong title="${escapeHtml(cavalo.model || '')}">${escapeHtml(cavaloPlate)} · ${escapeHtml(cavalo.model || 'Modelo N/I')}</strong></div>
        <div class="prep-meta-row"><span>Carreta</span><strong title="${escapeHtml(carreta.model || '')}">${escapeHtml(carretaPlate)} · ${escapeHtml(carreta.model || 'Modelo N/I')}</strong></div>
        <div class="prep-meta-row"><span>Frota</span><strong>${escapeHtml(`Cavalo ${cavalo.fleetNumber || 'N/I'} · Carreta ${carreta.fleetNumber || 'N/I'}`)}</strong></div>
        <div class="prep-meta-row"><span>Operação</span><strong>${escapeHtml(purposes)}</strong></div>
        <div class="prep-meta-row"><span>Pátio</span><strong title="${escapeHtml(patioLabels)}">${escapeHtml(patioLabels)}</strong></div>
        <div class="prep-meta-row"><span>Status</span><strong>${delivered ? 'Entregue' : 'Conjunto montado'}</strong></div>
        ${delivered ? `<div class="prep-meta-row"><span>Entrega</span><strong title="${escapeHtml(deliveryLabel)}">${escapeHtml(deliveryLabel)}</strong></div>` : ''}
        ${conjunto.deliveryNotes ? `<div class="prep-meta-row"><span>Observação</span><strong title="${escapeHtml(conjunto.deliveryNotes)}">${escapeHtml(conjunto.deliveryNotes)}</strong></div>` : ''}
        <div class="prep-progress-row">
          <div class="prep-progress-track"><div class="prep-progress-fill" style="width: ${progress}%"></div></div>
          <span class="prep-progress-value">${progress}%</span>
        </div>
        <div class="prep-area-chips">${areaChips}</div>
        <div class="prep-card-actions prep-conjunto-actions">
          <button type="button" class="prep-open-button prep-view-conjunto"><i class="bi bi-layout-split me-1"></i>Visualizar separadamente</button>
          ${deliveryAction}
          ${undoDeliveryAction}
          ${canManagePreparation() ? '<button type="button" class="prep-icon-action prep-edit-conjunto-vehicles" title="Editar veículos"><i class="bi bi-truck"></i></button>' : ''}
          ${canManagePreparation() ? '<button type="button" class="prep-icon-action danger prep-delete-conjunto" title="Desmontar conjunto"><i class="bi bi-link-45deg"></i></button>' : ''}
        </div>
      </div>
    </article>
  `;
}

function renderConjuntoViewBar() {
  const bar = document.getElementById('frotaConjuntoViewBar');
  if (!bar) return;
  const conjunto = frotaConjuntos.find(item => String(item.id) === String(expandedFrotaConjuntoId));
  if (!conjunto) {
    bar.hidden = true;
    bar.innerHTML = '';
    return;
  }
  bar.hidden = false;
  bar.innerHTML = `
    <div>
      <strong><i class="bi bi-layout-split me-1"></i>Visualização separada</strong>
      <small>${escapeHtml(conjunto.cavaloPlate)} + ${escapeHtml(conjunto.carretaPlate)}</small>
    </div>
    <button type="button" class="btn btn-sm btn-success" id="btnCollapseConjunto"><i class="bi bi-link-45deg me-1"></i>Voltar ao conjunto</button>
  `;
}

function renderVehicleRows() {
  const query = String(document.getElementById('frotaSearch').value || '').trim().toUpperCase();
  const grid = document.getElementById('frotaVehiclesTable');
  document.querySelectorAll('[data-purpose-filter]').forEach(button => {
    const isActive = button.dataset.purposeFilter === activePurposeFilter;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  document.querySelectorAll('[data-guide-filter]').forEach(button => {
    const isActive = button.dataset.guideFilter === activeGuideFilter;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  document.querySelectorAll('[data-status-filter]').forEach(button => {
    const isActive = button.dataset.statusFilter === activeStatusFilter;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  const pairedPlates = getFrotaPairedPlates();
  const cards = [];
  for (const conjunto of frotaConjuntos) {
    const { cavalo, carreta } = getFrotaConjuntoVehicles(conjunto);
    if (!cavalo || !carreta) continue;
    if (activeStatusFilter === 'entregue' && !conjunto.deliveredAt) continue;
    if (String(conjunto.id) === String(expandedFrotaConjuntoId)) {
      cards.push(renderFrotaVehicleCard(cavalo), renderFrotaVehicleCard(carreta));
      continue;
    }
    const matches = activeStatusFilter === 'entregue'
      ? frotaVehicleMatchesSearch(cavalo, query) || frotaVehicleMatchesSearch(carreta, query)
      : vehicleMatchesCurrentFilters(cavalo, query) || vehicleMatchesCurrentFilters(carreta, query);
    if (matches) cards.push(renderFrotaConjuntoCard(conjunto, cavalo, carreta));
  }

  frotaVehicles.forEach(vehicle => {
    const plate = normalizePlateInput(vehicle.plate);
    if (pairedPlates.has(plate)) return;
    if (vehicleMatchesCurrentFilters(vehicle, query)) cards.push(renderFrotaVehicleCard(vehicle));
  });

  const columnCount = Math.min(6, Math.max(1, cards.length));
  grid.style.setProperty('--frota-grid-columns', String(columnCount));
  grid.classList.toggle('dense', columnCount >= 5);
  grid.classList.toggle('ultra-dense', false);
  grid.innerHTML = cards.join('') || '<div class="empty-state">Nenhum veículo encontrado.</div>';
  renderConjuntoViewBar();
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
          <label class="form-check d-flex align-items-center gap-2 mb-0">
            <input class="form-check-input frota-item-na" type="checkbox" ${item.notApplicable ? 'checked' : ''}>
            <span>Não aplicável</span>
          </label>
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
          ${escapeHtml(vehicle.vehicleType || patio.type || 'Tipo não informado')}
          ${vehicle.model ? ` • Modelo ${escapeHtml(vehicle.model)}` : ''}
          ${vehicle.chassis || patio.chassis ? ` • Chassi ${escapeHtml(vehicle.chassis || patio.chassis)}` : ''}
          ${vehicle.invoiceNumber ? ` • NF ${escapeHtml(vehicle.invoiceNumber)}` : ''}
          ${vehicle.purpose ? ` • ${escapeHtml(getPurposeLabel(vehicle.purpose))}` : ''}
          ${patio.yard ? ` • ${escapeHtml(patio.yard)}` : ''}
        </div>
      </div>
      <div class="text-end" style="min-width: 210px">
        <div class="d-flex justify-content-end gap-2 mb-2">
          <button class="btn btn-sm btn-outline-primary frota-edit-vehicle" data-vehicle-id="${escapeHtml(vehicle.id)}" title="Editar veículo"><i class="bi bi-pencil"></i></button>
          ${canManagePreparation() ? `<button class="btn btn-sm btn-outline-danger frota-delete-vehicle" data-vehicle-id="${escapeHtml(vehicle.id)}" title="Excluir veículo"><i class="bi bi-trash"></i></button>` : ''}
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

function renderDetails(vehicle) {
  const details = document.getElementById('frotaDetails');
  if (!details) return;
  if (!vehicle) {
    details.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-clipboard2-check fs-1 d-block mb-2"></i>
        Selecione um veiculo para acompanhar a preparacao.
      </div>
    `;
    return;
  }

  const patio = vehicle.patioVehicle || {};
  const rawPlate = normalizePlateInput(vehicle.plate);
  const logsHtml = (vehicle.logs || []).slice(0, 8).map(log => `
    <li class="list-group-item d-flex justify-content-between gap-3">
      <span>${escapeHtml(log.action)}</span>
      <small class="text-muted text-nowrap">${escapeHtml(formatDateTime(log.createdAt))}</small>
    </li>
  `).join('');
  const editable = canEditPreparation();

  details.innerHTML = `
    <div class="p-3 border-bottom d-flex align-items-start justify-content-between gap-3 flex-wrap">
      <div>
        <div class="d-flex align-items-center gap-2 flex-wrap">
          ${renderVehicleIdentity(vehicle, rawPlate ? `Cadastro: ${rawPlate}` : '')}
          <span class="badge ${vehicle.status === 'pronto' ? 'text-bg-success' : 'text-bg-warning'}">${vehicle.status === 'pronto' ? 'Pronto' : 'Em preparacao'}</span>
        </div>
        <div class="small text-muted mt-2">
          ${escapeHtml(vehicle.vehicleType || patio.type || 'Tipo nao informado')}
          ${vehicle.model ? ` - Modelo ${escapeHtml(vehicle.model)}` : ''}
          ${vehicle.chassis || patio.chassis ? ` - Chassi ${escapeHtml(vehicle.chassis || patio.chassis)}` : ''}
          ${vehicle.invoiceNumber ? ` - NF ${escapeHtml(vehicle.invoiceNumber)}` : ''}
          ${vehicle.purpose ? ` - ${escapeHtml(getPurposeLabel(vehicle.purpose))}` : ''}
          ${patio.yard ? ` - ${escapeHtml(patio.yard)}` : ''}
        </div>
      </div>
      <div class="text-end" style="min-width: 210px">
        <div class="d-flex justify-content-end gap-2 mb-2">
          ${editable ? `<button class="btn btn-sm btn-outline-primary frota-edit-vehicle" data-vehicle-id="${escapeHtml(vehicle.id)}" title="${canEditPreparationVehicleData() ? 'Editar veiculo' : 'Atualizar checklist'}"><i class="bi bi-pencil"></i></button>` : ''}
          ${canManagePreparation() ? `<button class="btn btn-sm btn-outline-danger frota-delete-vehicle" data-vehicle-id="${escapeHtml(vehicle.id)}" title="Excluir veiculo"><i class="bi bi-trash"></i></button>` : ''}
        </div>
        <strong class="fs-4">${vehicle.progress || 0}%</strong>
        <div class="progress mt-1" style="height: 8px"><div class="progress-bar ${vehicle.status === 'pronto' ? 'bg-success' : ''}" style="width: ${vehicle.progress || 0}%"></div></div>
      </div>
    </div>
    ${renderChecklistAreasGrouped(vehicle, { editable })}
    <div class="p-3 border-top">
      <h2 class="h6 mb-2"><i class="bi bi-clock-history me-1"></i>Historico</h2>
      <ul class="list-group list-group-flush">${logsHtml || '<li class="list-group-item text-muted">Sem historico.</li>'}</ul>
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
  const modalEditButton = document.querySelector('.frota-modal-edit-vehicle');
  if (modalEditButton) modalEditButton.classList.toggle('d-none', !canEditPreparation());
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
      ${renderInfoCard('Tipo', vehicle.vehicleType || patio.type)}
      ${renderInfoCard('Modelo', vehicle.model)}
      ${renderInfoCard('Chassi', fullChassis)}
      ${renderInfoCard('RENAVAM', vehicle.renavam)}
      ${renderInfoCard('Nota fiscal', vehicle.invoiceNumber)}
      ${renderInfoCard('Operação', getPurposeLabel(vehicle.purpose))}
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
      <div class="panel overflow-hidden">${renderChecklistAreas(vehicle, { editable: canEditPreparation() })}</div>
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
  [frotaVehicles, frotaConjuntos] = await Promise.all([
    fetchJson(`${FROTA_API}/vehicles`),
    fetchJson(`${FROTA_API}/conjuntos`)
  ]);
  if (expandedFrotaConjuntoId && !frotaConjuntos.some(item => String(item.id) === String(expandedFrotaConjuntoId))) {
    expandedFrotaConjuntoId = null;
  }
  const pairedPlates = getFrotaPairedPlates();
  const selectedVehicle = frotaVehicles.find(vehicle => String(vehicle.id) === String(selectedFrotaVehicleId));
  const selectedIsHidden = selectedVehicle
    && pairedPlates.has(normalizePlateInput(selectedVehicle.plate))
    && !frotaConjuntos.some(conjunto => String(conjunto.id) === String(expandedFrotaConjuntoId)
      && conjuntoMatchesVehicle(conjunto, selectedVehicle));
  if (!keepSelection || !selectedVehicle || selectedIsHidden) {
    selectedFrotaVehicleId = frotaVehicles.find(vehicle => !pairedPlates.has(normalizePlateInput(vehicle.plate)))?.id || null;
  }
  updateMetrics();
  renderUpdates();
  renderVehicleRows();
  renderDetails(frotaVehicles.find(vehicle => String(vehicle.id) === String(selectedFrotaVehicleId)));
}

function getVehicleTypeLabel(source) {
  return String(source?.type || source?.vehicleType || '').trim();
}

function getVehicleModelLabel(source) {
  return String(source?.model || '').trim();
}

function getFrotaFormFilterQuery() {
  const type = String(document.getElementById('frotaVehicleType')?.value || '').trim();
  const renavam = String(document.getElementById('frotaRenavam')?.value || '').trim();
  const chassis = String(document.getElementById('frotaChassis')?.value || '').trim();
  if (type) return type;
  if (renavam) return renavam;
  if (chassis) return chassis.length > 6 ? chassis.slice(-6) : chassis;
  return '';
}

function applyFrotaFormFilter({ showHint = false } = {}) {
  const query = getFrotaFormFilterQuery();
  const searchField = document.getElementById('frotaSearch');
  if (!searchField) return false;
  searchField.value = query;
  renderVehicleRows();
  if (showHint) {
    const hint = document.getElementById('lookupHint');
    if (hint) hint.textContent = query ? `Lista filtrada por: ${query}` : '';
  }
  return Boolean(query);
}

async function lookupPlate({ silent = false, showModal = false } = {}) {
  const plateField = document.getElementById('frotaPlate');
  const chassisField = document.getElementById('frotaChassis');
  const plate = normalizePlateInput(plateField.value);
  const chassis = String(chassisField.value || '').trim();
  plateField.value = plate;
  if (!plate && !chassis) {
    if (applyFrotaFormFilter({ showHint: true })) return;
    if (!silent) showToast('Informe uma placa ou chassi para consultar.', 'warning');
    return;
  }

  const params = new URLSearchParams();
  if (plate) params.set('plate', plate);
  if (chassis) params.set('chassis', chassis);
  const data = await fetchJson(`${FROTA_API}/lookup?${params.toString()}`);
  const hint = document.getElementById('lookupHint');
  if (showModal) {
    showVehicleLookupModal(data);
  }
  if (data.existingPreparation) {
    hint.textContent = 'Este veículo já está no módulo de Preparação de Frota.';
    if (!silent) showToast('Veículo já cadastrado na preparação.', 'warning');
    return;
  }

  const source = data.catalogVehicle || data.patioVehicle || {};
  const vehicleType = getVehicleTypeLabel(source);
  const vehicleModel = getVehicleModelLabel(source);
  if (source.sourceId) document.getElementById('frotaFleetNumber').value = source.sourceId;
  if (vehicleType) document.getElementById('frotaVehicleType').value = vehicleType;
  if (vehicleModel) document.getElementById('frotaModel').value = vehicleModel;
  if (source.chassis) document.getElementById('frotaChassis').value = source.chassis;
  if (source.renavam) document.getElementById('frotaRenavam').value = source.renavam;
  hint.textContent = data.patioVehicle
    ? `Vínculo encontrado no pátio: ${data.patioVehicle.yard || 'pátio não informado'} / ${data.patioVehicle.status || 'status não informado'}${vehicleType ? ` / tipo: ${vehicleType}` : ''}${vehicleModel ? ` / modelo: ${vehicleModel}` : ''}.`
    : data.catalogVehicle ? `Dados encontrados no catálogo mestre${vehicleType ? ` / tipo: ${vehicleType}` : ''}${vehicleModel ? ` / modelo: ${vehicleModel}` : ''}.` : 'Nenhum vínculo encontrado; o cadastro será criado com os dados preenchidos.';
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

async function runVehicleSearch() {
  clearTimeout(plateLookupTimer);
  const plate = normalizePlateInput(document.getElementById('frotaPlate').value);
  const hint = document.getElementById('lookupHint');

  if (plate) {
    await lookupPlate({ showModal: true });
    return;
  }

  if (!applyFrotaFormFilter({ showHint: true })) {
    showToast('Informe placa, tipo, RENAVAM ou os 6 últimos números do chassi para pesquisar.', 'warning');
    return;
  }

  if (hint && !hint.textContent) hint.textContent = 'Lista filtrada.';
  document.getElementById('frotaVehiclesTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleSearchFieldEnter(event) {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  runVehicleSearch().catch(error => showToast(error.message, 'danger'));
}

function handleFrotaFormFilterInput() {
  applyFrotaFormFilter();
}

async function saveVehicle(event) {
  event.preventDefault();
  if (!canCreatePreparationVehicle()) {
    showToast('Este login não possui permissão para incluir veículos.', 'warning');
    return;
  }
  const payload = {
    plate: normalizePlateInput(document.getElementById('frotaPlate').value),
    fleetNumber: document.getElementById('frotaFleetNumber').value,
    vehicleType: document.getElementById('frotaVehicleType').value,
    model: document.getElementById('frotaModel').value,
    chassis: document.getElementById('frotaChassis').value,
    renavam: document.getElementById('frotaRenavam').value,
    invoiceNumber: document.getElementById('frotaInvoiceNumber').value,
    purpose: document.getElementById('frotaPurpose').value,
    aindaNaConcessionaria: document.getElementById('frotaAindaNaConcessionaria').checked,
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
  const notApplicable = row.querySelector('.frota-item-na')?.checked || false;
  const completed = notApplicable ? false : row.querySelector('.frota-item-check').checked;
  const observation = row.querySelector('.frota-item-observation').value;
  const result = await fetchJson(`${FROTA_API}/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ completed, notApplicable, observation })
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
  if (!canEditPreparation()) {
    showToast('Este login possui apenas visualizacao da preparacao.', 'warning');
    return;
  }
  document.getElementById('frotaEditId').value = vehicle.id;
  document.getElementById('frotaEditTitle').textContent = `${canEditPreparationVehicleData() ? 'Editar veículo' : 'Atualizar checklist'} ${getVehicleIdentityLabel(vehicle)}`;
  document.getElementById('frotaEditPlate').value = vehicle.plate || '';
  document.getElementById('frotaEditFleetNumber').value = vehicle.fleetNumber || '';
  document.getElementById('frotaEditVehicleType').value = vehicle.vehicleType || vehicle.patioVehicle?.type || '';
  document.getElementById('frotaEditModel').value = vehicle.model || '';
  document.getElementById('frotaEditChassis').value = vehicle.chassis || vehicle.patioVehicle?.chassis || '';
  document.getElementById('frotaEditRenavam').value = vehicle.renavam || '';
  document.getElementById('frotaEditInvoiceNumber').value = vehicle.invoiceNumber || '';
  document.getElementById('frotaEditPurchaseDate').value = vehicle.purchaseDate ? String(vehicle.purchaseDate).slice(0, 10) : '';
  document.getElementById('frotaEditPurpose').value = normalizePurpose(vehicle.purpose);
  document.getElementById('frotaEditAindaNaConcessionaria').checked = Boolean(vehicle.aindaNaConcessionaria);
  document.getElementById('frotaEditNotes').value = vehicle.notes || '';
  [
    'frotaEditPlate',
    'frotaEditFleetNumber',
    'frotaEditVehicleType',
    'frotaEditModel',
    'frotaEditChassis',
    'frotaEditRenavam',
    'frotaEditInvoiceNumber',
    'frotaEditPurchaseDate',
    'frotaEditPurpose',
    'frotaEditNotes'
  ].forEach(id => {
    document.getElementById(id)?.closest('[class*="col-"]')?.classList.toggle('d-none', !canEditPreparationVehicleData());
  });
  document.getElementById('frotaEditAindaNaConcessionaria')
    ?.closest('[class*="col-"]')
    ?.classList.toggle('d-none', !canEditPreparationConcessionaria());
  const checklistHint = document.getElementById('frotaEditChecklistHint');
  if (checklistHint) {
    checklistHint.textContent = canEditPreparationVehicleData()
      ? 'Todos os campos podem ser atualizados aqui.'
      : 'Seu login mostra apenas os grupos liberados para atualização.';
  }
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
            <span>Concluído</span>
            <span>
              <strong>${escapeHtml(item.templateName)}</strong>
              ${item.completedBy ? `<span class="d-block small text-muted">Concluído por ${escapeHtml(item.completedBy)} ${item.completedAt ? `em ${escapeHtml(formatDateTime(item.completedAt))}` : ''}</span>` : ''}
            </span>
          </label>
          <label class="form-check d-flex align-items-center gap-2 mb-0">
            <input class="form-check-input frota-edit-item-na" type="checkbox" ${item.notApplicable ? 'checked' : ''}>
            <span>Não aplicável</span>
          </label>
          <input class="form-control form-control-sm frota-edit-item-observation" value="${escapeHtml(item.observation || '')}" placeholder="Observação">
        </div>
      `).join('')}
    </div>
  `).join('') : '<div class="empty-state py-3">Checklist ainda não criado para este veículo.</div>';
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
      ${(area.items || []).map(item => renderChecklistItemRow(item, { editable: canEditPreparation(), editMode: true })).join('')}
    </div>
  `).join('') : '<div class="empty-state py-3">Checklist ainda nao criado para este veiculo.</div>';
}

function collectEditChecklistItems() {
  return Array.from(document.querySelectorAll('#frotaEditChecklist [data-edit-item-id]')).map(row => ({
    id: row.dataset.editItemId,
    notApplicable: row.querySelector('.frota-edit-item-na')?.checked || false,
    completed: row.querySelector('.frota-edit-item-na')?.checked ? false : (row.querySelector('.frota-edit-item-check')?.checked || false),
    observation: row.querySelector('.frota-edit-item-observation')?.value || ''
  }));
}

async function saveEditedVehicle(event) {
  event.preventDefault();
  if (!canEditPreparation()) {
    showToast('Este login possui apenas visualizacao da preparacao.', 'warning');
    return;
  }
  const id = document.getElementById('frotaEditId').value;
  const submittedPlate = normalizePlateInput(document.getElementById('frotaEditPlate').value);
  const payload = canEditPreparationVehicleData()
    ? {
      plate: submittedPlate,
      fleetNumber: document.getElementById('frotaEditFleetNumber').value,
      vehicleType: document.getElementById('frotaEditVehicleType').value,
      model: document.getElementById('frotaEditModel').value,
      chassis: document.getElementById('frotaEditChassis').value,
      renavam: document.getElementById('frotaEditRenavam').value,
      invoiceNumber: document.getElementById('frotaEditInvoiceNumber').value,
      purchaseDate: document.getElementById('frotaEditPurchaseDate').value,
      purpose: document.getElementById('frotaEditPurpose').value,
      aindaNaConcessionaria: document.getElementById('frotaEditAindaNaConcessionaria').checked,
      notes: document.getElementById('frotaEditNotes').value,
      items: collectEditChecklistItems()
    }
    : { items: collectEditChecklistItems() };
  const result = await fetchJson(`${FROTA_API}/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  const updatedVehicle = canEditPreparationVehicleData() && submittedPlate && !normalizePlateInput(result.vehicle?.plate)
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
  showToast(canEditPreparationVehicleData() ? 'Veículo atualizado.' : 'Checklist atualizado.', 'success');
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

function getFrotaVehicleKindText(vehicle) {
  return normalizeModelSearchText([
    vehicle?.vehicleType,
    vehicle?.type,
    vehicle?.model,
    vehicle?.patioVehicle?.type
  ].filter(Boolean).join(' '));
}

function isFrotaTrailer(vehicle) {
  const text = getFrotaVehicleKindText(vehicle);
  return text.includes('CARRETA') || text.includes('SEMIRREBOQUE') || text.includes('SEMI REBOQUE') || text.includes('REBOQUE');
}

function isFrotaHorse(vehicle) {
  return getFrotaVehicleKindText(vehicle).includes('CAVALO') && !isFrotaTrailer(vehicle);
}

function getConjuntoVehicleOptionLabel(vehicle) {
  return `${getVehicleIdentityLabel(vehicle)} · ${vehicle.vehicleType || vehicle.patioVehicle?.type || 'Tipo N/I'} · ${vehicle.model || 'Modelo N/I'}`;
}

function populateFrotaConjuntoForm() {
  const pairedPlates = getFrotaPairedPlates();
  const available = frotaVehicles.filter(vehicle =>
    vehicle.status === 'pronto'
    && !vehicle.deliveredAt
    && normalizePlateInput(getVehicleDisplayPlate(vehicle))
    && !pairedPlates.has(normalizePlateInput(getVehicleDisplayPlate(vehicle)))
  );
  const cavalos = available.filter(isFrotaHorse);
  const carretas = available.filter(isFrotaTrailer);
  const cavaloSelect = document.getElementById('frotaConjuntoCavalo');
  const carretaSelect = document.getElementById('frotaConjuntoCarreta');
  cavaloSelect.innerHTML = '<option value="">Selecione o cavalo</option>' + cavalos.map(vehicle =>
    `<option value="${escapeHtml(vehicle.id)}">${escapeHtml(getConjuntoVehicleOptionLabel(vehicle))}</option>`
  ).join('');
  carretaSelect.innerHTML = '<option value="">Selecione a carreta</option>' + carretas.map(vehicle =>
    `<option value="${escapeHtml(vehicle.id)}">${escapeHtml(getConjuntoVehicleOptionLabel(vehicle))}</option>`
  ).join('');
  const hint = document.getElementById('frotaConjuntoHint');
  hint.textContent = cavalos.length && carretas.length
    ? 'Apenas veículos com checklist 100% concluído aparecem nesta lista.'
    : 'Não há cavalo e carreta livres com checklist 100% concluído.';
  document.getElementById('btnSaveFrotaConjunto').disabled = !cavalos.length || !carretas.length;
}

function openFrotaConjuntoModal() {
  populateFrotaConjuntoForm();
  bootstrap.Modal.getOrCreateInstance(document.getElementById('frotaConjuntoModal')).show();
}

async function saveFrotaConjunto(event) {
  event.preventDefault();
  const cavaloVehicleId = Number(document.getElementById('frotaConjuntoCavalo').value);
  const carretaVehicleId = Number(document.getElementById('frotaConjuntoCarreta').value);
  if (!cavaloVehicleId || !carretaVehicleId) throw new Error('Selecione o cavalo e a carreta');
  await fetchJson(`${FROTA_API}/conjuntos`, {
    method: 'POST',
    body: JSON.stringify({ cavaloVehicleId, carretaVehicleId })
  });
  bootstrap.Modal.getOrCreateInstance(document.getElementById('frotaConjuntoModal')).hide();
  expandedFrotaConjuntoId = null;
  await loadFrotaData({ keepSelection: false });
  showToast('Conjunto montado com sucesso.', 'success');
}

function openFrotaEntregaModal(type, record) {
  if (!record || !canDeliverPreparation()) return;
  const editing = Boolean(record.deliveredAt);
  const isConjunto = type === 'conjunto';
  document.getElementById('frotaEntregaTipo').value = type;
  document.getElementById('frotaEntregaAlvoId').value = record.id;
  document.getElementById('frotaEntregaConjuntoLabel').textContent = isConjunto
    ? `${record.cavaloPlate} + ${record.carretaPlate}`
    : (getVehicleIdentityLabel(record) || record.plate || record.chassis || `Veículo ${record.id}`);
  const now = new Date();
  const localNow = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  const deliveredDate = record.deliveredAt ? new Date(record.deliveredAt) : null;
  const deliveredLocal = deliveredDate && !Number.isNaN(deliveredDate.getTime())
    ? new Date(deliveredDate.getTime() - (deliveredDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
    : localNow;
  document.getElementById('frotaEntregaData').value = deliveredLocal;
  document.getElementById('frotaEntregaOperacao').value = normalizePurpose(record.deliveryOperation);
  document.getElementById('frotaEntregaRecebedor').value = record.deliveredTo || '';
  document.getElementById('frotaEntregaObservacao').value = record.deliveryNotes || '';
  document.getElementById('frotaEntregaAviso').textContent = isConjunto
    ? 'A entrega será registrada também no cavalo e na carreta deste conjunto.'
    : 'A entrega liberará este veículo no Controle de Pátio.';
  const targetLabel = isConjunto ? 'conjunto' : 'veículo';
  document.getElementById('frotaEntregaConjuntoTitle').innerHTML = `<i class="bi ${editing ? 'bi-pencil-square' : 'bi-box-arrow-right'} me-1"></i>${editing ? 'Editar entrega' : `Entregar ${targetLabel}`}`;
  document.getElementById('btnSaveFrotaEntrega').innerHTML = `<i class="bi bi-check2-circle me-1"></i>${editing ? 'Salvar alterações' : 'Confirmar entrega'}`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('frotaEntregaConjuntoModal')).show();
}

function openFrotaEntregaConjuntoModal(conjunto) {
  openFrotaEntregaModal('conjunto', conjunto);
}

function openFrotaEntregaVehicleModal(vehicle) {
  openFrotaEntregaModal('vehicle', vehicle);
}

async function saveFrotaEntrega(event) {
  event.preventDefault();
  const type = document.getElementById('frotaEntregaTipo').value;
  const targetId = document.getElementById('frotaEntregaAlvoId').value;
  const deliveredAtLocal = document.getElementById('frotaEntregaData').value;
  const deliveredAtDate = deliveredAtLocal ? new Date(deliveredAtLocal) : null;
  const deliveredAt = deliveredAtDate && !Number.isNaN(deliveredAtDate.getTime()) ? deliveredAtDate.toISOString() : '';
  const deliveredTo = document.getElementById('frotaEntregaRecebedor').value.trim();
  const deliveryOperation = normalizePurpose(document.getElementById('frotaEntregaOperacao').value);
  const deliveryNotes = document.getElementById('frotaEntregaObservacao').value.trim();
  if (!targetId || !deliveredAt || !deliveredTo || !deliveryOperation) throw new Error('Preencha data, recebedor e operação');
  const resource = type === 'conjunto' ? 'conjuntos' : 'vehicles';
  await fetchJson(`${FROTA_API}/${resource}/${targetId}/entrega`, {
    method: 'POST',
    body: JSON.stringify({ deliveredAt, deliveredTo, deliveryOperation, deliveryNotes })
  });
  bootstrap.Modal.getOrCreateInstance(document.getElementById('frotaEntregaConjuntoModal')).hide();
  await loadFrotaData({ keepSelection: false });
  showToast(type === 'conjunto' ? 'Entrega registrada no conjunto e nos dois veículos.' : 'Entrega registrada no veículo.', 'success');
}

async function undoFrotaEntrega(type, record) {
  if (!record?.id || !record.deliveredAt || !canDeliverPreparation()) return;
  const isConjunto = type === 'conjunto';
  const label = isConjunto
    ? `${record.cavaloPlate} + ${record.carretaPlate}`
    : (getVehicleIdentityLabel(record) || record.plate || record.chassis || `Veículo ${record.id}`);
  const message = isConjunto
    ? `Desfazer a entrega do conjunto ${label}? Os dois veículos voltarão para Aguardando linha no Controle de Pátio.`
    : `Desfazer a entrega do veículo ${label}? Ele voltará para Aguardando linha no Controle de Pátio.`;
  if (!window.confirm(message)) return;
  const resource = isConjunto ? 'conjuntos' : 'vehicles';
  await fetchJson(`${FROTA_API}/${resource}/${record.id}/entrega`, { method: 'DELETE' });
  await loadFrotaData({ keepSelection: false });
  showToast(isConjunto ? 'Entrega do conjunto desfeita.' : 'Entrega do veículo desfeita.', 'warning');
}

async function deleteFrotaConjunto(conjunto) {
  if (!conjunto || !canManagePreparation()) return;
  if (!window.confirm(`Desmontar o conjunto ${conjunto.cavaloPlate} + ${conjunto.carretaPlate}? Os dois cards voltarão ao painel.`)) return;
  await fetchJson(`${FROTA_API}/conjuntos/${conjunto.id}`, { method: 'DELETE' });
  if (String(expandedFrotaConjuntoId) === String(conjunto.id)) expandedFrotaConjuntoId = null;
  await loadFrotaData({ keepSelection: false });
  showToast('Conjunto desmontado. Os veículos voltaram ao painel.', 'warning');
}

const FROTA_VOICE_DIGIT_MAP = Object.freeze({
  zero: '0', um: '1', uma: '1', hum: '1', dois: '2', duas: '2',
  tres: '3', quatro: '4', cinco: '5', seis: '6', meia: '6',
  sete: '7', oito: '8', nove: '9', dez: '10', onze: '11', doze: '12'
});

const FROTA_VOICE_LETTER_MAP = Object.freeze({
  a: 'A', be: 'B', b: 'B', ce: 'C', c: 'C', de: 'D', dee: 'D', di: 'D', d: 'D',
  e: 'E', efe: 'F', f: 'F', ge: 'G', g: 'G', aga: 'H', h: 'H', i: 'I',
  jota: 'J', j: 'J', ka: 'K', k: 'K', ele: 'L', l: 'L', eme: 'M', m: 'M',
  ene: 'N', n: 'N', o: 'O', pe: 'P', p: 'P', que: 'Q', q: 'Q', erre: 'R',
  r: 'R', esse: 'S', s: 'S', te: 'T', t: 'T', u: 'U', ve: 'V', v: 'V',
  dabliu: 'W', w: 'W', xis: 'X', x: 'X', ipsilon: 'Y', y: 'Y', ze: 'Z', z: 'Z'
});

const FROTA_VOICE_SEQUENCE_MAP = Object.freeze({
  ud: '1D', umde: '1D', unde: '1D', humde: '1D'
});

function normalizeFrotaVoiceText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isFrotaBrazilianPlate(value) {
  const plate = normalizePlateInput(value);
  return /^[A-Z]{3}\d{4}$/.test(plate) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(plate);
}

function convertFrotaSpokenPlateToken(token) {
  const normalized = normalizeFrotaVoiceText(token);
  if (!normalized) return '';
  if (FROTA_VOICE_SEQUENCE_MAP[normalized]) return FROTA_VOICE_SEQUENCE_MAP[normalized];
  if (FROTA_VOICE_DIGIT_MAP[normalized]) return FROTA_VOICE_DIGIT_MAP[normalized];
  if (FROTA_VOICE_LETTER_MAP[normalized]) return FROTA_VOICE_LETTER_MAP[normalized];
  return /^[a-z0-9]+$/.test(normalized) ? normalized.toUpperCase() : '';
}

function repairFrotaSpokenPlate(value) {
  const plate = normalizePlateInput(value);
  if (isFrotaBrazilianPlate(plate)) return plate;
  if (/^[A-Z]{4}\d[A-Z]\d{2}$/.test(plate)) {
    for (let index = 1; index < 4; index += 1) {
      if (plate[index] !== plate[index - 1]) continue;
      const repaired = plate.slice(0, index) + plate.slice(index + 1);
      if (isFrotaBrazilianPlate(repaired)) return repaired;
    }
  }
  return '';
}

function extractFrotaSpokenPlate(value) {
  const normalized = normalizeFrotaVoiceText(value);
  if (!normalized) return '';
  const combined = repairFrotaSpokenPlate(normalized.split(' ').map(convertFrotaSpokenPlateToken).join(''));
  if (combined) return combined;
  return repairFrotaSpokenPlate(normalized.replace(/[^a-z0-9]/g, ''));
}

function extractFrotaSpokenChassisSuffix(value) {
  const normalized = normalizeFrotaVoiceText(value);
  if (!normalized) return '';
  const combined = normalizeFrotaChassis(normalized.split(' ').map(convertFrotaSpokenPlateToken).join(''));
  if (combined.length >= 6) return combined.slice(-6);
  const compact = normalizeFrotaChassis(normalized);
  return compact.length >= 6 ? compact.slice(-6) : '';
}

function showFrotaVoiceStatus(title, message, { listening = false, autoHideMs = 0 } = {}) {
  const banner = document.getElementById('frotaVoiceStatus');
  if (!banner) return;
  if (frotaVoiceStatusTimer) {
    clearTimeout(frotaVoiceStatusTimer);
    frotaVoiceStatusTimer = null;
  }
  document.getElementById('frotaVoiceStatusTitle').textContent = title;
  document.getElementById('frotaVoiceStatusText').textContent = message;
  banner.classList.remove('d-none');
  banner.classList.toggle('is-listening', listening);
  if (autoHideMs > 0) {
    frotaVoiceStatusTimer = setTimeout(() => banner.classList.add('d-none'), autoHideMs);
  }
}

function updateFrotaVoiceButton() {
  const button = document.getElementById('frotaVoiceCommandBtn');
  if (!button) return;
  button.disabled = !FrotaVoiceRecognitionCtor;
  button.classList.toggle('is-listening', frotaVoiceEnabled);
  button.title = !FrotaVoiceRecognitionCtor
    ? 'Reconhecimento de voz indisponível neste navegador'
    : frotaVoiceEnabled
      ? 'Escuta ativa. Toque para parar'
      : 'Ativar comandos de voz da Preparação';
}

function clearFrotaVoiceCommit({ clearTranscript = false } = {}) {
  if (frotaVoiceCommitTimer) {
    clearTimeout(frotaVoiceCommitTimer);
    frotaVoiceCommitTimer = null;
  }
  if (clearTranscript) {
    frotaVoiceTranscriptPrefix = '';
    frotaVoiceSessionTranscript = '';
    frotaVoicePendingTranscript = '';
  }
}

function mergeFrotaVoiceTranscriptParts(baseTranscript, nextTranscript) {
  const baseWords = String(baseTranscript || '').trim().split(/\s+/).filter(Boolean);
  const nextWords = String(nextTranscript || '').trim().split(/\s+/).filter(Boolean);
  if (!baseWords.length) return nextWords.join(' ');
  if (!nextWords.length) return baseWords.join(' ');
  const normalizeWord = word => String(word || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLocaleLowerCase('pt-BR');
  const baseKeys = baseWords.map(normalizeWord);
  const nextKeys = nextWords.map(normalizeWord);
  const maxOverlap = Math.min(baseKeys.length, nextKeys.length);
  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    const baseStart = baseKeys.length - overlap;
    const matches = nextKeys
      .slice(0, overlap)
      .every((word, index) => word === baseKeys[baseStart + index]);
    if (matches) {
      return [...baseWords, ...nextWords.slice(overlap)].join(' ');
    }
  }
  return [...baseWords, ...nextWords].join(' ');
}

function collectFrotaVoiceRecognitionTranscript(results) {
  return Array.from(results || []).reduce((transcript, result) => {
    return mergeFrotaVoiceTranscriptParts(transcript, result?.[0]?.transcript || '');
  }, '');
}

function clearFrotaVoiceFilters(statusFilter = '') {
  activePurposeFilter = '';
  activeGuideFilter = '';
  activeStatusFilter = statusFilter;
  expandedFrotaConjuntoId = null;
  selectedFrotaVehicleId = null;
  const search = document.getElementById('frotaSearch');
  if (search) search.value = '';
}

function applyFrotaVoiceFilter(statusFilter) {
  clearFrotaVoiceFilters(statusFilter);
  renderVehicleRows();
  renderDetails(null);
  document.getElementById('frotaVehiclesTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getFrotaVoiceReadyVehicles() {
  return frotaVehicles.filter(vehicle => vehicle.status === 'pronto' && !vehicle.deliveredAt);
}

function applyFrotaVoiceSearch(query, label) {
  const value = String(query || '').trim();
  if (!value) return { success: false, message: `Informe o ${label} que deseja buscar.` };
  clearFrotaVoiceFilters();
  document.getElementById('frotaSearch').value = value;
  renderVehicleRows();
  renderDetails(null);
  document.getElementById('frotaVehiclesTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const count = frotaVehicles.filter(vehicle => frotaVehicleMatchesSearch(vehicle, value)).length;
  return {
    success: true,
    message: `Mostrando ${count} veículo${count === 1 ? '' : 's'} para ${label} ${value}.`
  };
}

function executeFrotaVoiceCommand(transcript) {
  const spoken = String(transcript || '').trim();
  const normalized = normalizeFrotaVoiceText(spoken);
  const openPlateMatch = spoken.match(/^abrir\s+prepara[cç][aã]o\s+(?:da\s+)?placa\s+(.+)$/i);
  const openChassisMatch = spoken.match(/^abrir\s+prepara[cç][aã]o\s+(?:do\s+)?chassi\s+(.+)$/i);
  if (openPlateMatch || openChassisMatch) {
    const isChassis = Boolean(openChassisMatch);
    const identifier = isChassis
      ? extractFrotaSpokenChassisSuffix(openChassisMatch[1])
      : extractFrotaSpokenPlate(openPlateMatch[1]);
    if (!identifier) {
      return { success: false, message: `Não consegui entender ${isChassis ? 'o chassi' : 'a placa'} informado.` };
    }
    const vehicle = isChassis
      ? getFrotaVehicleByChassisSuffix(identifier)
      : getFrotaVehicleByPlate(identifier);
    if (!vehicle) {
      clearFrotaVoiceFilters();
      document.getElementById('frotaSearch').value = identifier;
      renderVehicleRows();
      renderDetails(null);
      return { success: false, message: `Não encontrei ${isChassis ? 'o chassi' : 'a placa'} ${identifier} na Preparação.` };
    }
    clearFrotaVoiceFilters();
    document.getElementById('frotaSearch').value = identifier;
    renderVehicleRows();
    openChecklistWindow(vehicle);
    playFrotaVoiceAudio('requestedVehicle');
    return { success: true, message: `Abrindo a preparação ${isChassis ? `do chassi ${identifier}` : `da placa ${identifier}`}.` };
  }

  const typeSearchMatch = normalized.match(/^(?:buscar|procurar|pesquisar|mostrar)(?: por)?(?: veiculos?)?(?: por| do)? tipo (.+)$/);
  if (typeSearchMatch) {
    return applyFrotaVoiceSearch(typeSearchMatch[1], 'tipo');
  }

  const modelSearchMatch = normalized.match(/^(?:buscar|procurar|pesquisar|mostrar)(?: por)?(?: veiculos?)?(?: por| do)? modelo (.+)$/);
  if (modelSearchMatch) {
    return applyFrotaVoiceSearch(modelSearchMatch[1], 'modelo');
  }

  if (normalized === 'mostrar veiculos em preparacao' || normalized === 'mostrar somente veiculos em preparacao') {
    applyFrotaVoiceFilter('preparacao');
    const count = frotaVehicles.filter(vehicle => vehicle.status !== 'pronto' && !vehicle.deliveredAt).length;
    playFrotaVoiceAudio('preparing');
    return { success: true, message: `Mostrando ${count} veículo${count === 1 ? '' : 's'} em preparação.` };
  }

  if (normalized === 'quantos veiculos estao prontos' || normalized === 'quantos veiculos prontos') {
    const count = getFrotaVoiceReadyVehicles().length;
    return { success: true, message: `${count} veículo${count === 1 ? ' está' : 's estão'} pronto${count === 1 ? '' : 's'} aguardando entrega.` };
  }

  if (normalized === 'mostrar veiculos prontos') {
    applyFrotaVoiceFilter('pronto-disponivel');
    const count = getFrotaVoiceReadyVehicles().length;
    playFrotaVoiceAudio('ready');
    return { success: true, message: `Mostrando ${count} veículo${count === 1 ? '' : 's'} pronto${count === 1 ? '' : 's'} aguardando entrega.` };
  }

  if (normalized === 'mostrar veiculos entregues') {
    applyFrotaVoiceFilter('entregue');
    const count = frotaVehicles.filter(vehicle => Boolean(vehicle.deliveredAt)).length;
    playFrotaVoiceAudio('delivered');
    return { success: true, message: `Mostrando ${count} veículo${count === 1 ? '' : 's'} entregue${count === 1 ? '' : 's'}.` };
  }

  return {
    success: false,
    message: `Comando não reconhecido: ${spoken}.`
  };
}

function scheduleFrotaVoiceRestart(delayMs = 700) {
  if (!frotaVoiceEnabled || frotaVoiceManualStop || frotaVoiceAudioPlaying) return;
  if (frotaVoiceRestartTimer) clearTimeout(frotaVoiceRestartTimer);
  frotaVoiceRestartTimer = setTimeout(startFrotaVoiceRecognition, delayMs);
}

function startFrotaVoiceRecognition() {
  if (!frotaVoiceEnabled || frotaVoiceListening || frotaVoiceProcessing || frotaVoiceAudioPlaying || !frotaVoiceRecognition) return;
  if (frotaVoiceRestartTimer) {
    clearTimeout(frotaVoiceRestartTimer);
    frotaVoiceRestartTimer = null;
  }
  try {
    frotaVoiceRecognition.start();
  } catch (error) {
    scheduleFrotaVoiceRestart(800);
  }
}

function scheduleFrotaVoiceCommit() {
  clearFrotaVoiceCommit();
  frotaVoiceCommitTimer = setTimeout(() => {
    frotaVoiceCommitTimer = null;
    const transcript = frotaVoicePendingTranscript.trim();
    if (!transcript || frotaVoiceProcessing) return;
    frotaVoiceTranscriptPrefix = '';
    frotaVoiceSessionTranscript = '';
    frotaVoicePendingTranscript = '';
    frotaVoiceProcessing = true;
    try {
      frotaVoiceRecognition?.stop();
    } catch (error) {}
    const result = executeFrotaVoiceCommand(transcript);
    frotaVoiceProcessing = false;
    showFrotaVoiceStatus(
      result.success ? 'Comando executado' : 'Comando não executado',
      result.message,
      { autoHideMs: result.success ? 4200 : 5200 }
    );
    showToast(result.message, result.success ? 'success' : 'warning');
  }, FROTA_VOICE_COMMIT_DELAY_MS);
}

function stopFrotaVoiceRecognition() {
  frotaVoiceEnabled = false;
  frotaVoiceManualStop = true;
  clearFrotaVoiceCommit({ clearTranscript: true });
  if (frotaVoiceRestartTimer) clearTimeout(frotaVoiceRestartTimer);
  frotaVoiceRestartTimer = null;
  try {
    frotaVoiceRecognition?.stop();
  } catch (error) {}
  frotaVoiceListening = false;
  frotaVoiceProcessing = false;
  updateFrotaVoiceButton();
  showFrotaVoiceStatus('Comando de voz', 'Escuta interrompida.', { autoHideMs: 2500 });
}

function pauseFrotaVoiceUntilNextTouch({ preservePendingCommand = false } = {}) {
  frotaVoiceEnabled = false;
  frotaVoiceManualStop = true;
  if (!preservePendingCommand) {
    clearFrotaVoiceCommit({ clearTranscript: true });
  }
  updateFrotaVoiceButton();
  showFrotaVoiceStatus(
    'Microfone pausado',
    'Toque no microfone quando quiser falar outro comando.',
    { autoHideMs: 4200 }
  );
}

function toggleFrotaVoiceRecognition() {
  if (!FrotaVoiceRecognitionCtor) {
    showFrotaVoiceStatus('Comando de voz', 'Este navegador não oferece reconhecimento de voz.', { autoHideMs: 4500 });
    return;
  }
  if (frotaVoiceEnabled) {
    stopFrotaVoiceRecognition();
    return;
  }
  frotaVoiceEnabled = true;
  frotaVoiceManualStop = false;
  clearFrotaVoiceCommit({ clearTranscript: true });
  updateFrotaVoiceButton();
  startFrotaVoiceRecognition();
}

function initFrotaVoiceRecognition() {
  updateFrotaVoiceButton();
  if (!FrotaVoiceRecognitionCtor) return;
  frotaVoiceRecognition = new FrotaVoiceRecognitionCtor();
  frotaVoiceRecognition.lang = 'pt-BR';
  frotaVoiceRecognition.continuous = true;
  frotaVoiceRecognition.interimResults = true;
  frotaVoiceRecognition.maxAlternatives = 1;
  frotaVoiceRecognition.onstart = () => {
    frotaVoiceListening = true;
    frotaVoiceSessionTranscript = '';
    updateFrotaVoiceButton();
    showFrotaVoiceStatus('Comando de voz', 'Ouvindo... termine de falar e aguarde um instante.', { listening: true });
  };
  frotaVoiceRecognition.onresult = event => {
    frotaVoiceSessionTranscript = collectFrotaVoiceRecognitionTranscript(event.results);
    frotaVoicePendingTranscript = mergeFrotaVoiceTranscriptParts(frotaVoiceTranscriptPrefix, frotaVoiceSessionTranscript);
    if (!frotaVoicePendingTranscript) return;
    showFrotaVoiceStatus('Ouvindo o comando', frotaVoicePendingTranscript, { listening: true });
    scheduleFrotaVoiceCommit();
  };
  frotaVoiceRecognition.onerror = event => {
    const error = String(event.error || '');
    frotaVoiceListening = false;
    if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(error)) {
      frotaVoiceEnabled = false;
      frotaVoiceManualStop = true;
      clearFrotaVoiceCommit({ clearTranscript: true });
      showFrotaVoiceStatus('Microfone indisponível', 'Libere o acesso ao microfone no navegador e tente novamente.', { autoHideMs: 5200 });
    }
    updateFrotaVoiceButton();
  };
  frotaVoiceRecognition.onend = () => {
    frotaVoiceListening = false;
    if (!frotaVoiceProcessing && frotaVoicePendingTranscript) {
      frotaVoiceTranscriptPrefix = frotaVoicePendingTranscript;
      frotaVoiceSessionTranscript = '';
    }
    updateFrotaVoiceButton();
    if (
      frotaVoiceEnabled
      && !frotaVoiceManualStop
      && !frotaVoiceAudioPlaying
      && FROTA_VOICE_REQUIRES_MANUAL_RESTART
    ) {
      pauseFrotaVoiceUntilNextTouch({ preservePendingCommand: Boolean(frotaVoicePendingTranscript) });
    } else if (!frotaVoiceAudioPlaying) {
      scheduleFrotaVoiceRestart(frotaVoiceProcessing ? 900 : 450);
    }
  };
}

function bindEvents() {
  document.getElementById('btnBackToPatio').addEventListener('click', () => { window.location.href = '/'; });
  document.getElementById('frotaVoiceCommandBtn').addEventListener('click', toggleFrotaVoiceRecognition);
  document.getElementById('btnMountFrotaConjunto').addEventListener('click', openFrotaConjuntoModal);
  document.getElementById('frotaConjuntoForm').addEventListener('submit', event => saveFrotaConjunto(event).catch(error => showToast(error.message, 'danger')));
  document.getElementById('frotaEntregaConjuntoForm').addEventListener('submit', event => saveFrotaEntrega(event).catch(error => showToast(error.message, 'danger')));
  document.getElementById('frotaConjuntoViewBar').addEventListener('click', event => {
    if (!event.target.closest('#btnCollapseConjunto')) return;
    expandedFrotaConjuntoId = null;
    selectedFrotaVehicleId = null;
    renderVehicleRows();
    renderDetails(null);
  });
  document.getElementById('btnBackupFrota').addEventListener('click', () => backupFrotaData().catch(error => showToast(error.message, 'danger')));
  document.getElementById('btnRestoreFrota').addEventListener('click', () => document.getElementById('frotaRestoreInput').click());
  document.getElementById('btnLogoutFrota').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/preparacao';
  });
  document.getElementById('frotaRestoreInput').addEventListener('change', event => restoreFrotaFromFile(event.target.files?.[0]));
  document.getElementById('btnRefreshFrota').addEventListener('click', () => loadFrotaData().then(() => showToast('Módulo atualizado.', 'success')));
  document.getElementById('btnLookupPlate').addEventListener('click', () => runVehicleSearch().catch(error => showToast(error.message, 'danger')));
  document.getElementById('frotaVehicleForm').addEventListener('submit', event => saveVehicle(event).catch(error => showToast(error.message, 'danger')));
  document.getElementById('frotaEditForm').addEventListener('submit', event => saveEditedVehicle(event).catch(error => showToast(error.message, 'danger')));
  document.getElementById('frotaPlate').addEventListener('input', event => {
    event.target.value = normalizePlateInput(event.target.value);
    schedulePlateLookup();
  });
  document.getElementById('frotaEditPlate').addEventListener('input', event => {
    event.target.value = normalizePlateInput(event.target.value);
  });
  document.getElementById('frotaVehicleType').addEventListener('input', handleFrotaFormFilterInput);
  document.getElementById('frotaRenavam').addEventListener('input', handleFrotaFormFilterInput);
  document.getElementById('frotaChassis').addEventListener('input', () => {
    scheduleChassisLookup();
    handleFrotaFormFilterInput();
  });
  ['frotaPlate', 'frotaVehicleType', 'frotaChassis', 'frotaRenavam'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', handleSearchFieldEnter);
  });
  document.getElementById('frotaSearch').addEventListener('input', renderVehicleRows);
  document.querySelectorAll('[data-purpose-filter]').forEach(button => {
    button.addEventListener('click', () => {
      const nextFilter = normalizePurpose(button.dataset.purposeFilter);
      activePurposeFilter = activePurposeFilter === nextFilter ? '' : nextFilter;
      renderVehicleRows();
    });
  });
  document.querySelectorAll('[data-guide-filter]').forEach(button => {
    button.addEventListener('click', () => {
      const nextFilter = String(button.dataset.guideFilter || '');
      activeGuideFilter = activeGuideFilter === nextFilter ? '' : nextFilter;
      renderVehicleRows();
    });
  });
  document.querySelectorAll('[data-status-filter]').forEach(button => {
    button.addEventListener('click', () => {
      const nextFilter = String(button.dataset.statusFilter || '');
      activeStatusFilter = activeStatusFilter === nextFilter ? '' : nextFilter;
      expandedFrotaConjuntoId = null;
      selectedFrotaVehicleId = null;
      renderVehicleRows();
      renderDetails(null);
    });
  });
  document.getElementById('frotaVehiclesTable').addEventListener('click', event => {
    const conjuntoCard = event.target.closest('.conjunto-card');
    if (conjuntoCard) {
      const conjunto = frotaConjuntos.find(item => String(item.id) === String(conjuntoCard.dataset.conjuntoId));
      if (event.target.closest('.prep-delete-conjunto')) {
        deleteFrotaConjunto(conjunto).catch(error => showToast(error.message, 'danger'));
        return;
      }
      if (event.target.closest('.prep-deliver-conjunto')) {
        openFrotaEntregaConjuntoModal(conjunto);
        return;
      }
      if (event.target.closest('.prep-undo-delivery-conjunto')) {
        undoFrotaEntrega('conjunto', conjunto).catch(error => showToast(error.message, 'danger'));
        return;
      }
      if (event.target.closest('.prep-edit-conjunto-vehicles')) {
        expandedFrotaConjuntoId = conjunto?.id || null;
        selectedFrotaVehicleId = null;
        renderVehicleRows();
        renderDetails(null);
        return;
      }
      if (event.target.closest('.prep-conjunto-edit-menu')) return;
      if (event.target.closest('.prep-view-conjunto') || conjuntoCard === event.target.closest('.conjunto-card')) {
        expandedFrotaConjuntoId = conjunto?.id || null;
        selectedFrotaVehicleId = null;
        renderVehicleRows();
        renderDetails(null);
      }
      return;
    }
    const card = event.target.closest('.vehicle-card');
    if (!card) return;
    const vehicleId = card.dataset.id;
    const vehicle = frotaVehicles.find(item => String(item.id) === String(vehicleId));
    if (event.target.closest('.prep-undo-delivery-vehicle')) {
      undoFrotaEntrega('vehicle', vehicle).catch(error => showToast(error.message, 'danger'));
      return;
    }
    if (event.target.closest('.prep-deliver-vehicle')) {
      openFrotaEntregaVehicleModal(vehicle);
      return;
    }
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
      if (!canManagePreparation()) return;
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
  primeFrotaVoiceAudio();
  document.addEventListener('pointerdown', unlockFrotaVoiceAudio, { passive: true });
  document.addEventListener('keydown', unlockFrotaVoiceAudio);
  bindEvents();
  initFrotaVoiceRecognition();
  try {
    const auth = await fetchJson('/api/auth/me');
    if (!auth.authenticated) {
      window.location.href = '/preparacao';
      return;
    }
    if (!auth.fleetPreparation?.canAccess) {
      window.location.href = '/';
      return;
    }
    currentFrotaAuth = {
      user: auth.user,
      canManage: Boolean(auth.fleetPreparation?.canManage),
      canCreateVehicles: Boolean(auth.fleetPreparation?.canCreateVehicles),
      canEditVehicles: Boolean(auth.fleetPreparation?.canEditVehicles),
      canEditConcessionaria: Boolean(auth.fleetPreparation?.canEditConcessionaria),
      canDeliver: Boolean(auth.fleetPreparation?.canDeliver),
      allowedAreas: auth.fleetPreparation?.allowedAreas || []
    };
    applyFrotaPermissions();
    await loadFrotaData({ keepSelection: false });
  } catch (error) {
    showToast(error.message || 'Não foi possível carregar o módulo.', 'danger');
  }
});
