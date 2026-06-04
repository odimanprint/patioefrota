const NOTE_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const NOTE_INDEX = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11
};
const STRING_LABELS = ["E", "A", "D", "G", "B", "e"];
const CHORD_FAMILY_META = {
  major: { label: "Maior", intervals: [0, 4, 7], lookup: "", shapeFamily: "major" },
  minor: { label: "Menor", intervals: [0, 3, 7], lookup: "m", shapeFamily: "minor" },
  "7": { label: "Sétima", intervals: [0, 4, 7, 10], lookup: "7", shapeFamily: "7" },
  maj7: { label: "Sétima maior", intervals: [0, 4, 7, 11], lookup: "maj7", shapeFamily: "maj7" },
  m7: { label: "Menor com sétima", intervals: [0, 3, 7, 10], lookup: "m7", shapeFamily: "m7" },
  sus2: { label: "Suspenso 2", intervals: [0, 2, 7], lookup: "sus2", shapeFamily: "major", approximate: true },
  sus4: { label: "Suspenso 4", intervals: [0, 5, 7], lookup: "sus4", shapeFamily: "sus4" },
  "7sus4": { label: "Sétima com quarta", intervals: [0, 5, 7, 10], lookup: "7sus4", shapeFamily: "7sus4" },
  add9: { label: "Com nona", intervals: [0, 4, 7, 2], lookup: "add9", shapeFamily: "major", approximate: true },
  madd9: { label: "Menor com nona", intervals: [0, 3, 7, 2], lookup: "madd9", shapeFamily: "minor", approximate: true },
  "9": { label: "Sétima com nona", intervals: [0, 4, 7, 10, 2], lookup: "9", shapeFamily: "7", approximate: true },
  m9: { label: "Menor com nona", intervals: [0, 3, 7, 10, 2], lookup: "m9", shapeFamily: "m7", approximate: true },
  power: { label: "Power chord", intervals: [0, 7], lookup: "5", shapeFamily: "power" },
  dim: { label: "Diminuto", intervals: [0, 3, 6], lookup: "dim", shapeFamily: null },
  aug: { label: "Aumentado", intervals: [0, 4, 8], lookup: "aug", shapeFamily: null }
};
const CHORD_SHAPE_LIBRARY = {
  C: { frets: ["x", 3, 2, 0, 1, 0], label: "Forma aberta" },
  D: { frets: ["x", "x", 0, 2, 3, 2], label: "Forma aberta" },
  E: { frets: [0, 2, 2, 1, 0, 0], label: "Forma aberta" },
  F: { frets: [1, 3, 3, 2, 1, 1], label: "Forma aberta" },
  G: { frets: [3, 2, 0, 0, 0, 3], label: "Forma aberta" },
  A: { frets: ["x", 0, 2, 2, 2, 0], label: "Forma aberta" },
  Bb: { frets: ["x", 1, 3, 3, 3, 1], label: "Forma sugerida", baseFret: 1 },
  B: { frets: ["x", 2, 4, 4, 4, 2], label: "Forma sugerida", baseFret: 2 },
  Cm: { frets: ["x", 3, 5, 5, 4, 3], label: "Forma sugerida", baseFret: 3 },
  Dm: { frets: ["x", "x", 0, 2, 3, 1], label: "Forma aberta" },
  Em: { frets: [0, 2, 2, 0, 0, 0], label: "Forma aberta" },
  Fm: { frets: [1, 3, 3, 1, 1, 1], label: "Forma sugerida", baseFret: 1 },
  "F#m": { frets: [2, 4, 4, 2, 2, 2], label: "Forma sugerida", baseFret: 2 },
  Gm: { frets: [3, 5, 5, 3, 3, 3], label: "Forma sugerida", baseFret: 3 },
  Am: { frets: ["x", 0, 2, 2, 1, 0], label: "Forma aberta" },
  Bm: { frets: ["x", 2, 4, 4, 3, 2], label: "Forma sugerida", baseFret: 2 },
  C7: { frets: ["x", 3, 2, 3, 1, 0], label: "Forma aberta" },
  D7: { frets: ["x", "x", 0, 2, 1, 2], label: "Forma aberta" },
  E7: { frets: [0, 2, 0, 1, 0, 0], label: "Forma aberta" },
  F7: { frets: [1, 3, 1, 2, 1, 1], label: "Forma sugerida", baseFret: 1 },
  G7: { frets: [3, 2, 0, 0, 0, 1], label: "Forma aberta" },
  A7: { frets: ["x", 0, 2, 0, 2, 0], label: "Forma aberta" },
  A9: { frets: ["x", 0, 2, 4, 2, 3], label: "Forma aberta" },
  B7: { frets: ["x", 2, 1, 2, 0, 2], label: "Forma aberta" },
  Cmaj7: { frets: ["x", 3, 2, 0, 0, 0], label: "Forma aberta" },
  Dmaj7: { frets: ["x", "x", 0, 2, 2, 2], label: "Forma aberta" },
  Emaj7: { frets: [0, 2, 1, 1, 0, 0], label: "Forma aberta" },
  Fmaj7: { frets: ["x", "x", 3, 2, 1, 0], label: "Forma aberta" },
  Amaj7: { frets: ["x", 0, 2, 1, 2, 0], label: "Forma aberta" },
  Am7: { frets: ["x", 0, 2, 0, 1, 0], label: "Forma aberta" },
  Bm7: { frets: ["x", 2, 4, 2, 3, 2], label: "Forma sugerida", baseFret: 2 },
  Dm7: { frets: ["x", "x", 0, 2, 1, 1], label: "Forma aberta" },
  Em7: { frets: [0, 2, 2, 0, 3, 0], label: "Forma aberta" },
  "F#m7": { frets: [2, 4, 2, 2, 2, 2], label: "Forma sugerida", baseFret: 2 },
  Gm7: { frets: [3, 5, 3, 3, 3, 3], label: "Forma sugerida", baseFret: 3 },
  Asus4: { frets: ["x", 0, 2, 2, 3, 0], label: "Forma aberta" },
  Dsus4: { frets: ["x", "x", 0, 2, 3, 3], label: "Forma aberta" },
  Esus4: { frets: [0, 2, 2, 2, 0, 0], label: "Forma aberta" },
  A7sus4: { frets: ["x", 0, 2, 0, 3, 0], label: "Forma aberta" },
  Cadd9: { frets: ["x", 3, 2, 0, 3, 3], label: "Forma aberta" },
  Gadd9: { frets: [3, 2, 0, 0, 3, 0], label: "Forma aberta" },
  "C/E": { frets: [0, 3, 2, 0, 1, 0], label: "Baixo em E" },
  "G/B": { frets: ["x", 2, 0, 0, 0, 3], label: "Baixo em B" },
  "D/F#": { frets: [2, "x", 0, 2, 3, 2], label: "Baixo em F#" },
  "A/C#": {
    frets: ["x", 4, 2, 2, 2, 0],
    label: "Baixo em C#",
    barres: [{ fret: 2, fromString: 2, toString: 4 }]
  },
  "A9/C#": { frets: ["x", 4, 5, 4, 5, 5], label: "Baixo em C#", baseFret: 4 },
  "E/G#": { frets: [4, 2, 2, 1, 0, 0], label: "Baixo em G#", baseFret: 1 }
};
const CUSTOM_MAJOR_BASS_SHAPE_KEYS = ["C/E", "D/F#", "E/G#", "A/C#"];
const MOVABLE_CHORD_SHAPES = {
  major: {
    lowE: { template: [0, 2, 2, 1, 0, 0], label: "Forma móvel de E" },
    a: { template: ["x", 0, 2, 2, 2, 0], label: "Forma móvel de A" }
  },
  minor: {
    lowE: { template: [0, 2, 2, 0, 0, 0], label: "Forma móvel de Em" },
    a: { template: ["x", 0, 2, 2, 1, 0], label: "Forma móvel de Am" }
  },
  "7": {
    lowE: { template: [0, 2, 0, 1, 0, 0], label: "Forma móvel de E7" },
    a: { template: ["x", 0, 2, 0, 2, 0], label: "Forma móvel de A7" }
  },
  maj7: {
    lowE: { template: [0, 2, 1, 1, 0, 0], label: "Forma móvel de E7M" },
    a: { template: ["x", 0, 2, 1, 2, 0], label: "Forma móvel de A7M" }
  },
  m7: {
    lowE: { template: [0, 2, 0, 0, 0, 0], label: "Forma móvel de Em7" },
    a: { template: ["x", 0, 2, 0, 1, 0], label: "Forma móvel de Am7" }
  },
  sus4: {
    lowE: { template: [0, 2, 2, 2, 0, 0], label: "Forma móvel de Esus4" },
    a: { template: ["x", 0, 2, 2, 3, 0], label: "Forma móvel de Asus4" }
  },
  "7sus4": {
    lowE: { template: [0, 2, 0, 2, 0, 0], label: "Forma móvel de E7sus4" },
    a: { template: ["x", 0, 2, 0, 3, 0], label: "Forma móvel de A7sus4" }
  },
  power: {
    lowE: { template: [0, 2, 2, "x", "x", "x"], label: "Power chord" },
    a: { template: ["x", 0, 2, 2, "x", "x"], label: "Power chord" }
  }
};
const OPEN_STRING_NOTE_INDEX = { lowE: 4, a: 9 };
const OFFLINE_DB_NAME = "mdl-acervo-offline";
const OFFLINE_DB_VERSION = 2;
const OFFLINE_BUNDLE_SIZE = 80;
const INSTALL_PROMPT_AUTO_HIDE_MS = 3000;
const LOCAL_COVER_MAX_BYTES = 4 * 1024 * 1024;
const LOCAL_AUDIO_MAX_BYTES = 120 * 1024 * 1024;
const TUNER_MIN_FREQUENCY = 65;
const TUNER_MAX_FREQUENCY = 1200;
const TUNER_SILENCE_RMS = 0.012;
const TUNER_UPDATE_INTERVAL_MS = 80;
const LOGIN_USERS = {
  lider: { label: "Líder", role: "leader", initial: "L" },
  musico: { label: "Músico", role: "musician", initial: "M" }
};
let deferredInstallPrompt = null;
let installPromptAutoHideTimer = null;

const state = {
  songs: [],
  filtered: [],
  currentView: "acervo",
  currentSongId: null,
  previousView: "acervo",
  appStarted: false,
  deviceId: ensureDeviceId(),
  deviceLabel: getDeviceLabel(),
  auth: readStoredAuth(),
  selectedLoginUser: localStorage.getItem("mdl.lastLoginUser") || "lider",
  currentSheetHtml: "",
  transposeOffset: 0,
  baseKey: null,
  activeChordBase: null,
  chordGuideOpen: false,
  theme: localStorage.getItem("mdl.theme") || "light",
  generatedAt: null,
  catalogReady: false,
  playEditing: false,
  autoScrollTimer: null,
  singerMode: localStorage.getItem("mdl.singerMode") === "true",
  tunerOpen: false,
  tunerRunning: false,
  tunerStream: null,
  tunerAudioContext: null,
  tunerSource: null,
  tunerAnalyser: null,
  tunerBuffer: null,
  tunerFrame: null,
  tunerLastAt: 0,
  voiceToneRunning: false,
  voiceToneStream: null,
  voiceToneContext: null,
  voiceToneSource: null,
  voiceToneAnalyser: null,
  voiceToneBuffer: null,
  voiceToneFrame: null,
  voiceToneDetected: null,
  offlineSongs: new Set(),
  offlineArtistDownloads: new Map(),
  songMedia: new Map(),
  artistThumbs: new Map(),
  publicArtistThumbs: new Map(),
  localAudioUrls: new Map(),
  pendingCoverSongId: null,
  pendingAudioSongId: null,
  pendingArtistThumb: null,
  readerFont: Number(localStorage.getItem("mdl.readerFont") || 14),
  favorites: new Set(JSON.parse(localStorage.getItem("mdl.favorites") || "[]")),
  playUpdatedAt: localStorage.getItem("mdl.playEnsaioUpdatedAt") || "",
  playDirty: localStorage.getItem("mdl.playEnsaioDirty") === "true",
  play: normalizePlayEntries(JSON.parse(localStorage.getItem("mdl.playEnsaio") || "[]"), null),
  contacts: JSON.parse(localStorage.getItem("mdl.contacts") || "[]"),
  devMode: false,
  devToken: sessionStorage.getItem("mdl.devToken") || "",
  devTapCount: 0,
  devTapTimer: null,
  devCurrentSongId: null,
  devPreviewTranspose: 0,
  devPreviewSingerMode: false,
  devChordName: "C",
  devChordFrets: ["x", 3, 2, 0, 1, 0],
  devChordBaseFret: 1,
  devChordBarres: [],
  customChordShapes: {}
};

const sampleSongs = [
  { id: "sample-a-casa-e-sua", title: "A Casa É Sua", artist: "Julliany Souza", collection: "Exemplo", fileType: "html", key: "C" },
  { id: "sample-me-atraiu", title: "Me Atraiu", artist: "Gabriela Rocha", collection: "Exemplo", fileType: "html", key: "D" },
  { id: "sample-consagracao", title: "Consagração", artist: "Aline Barros", collection: "Exemplo", fileType: "html", key: "A" }
];

const sampleSheets = {
  "sample-a-casa-e-sua": `<span class="part">Intro</span>
<i>C     G/B     Am7     F</i>

<span class="part">Verso</span>
<i>C</i>        <i>G/B</i>
Linha da letra alinhada
<i>Am7</i>       <i>F</i>
Com acordes destacados

<span class="part">Coro</span>
<i>C</i>         <i>G</i>
Texto grande e limpo
<i>Am7</i>       <i>F</i>
Para leitura no celular`,
  "sample-me-atraiu": `<span class="part">Intro</span>
<i>D     A/C#     Bm7     G</i>

<span class="part">Verso</span>
<i>D</i>         <i>A/C#</i>
Separada para o ensaio
<i>Bm7</i>       <i>G</i>
Com botões grandes`,
  "sample-consagracao": `<span class="part">Tom</span>
<i>A</i>

<span class="part">Verso</span>
<i>A</i>        <i>E/G#</i>
Cifra de exemplo
<i>F#m7</i>     <i>D</i>
Pronta para abrir`
};

const dom = {
  loginScreen: document.getElementById("loginScreen"),
  loginForm: document.getElementById("loginForm"),
  loginPassword: document.getElementById("loginPassword"),
  loginStatus: document.getElementById("loginStatus"),
  appShell: document.getElementById("appShell"),
  search: document.getElementById("searchInput"),
  topArtistStack: document.getElementById("topArtistStack"),
  dashboardPlaySummary: document.getElementById("dashboardPlaySummary"),
  dashboardSongCount: document.getElementById("dashboardSongCount"),
  dashboardArtistCount: document.getElementById("dashboardArtistCount"),
  dashboardAudioCount: document.getElementById("dashboardAudioCount"),
  dashboardFavoriteCount: document.getElementById("dashboardFavoriteCount"),
  dashboardPlayCount: document.getElementById("dashboardPlayCount"),
  dashboardArtistShortcutCount: document.getElementById("dashboardArtistShortcutCount"),
  libraryStats: document.getElementById("libraryStats"),
  favoriteStats: document.getElementById("favoriteStats"),
  playStats: document.getElementById("playStats"),
  artistStats: document.getElementById("artistStats"),
  playCount: document.getElementById("playCount"),
  worshipCount: document.getElementById("worshipCount"),
  worshipProgress: document.getElementById("worshipProgress"),
  editPlayButton: document.getElementById("editPlayButton"),
  songList: document.getElementById("songList"),
  favoriteList: document.getElementById("favoriteList"),
  playList: document.getElementById("playList"),
  artistList: document.getElementById("artistList"),
  readerTitle: document.getElementById("readerTitle"),
  readerArtist: document.getElementById("readerArtist"),
  toneButton: document.getElementById("toneButton"),
  autoButton: document.getElementById("autoButton"),
  singerModeButton: document.getElementById("singerModeButton"),
  tunerButton: document.getElementById("tunerButton"),
  tunerPanel: document.getElementById("tunerPanel"),
  tunerNote: document.getElementById("tunerNote"),
  tunerFrequency: document.getElementById("tunerFrequency"),
  tunerCents: document.getElementById("tunerCents"),
  tunerNeedle: document.getElementById("tunerNeedle"),
  tunerStartButton: document.getElementById("tunerStartButton"),
  readerMedia: document.getElementById("readerMedia"),
  readerCover: document.getElementById("readerCover"),
  readerAudioName: document.getElementById("readerAudioName"),
  readerAudioStatus: document.getElementById("readerAudioStatus"),
  localAudioPlayer: document.getElementById("localAudioPlayer"),
  localCoverInput: document.getElementById("localCoverInput"),
  artistThumbInput: document.getElementById("artistThumbInput"),
  localAudioInput: document.getElementById("localAudioInput"),
  chordSheet: document.getElementById("chordSheet"),
  chordGuide: document.getElementById("chordGuide"),
  chordGuideName: document.getElementById("chordGuideName"),
  chordGuideMeta: document.getElementById("chordGuideMeta"),
  chordGuideDiagram: document.getElementById("chordGuideDiagram"),
  chordGuideNotes: document.getElementById("chordGuideNotes"),
  chordGuideHint: document.getElementById("chordGuideHint"),
  themeToggleButton: document.getElementById("themeToggleButton"),
  themeToggleIcon: document.getElementById("themeToggleIcon"),
  accountButton: document.getElementById("accountButton"),
  accountInitial: document.getElementById("accountInitial"),
  accountModal: document.getElementById("accountModal"),
  accountForm: document.getElementById("accountForm"),
  accountRole: document.getElementById("accountRole"),
  accountName: document.getElementById("accountName"),
  accountStatus: document.getElementById("accountStatus"),
  accountEmail: document.getElementById("accountEmail"),
  currentPassword: document.getElementById("currentPassword"),
  newPassword: document.getElementById("newPassword"),
  confirmPassword: document.getElementById("confirmPassword"),
  resetModal: document.getElementById("resetModal"),
  resetForm: document.getElementById("resetForm"),
  resetRole: document.getElementById("resetRole"),
  resetDeviceLabel: document.getElementById("resetDeviceLabel"),
  resetEmail: document.getElementById("resetEmail"),
  resetCode: document.getElementById("resetCode"),
  resetNewPassword: document.getElementById("resetNewPassword"),
  resetConfirmPassword: document.getElementById("resetConfirmPassword"),
  resetStatus: document.getElementById("resetStatus"),
  installPrompt: document.getElementById("installPrompt"),
  installPromptText: document.getElementById("installPromptText"),
  installPromptButton: document.getElementById("installPromptButton"),
  readerFavoriteButton: document.getElementById("readerFavoriteButton"),
  devSongSearch: document.getElementById("devSongSearch"),
  devSongList: document.getElementById("devSongList"),
  devSongTitle: document.getElementById("devSongTitle"),
  devSongArtist: document.getElementById("devSongArtist"),
  devSongKey: document.getElementById("devSongKey"),
  devSongCollection: document.getElementById("devSongCollection"),
  devSongHtml: document.getElementById("devSongHtml"),
  devSongStatus: document.getElementById("devSongStatus"),
  devPreviewTitle: document.getElementById("devPreviewTitle"),
  devChordPreview: document.getElementById("devChordPreview"),
  devChordSearch: document.getElementById("devChordSearch"),
  devChordList: document.getElementById("devChordList"),
  devChordNameInput: document.getElementById("devChordName"),
  devChordNotes: document.getElementById("devChordNotes"),
  devChordBaseFret: document.getElementById("devChordBaseFret"),
  devChordBarre: document.getElementById("devChordBarre"),
  devChordGrid: document.getElementById("devChordGrid"),
  devChordStringModes: document.getElementById("devChordStringModes"),
  devChordStatus: document.getElementById("devChordStatus"),
  devChordPreviewName: document.getElementById("devChordPreviewName"),
  devChordPreviewDiagram: document.getElementById("devChordPreviewDiagram"),
  adminSongCount: document.getElementById("adminSongCount"),
  adminArtistCount: document.getElementById("adminArtistCount"),
  adminUpdatedAt: document.getElementById("adminUpdatedAt")
};

init();

async function init() {
  registerServiceWorker();
  initTheme();
  bindEvents();
  syncLoginSelection();
  syncAuthUi();

  if (!(await restoreSession())) {
    showLogin();
    return;
  }

  await startAuthenticatedApp();
}

async function startAuthenticatedApp() {
  showAuthenticatedApp();
  if (state.appStarted) {
    await loadSongs();
    await syncSharedPlay({ allowLeaderSeed: true, silent: true });
    filterSongs();
    renderAll();
    return;
  }

  state.appStarted = true;
  initInstallPrompt();
  await loadSongs();
  await syncSharedPlay({ allowLeaderSeed: true, silent: true });
  await refreshOfflineSongIds();
  await loadLocalMedia();
  applyPreviewState();
  applyReaderPreferences();
  filterSongs();
  renderAll();
  downloadPlayForOffline();

  const requestedView = new URLSearchParams(location.search).get("screen");
  const requestedSong = new URLSearchParams(location.search).get("song");
  if (location.pathname.toLowerCase().startsWith("/admin")) {
    showView("admin");
  } else if (requestedSong) {
    openSong(requestedSong);
  } else if (["acervo", "favoritas", "play", "artistas"].includes(requestedView)) {
    showView(requestedView);
  }

  setInterval(autoRefreshLibrary, 30000);
}

function readStoredAuth() {
  try {
    const stored = JSON.parse(localStorage.getItem("mdl.auth") || "null");
    if (!stored?.token || !stored?.user?.id) return null;
    return stored;
  } catch {
    localStorage.removeItem("mdl.auth");
    return null;
  }
}

function writeStoredAuth() {
  if (state.auth?.token && state.auth?.user) {
    localStorage.setItem("mdl.auth", JSON.stringify(state.auth));
  } else {
    localStorage.removeItem("mdl.auth");
  }
}

function ensureDeviceId() {
  const stored = String(localStorage.getItem("mdl.deviceId") || "").trim().toLowerCase();
  if (/^[a-z0-9_-]{12,80}$/.test(stored)) return stored;

  const nextId = makeDeviceId();
  localStorage.setItem("mdl.deviceId", nextId);
  return nextId;
}

function makeDeviceId() {
  const random = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  return `device_${random}`.slice(0, 80);
}

function getDeviceLabel() {
  const platform = navigator.userAgentData?.platform || navigator.platform || "aparelho";
  const kind = /mobile|android|iphone|ipad/i.test(navigator.userAgent || "") ? "mobile" : "desktop";
  return `${platform} ${kind}`.trim();
}

async function restoreSession() {
  if (!state.auth?.token) return false;

  try {
    const response = await fetch("/api/auth/session", {
      headers: authHeaders()
    });
    if (!response.ok) throw new Error("session-expired");
    const data = await response.json();
    state.auth = { token: state.auth.token, user: data.user };
    writeStoredAuth();
    syncAuthUi();
    return true;
  } catch {
    state.auth = null;
    writeStoredAuth();
    syncAuthUi();
    return false;
  }
}

function deviceHeaders(extra = {}) {
  return {
    "X-Device-Id": state.deviceId,
    ...extra
  };
}

function authHeaders(extra = {}) {
  return {
    ...deviceHeaders(extra),
    ...(state.auth?.token ? { Authorization: `Bearer ${state.auth.token}` } : {})
  };
}

function showLogin(message = "") {
  closeAccountModal(true);
  closeResetModal(true);
  if (dom.loginScreen) dom.loginScreen.hidden = false;
  if (dom.appShell) dom.appShell.hidden = true;
  if (dom.loginStatus) dom.loginStatus.textContent = message;
  setTimeout(() => dom.loginPassword?.focus(), 50);
}

function showAuthenticatedApp() {
  if (dom.loginScreen) dom.loginScreen.hidden = true;
  if (dom.appShell) dom.appShell.hidden = false;
  syncAuthUi();
}

function selectLoginUser(userId) {
  if (!LOGIN_USERS[userId]) return;
  state.selectedLoginUser = userId;
  localStorage.setItem("mdl.lastLoginUser", userId);
  syncLoginSelection();
  syncResetUi();
  if (dom.loginStatus) dom.loginStatus.textContent = "";
  dom.loginPassword?.focus();
}

function syncLoginSelection() {
  if (!LOGIN_USERS[state.selectedLoginUser]) state.selectedLoginUser = "lider";
  document.querySelectorAll("[data-action='select-login-user']").forEach((button) => {
    const selected = button.dataset.userId === state.selectedLoginUser;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

async function loginSelectedUser() {
  const password = dom.loginPassword?.value || "";
  if (!password) {
    if (dom.loginStatus) dom.loginStatus.textContent = "Digite a senha.";
    return;
  }

  if (dom.loginStatus) dom.loginStatus.textContent = "Entrando...";
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: deviceHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        userId: state.selectedLoginUser,
        password,
        deviceId: state.deviceId,
        deviceLabel: state.deviceLabel
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.token) throw new Error(data.error || "invalid-login");

    state.auth = { token: data.token, user: data.user };
    writeStoredAuth();
    localStorage.setItem("mdl.lastLoginUser", state.selectedLoginUser);
    if (dom.loginPassword) dom.loginPassword.value = "";
    await startAuthenticatedApp();
  } catch (error) {
    if (dom.loginStatus) dom.loginStatus.textContent = describeLoginError(error);
    return;
    if (dom.loginStatus) dom.loginStatus.textContent = "Usuário ou senha inválidos.";
  }
}

function syncAuthUi() {
  const user = state.auth?.user;
  const config = user ? LOGIN_USERS[user.id] : null;
  document.body.classList.toggle("role-leader", isLeader());
  document.body.classList.toggle("role-musician", user?.role === "musician");
  document.body.classList.toggle("role-dev", state.devMode);
  document.querySelectorAll(".dev-only-card, .dev-only").forEach((el) => { el.hidden = !state.devMode; });

  if (dom.accountInitial) dom.accountInitial.textContent = config?.initial || "U";
  if (dom.accountButton && user) {
    dom.accountButton.title = `Conta: ${user.label}`;
    dom.accountButton.setAttribute("aria-label", `Conta: ${user.label}`);
  }
  if (dom.accountRole) dom.accountRole.textContent = user?.label || "Perfil";
  if (dom.accountEmail && document.activeElement !== dom.accountEmail) {
    dom.accountEmail.value = user?.email || "";
  }
  if (dom.accountName) dom.accountName.textContent = isLeader()
    ? "Pode editar o Play do ensaio neste aparelho"
    : "Pode visualizar o Play do ensaio neste aparelho";

  syncResetUi();

  renderPermissionState();
}

function openAccountModal() {
  if (!state.auth?.user || !dom.accountModal) return;
  dom.accountModal.hidden = false;
  if (dom.accountStatus) dom.accountStatus.textContent = "";
  if (dom.accountEmail) dom.accountEmail.value = state.auth.user.email || "";
  (state.auth.user.email ? dom.currentPassword : dom.accountEmail)?.focus();
}

function closeAccountModal(silent = false) {
  if (!dom.accountModal) return;
  dom.accountModal.hidden = true;
  if (dom.accountForm) dom.accountForm.reset();
  if (!silent && dom.accountStatus) dom.accountStatus.textContent = "";
}

function openResetModal() {
  if (!dom.resetModal) return;
  syncResetUi();
  if (dom.resetStatus) dom.resetStatus.textContent = "";
  dom.resetModal.hidden = false;
  dom.resetEmail?.focus();
}

function closeResetModal(silent = false) {
  if (!dom.resetModal) return;
  dom.resetModal.hidden = true;
  if (dom.resetForm) dom.resetForm.reset();
  if (!silent && dom.resetStatus) dom.resetStatus.textContent = "";
}

function syncResetUi() {
  const config = LOGIN_USERS[state.selectedLoginUser] || LOGIN_USERS.lider;
  if (dom.resetRole) dom.resetRole.textContent = config.label;
  if (dom.resetDeviceLabel) dom.resetDeviceLabel.textContent = `Recuperacao para ${config.label.toLowerCase()} deste aparelho`;
}

async function saveAccount() {
  const email = normalizeEmailInput(dom.accountEmail?.value || "");
  const currentPassword = dom.currentPassword?.value || "";
  const newPassword = dom.newPassword?.value || "";
  const confirmPassword = dom.confirmPassword?.value || "";
  const emailChanged = email !== normalizeEmailInput(state.auth?.user?.email || "");
  const wantsPasswordChange = Boolean(currentPassword || newPassword || confirmPassword);

  if (!emailChanged && !wantsPasswordChange) {
    if (dom.accountStatus) dom.accountStatus.textContent = "Nada para salvar.";
    return;
  }
  if (email && !isValidEmailInput(email)) {
    if (dom.accountStatus) dom.accountStatus.textContent = "Digite um e-mail valido.";
    return;
  }
  if (wantsPasswordChange && !currentPassword) {
    if (dom.accountStatus) dom.accountStatus.textContent = "Digite a senha atual.";
    return;
  }

  if (wantsPasswordChange && newPassword.length < 4) {
    if (dom.accountStatus) dom.accountStatus.textContent = "A nova senha precisa ter pelo menos 4 caracteres.";
    return;
  }
  if (wantsPasswordChange && newPassword !== confirmPassword) {
    if (dom.accountStatus) dom.accountStatus.textContent = "A confirmação não confere.";
    return;
  }

  if (dom.accountStatus) dom.accountStatus.textContent = "Salvando...";
  try {
    let updatedUser = state.auth?.user;

    if (emailChanged) {
      const emailResponse = await fetch("/api/auth/update-email", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ email })
      });
      const emailData = await emailResponse.json().catch(() => ({}));
      if (!emailResponse.ok || !emailData.ok) throw new Error(emailData.error || "update-email-failed");
      updatedUser = emailData.user || updatedUser;
    }

    if (!wantsPasswordChange) {
      state.auth = { ...state.auth, user: updatedUser };
      writeStoredAuth();
      syncAuthUi();
      if (dom.accountForm) dom.accountForm.reset();
      if (dom.accountEmail) dom.accountEmail.value = updatedUser?.email || "";
      if (dom.accountStatus) dom.accountStatus.textContent = "E-mail atualizado.";
      toast("E-mail atualizado");
      return;
    }
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "change-failed");
    updatedUser = data.user || updatedUser;
    state.auth = { ...state.auth, user: updatedUser };
    writeStoredAuth();
    syncAuthUi();
    if (dom.accountForm) dom.accountForm.reset();
    if (dom.accountEmail) dom.accountEmail.value = updatedUser?.email || "";
    if (dom.accountStatus) dom.accountStatus.textContent = "Dados salvos e senha atualizada.";
    toast("Senha atualizada neste aparelho");
  } catch (error) {
    if (dom.accountStatus) dom.accountStatus.textContent = describeAccountError(error);
    return;
    if (dom.accountStatus) dom.accountStatus.textContent = "Senha atual inválida.";
  }
}

async function requestResetCode() {
  const email = normalizeEmailInput(dom.resetEmail?.value || "");
  if (!isValidEmailInput(email)) {
    if (dom.resetStatus) dom.resetStatus.textContent = "Digite o e-mail cadastrado.";
    return;
  }

  if (dom.resetStatus) dom.resetStatus.textContent = "Enviando codigo...";
  try {
    const response = await fetch("/api/auth/request-reset", {
      method: "POST",
      headers: deviceHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        userId: state.selectedLoginUser,
        email,
        deviceId: state.deviceId,
        deviceLabel: state.deviceLabel
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "request-reset-failed");

    if (dom.resetStatus) {
      dom.resetStatus.textContent = data.previewCode
        ? `Codigo de teste local: ${data.previewCode}`
        : "Codigo enviado para o e-mail cadastrado.";
    }
    dom.resetCode?.focus();
  } catch (error) {
    if (dom.resetStatus) dom.resetStatus.textContent = describeResetRequestError(error);
  }
}

async function submitResetPassword() {
  const email = normalizeEmailInput(dom.resetEmail?.value || "");
  const code = String(dom.resetCode?.value || "").trim();
  const newPassword = dom.resetNewPassword?.value || "";
  const confirmPassword = dom.resetConfirmPassword?.value || "";

  if (!isValidEmailInput(email)) {
    if (dom.resetStatus) dom.resetStatus.textContent = "Digite o e-mail cadastrado.";
    return;
  }
  if (!code) {
    if (dom.resetStatus) dom.resetStatus.textContent = "Digite o codigo recebido.";
    return;
  }
  if (newPassword.length < 4) {
    if (dom.resetStatus) dom.resetStatus.textContent = "A nova senha precisa ter pelo menos 4 caracteres.";
    return;
  }
  if (newPassword !== confirmPassword) {
    if (dom.resetStatus) dom.resetStatus.textContent = "A confirmacao nao confere.";
    return;
  }

  if (dom.resetStatus) dom.resetStatus.textContent = "Redefinindo senha...";
  try {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: deviceHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        userId: state.selectedLoginUser,
        email,
        code,
        newPassword,
        deviceId: state.deviceId,
        deviceLabel: state.deviceLabel
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "reset-password-failed");

    closeResetModal(true);
    if (dom.loginPassword) dom.loginPassword.value = "";
    if (dom.loginStatus) dom.loginStatus.textContent = "Senha redefinida. Entre com a nova senha.";
    toast("Senha redefinida neste aparelho");
  } catch (error) {
    if (dom.resetStatus) dom.resetStatus.textContent = describeResetConfirmError(error);
  }
}

function normalizeEmailInput(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmailInput(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmailInput(value));
}

function describeLoginError(error) {
  const code = error?.message || "";
  if (code === "invalid-device") return "Nao foi possivel identificar este aparelho.";
  return "Usuario ou senha invalidos.";
}

function describeAccountError(error) {
  const code = error?.message || "";
  if (code === "invalid-email") return "Digite um e-mail valido.";
  if (code === "invalid-current-password") return "Senha atual invalida.";
  if (code === "password-too-short") return "A nova senha precisa ter pelo menos 4 caracteres.";
  return "Nao foi possivel salvar agora.";
}

function describeResetRequestError(error) {
  const code = error?.message || "";
  if (code === "invalid-email") return "Digite o e-mail cadastrado.";
  if (code === "email-not-registered") return "Este perfil ainda nao tem e-mail cadastrado neste aparelho.";
  if (code === "email-mismatch") return "O e-mail nao confere com este aparelho.";
  if (code === "reset-wait") return "Aguarde um minuto para pedir outro codigo.";
  if (code === "email-not-configured") return "O envio por e-mail ainda precisa ser configurado no servidor.";
  if (code === "invalid-device") return "Nao foi possivel identificar este aparelho.";
  return "Nao foi possivel enviar o codigo agora.";
}

function describeResetConfirmError(error) {
  const code = error?.message || "";
  if (code === "invalid-email") return "Digite o e-mail cadastrado.";
  if (code === "invalid-reset-code") return "Codigo invalido.";
  if (code === "reset-not-requested") return "Peca um codigo antes de redefinir.";
  if (code === "reset-expired") return "O codigo expirou. Peca outro.";
  if (code === "email-mismatch") return "O e-mail nao confere com este aparelho.";
  if (code === "password-too-short") return "A nova senha precisa ter pelo menos 4 caracteres.";
  if (code === "invalid-device") return "Nao foi possivel identificar este aparelho.";
  return "Nao foi possivel redefinir a senha agora.";
}

function logout() {
  stopAutoScroll();
  stopTuner(true);
  closeChordGuide(true);
  closeAccountModal(true);
  closeResetModal(true);
  state.auth = null;
  disableDevMode();
  writeStoredAuth();
  syncAuthUi();
  showLogin("Sessao encerrada.");
}

function isLeader() {
  return state.auth?.user?.role === "leader";
}

function requireLeader() {
  if (isLeader()) return true;
  toast("Apenas o líder pode editar o Play do ensaio");
  return false;
}

function renderPermissionState() {
  if (!state.appStarted) return;
  if (!isLeader()) state.playEditing = false;
  document.querySelectorAll('[data-action="add-play"], [data-action="add-current-play"]').forEach((button) => {
    const locked = !isLeader();
    button.disabled = locked;
    button.classList.toggle("locked", locked);
    button.title = locked ? "Apenas o líder pode adicionar ao Play do ensaio" : "Adicionar ao Play do ensaio";
    button.setAttribute("aria-label", button.title);
  });
  if (dom.editPlayButton) {
    dom.editPlayButton.disabled = !isLeader();
    dom.editPlayButton.title = isLeader() ? "Editar Play do ensaio" : "Apenas o líder pode editar";
  }

  const existingDevReaderButton = document.getElementById("devReaderEditButton");
  if (state.devMode && state.currentView === "reader" && state.currentSongId) {
    if (!existingDevReaderButton) {
      const button = document.createElement("button");
      button.id = "devReaderEditButton";
      button.type = "button";
      button.dataset.action = "open-dev-current";
      button.textContent = "Editar";
      button.className = "dev-reader-edit";
      document.querySelector(".reader-tools")?.appendChild(button);
    }
  } else if (existingDevReaderButton) {
    existingDevReaderButton.remove();
  }
}

function applyPreviewState() {
  const params = new URLSearchParams(location.search);
  if (params.get("demo") === "culto") {
    state.play = state.songs.slice(0, 5).map((song) => ({ id: song.id, key: song.key || null }));
  }
}

async function loadSongs() {
  let hasCatalog = false;
  try {
    const response = await fetch(`/api/catalog?limit=10000&v=${Date.now()}`);
    if (!response.ok) throw new Error("index-not-found");
    const data = await response.json();
    state.generatedAt = data.generatedAt || null;
    hasCatalog = Array.isArray(data.songs) && data.songs.length > 0;
    state.songs = hasCatalog ? data.songs : sampleSongs;
    setPublicArtistThumbs(data.artistThumbs, state.songs);
    idbSetMeta("catalog", {
      generatedAt: state.generatedAt,
      artistThumbs: Object.fromEntries(state.publicArtistThumbs),
      songs: state.songs
    }).catch(() => {});
  } catch {
    const offlineCatalog = await idbGetMeta("catalog").catch(() => null);
    state.generatedAt = offlineCatalog?.generatedAt || null;
    hasCatalog = Array.isArray(offlineCatalog?.songs) && offlineCatalog.songs.length > 0;
    state.songs = hasCatalog ? offlineCatalog.songs : sampleSongs;
    setPublicArtistThumbs(offlineCatalog?.artistThumbs, state.songs);
  }

  state.catalogReady = hasCatalog;
  const normalizedPlay = normalizePlayEntries(state.play);
  if (getPlaySignature(normalizedPlay) !== getPlaySignature(state.play)) {
    state.play = normalizedPlay;
    savePlay();
  }
}

function bindEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopTuner();
  });
  window.addEventListener("pagehide", () => stopTuner());
  dom.loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    loginSelectedUser();
  });
  dom.accountForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveAccount();
  });
  dom.resetForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    submitResetPassword();
  });
  dom.search?.addEventListener("input", () => {
    filterSongs();
    renderCatalog();
    if (state.currentView !== "acervo") showView("acervo");
  });
  document.querySelector(".brand-logo")?.addEventListener("click", handleDevLogoTap);
  document.querySelector(".login-logo")?.addEventListener("click", handleDevLogoTap);
  dom.devSongSearch?.addEventListener("input", renderDevSongList);
  dom.devSongHtml?.addEventListener("input", renderDevPreview);
  [dom.devSongTitle, dom.devSongArtist, dom.devSongKey, dom.devSongCollection].forEach((input) => input?.addEventListener("input", renderDevPreview));
  dom.devChordSearch?.addEventListener("input", renderDevChordList);
  [dom.devChordNameInput, dom.devChordNotes, dom.devChordBaseFret, dom.devChordBarre].forEach((input) => input?.addEventListener("input", syncDevChordFromInputs));
  dom.localCoverInput?.addEventListener("change", handleLocalCoverSelected);
  dom.artistThumbInput?.addEventListener("change", handleArtistThumbSelected);
  dom.localAudioInput?.addEventListener("change", handleLocalAudioSelected);
}

async function handleClick(event) {
  const chord = event.target.closest("[data-chord]");
  if (chord?.dataset.chord) {
    event.preventDefault();
    const chordName = chord.dataset.chord;
    if (state.devMode && state.currentView === "dev") {
      showDevTab("acordes");
      return openDevChord(chordName);
    }
    return openChordGuide(chordName);
  }

  const button = event.target.closest("button");
  if (!button) return;

  const view = button.dataset.view;
  const action = button.dataset.action;
  const id = button.dataset.id;
  const artist = button.dataset.artist;

  if (view) {
    if (view !== state.currentView && state.currentView !== "reader") {
      state.previousView = state.currentView;
    }
    return showView(view);
  }
  if (action) {
    event.preventDefault();
    event.stopPropagation();

    if (action === "select-login-user") return selectLoginUser(button.dataset.userId);
    if (action === "open-account") return openAccountModal();
    if (action === "close-account") return closeAccountModal();
    if (action === "open-reset") return openResetModal();
    if (action === "close-reset") return closeResetModal();
    if (action === "request-reset-code") return requestResetCode();
    if (action === "logout") return logout();
    if (action === "open") return openSong(id);
    if (action === "add-play") return requireLeader() && addToPlay(id);
    if (action === "remove-play") return requireLeader() && removeFromPlay(id);
    if (action === "favorite") return toggleFavorite(id);
    if (action === "set-cover") return chooseLocalCover(id);
    if (action === "set-artist-thumb") return chooseArtistThumb(artist);
    if (action === "set-audio") return chooseLocalAudio(id);
    if (action === "add-current-audio") return chooseLocalAudio(state.currentSongId);
    if (action === "play-audio") return playLocalAudio(id);
    if (action === "download-artist") return downloadArtistForOffline(artist);
    if (action === "toggle-theme") return toggleTheme();
    if (action === "install-app") return installApp();
    if (action === "dismiss-install") return hideInstallPrompt();
    if (action === "clear-play") return requireLeader() && clearPlay();
    if (action === "refresh") return refreshLibrary();
    if (action === "back") return showView(state.previousView || "acervo");
    if (action === "back-play") return showView(state.previousView && state.previousView !== "play" ? state.previousView : "acervo");
    if (action === "go-home") return showView("acervo");
    if (action === "favorite-current") return toggleFavorite(state.currentSongId);
    if (action === "add-current-play") return requireLeader() && addToPlay(state.currentSongId, currentKeyLabel());
    if (action === "font-down") return setReaderFont(state.readerFont - 1);
    if (action === "font-up") return setReaderFont(state.readerFont + 1);
    if (action === "toggle-singer-mode") return toggleSingerMode();
    if (action === "toggle-tuner") return toggleTunerPanel();
    if (action === "start-tuner") return state.tunerRunning ? stopTuner() : startTuner();
    if (action === "detect-voice-tone") return toggleVoiceToneDetector();
    if (action === "transpose-down") return transposeCurrentSong(-1);
    if (action === "transpose-up") return transposeCurrentSong(1);
    if (action === "reset-tone") return resetTone();
    if (action === "toggle-autoscroll") return toggleAutoScroll();
    if (action === "start-service") return startService();
    if (action === "share-play") return sharePlay();
    if (action === "manage-contacts") return openContactsModal();
    if (action === "close-contacts") return closeContactsModal();
    if (action === "add-contact") return addContact();
    if (action === "remove-contact") return removeContact(Number(button.dataset.index));
    if (action === "toggle-edit-play") return requireLeader() && togglePlayEditing();
    if (action === "admin-refresh") return adminRefresh();
    if (action === "dev-check-system") return showView("acervo");
    if (action === "dev-exit") return exitDevMode();
    if (action === "dev-tab") return showDevTab(button.dataset.tab);
    if (action === "dev-open-song") return openDevSong(id);
    if (action === "dev-preview-song") return renderDevPreview();
    if (action === "dev-save-song") return saveDevSong();
    if (action === "dev-restore-song") return restoreDevSongVersion();
    if (action === "dev-preview-singer") return toggleDevPreviewSinger();
    if (action === "dev-preview-transpose-down") return transposeDevPreview(-1);
    if (action === "dev-preview-transpose-up") return transposeDevPreview(1);
    if (action === "dev-preview-transpose-reset") return transposeDevPreview(0, true);
    if (action === "dev-open-chord") return openDevChord(button.dataset.chord);
    if (action === "dev-new-chord") return newDevChord();
    if (action === "dev-save-chord") return saveDevChord();
    if (action === "dev-clear-chord") return clearDevChord();
    if (action === "open-dev-current") return openDevEditorFromReader();
    if (action === "dev-edit-active-chord") return openDevChordFromGuide();
    if (action === "close-chord-guide") return closeChordGuide();
  }

  if (artist) return renderArtistSongs(artist);
}

function handleKeyDown(event) {
  if ((event.key === "Enter" || event.key === " ") && event.target?.dataset?.chord) {
    event.preventDefault();
    openChordGuide(event.target.dataset.chord);
    return;
  }

  if (event.key === "Escape" && state.chordGuideOpen) {
    closeChordGuide();
    return;
  }

  if (event.key === "Escape" && dom.accountModal && !dom.accountModal.hidden) {
    closeAccountModal();
    return;
  }

  if (event.key === "Escape" && dom.resetModal && !dom.resetModal.hidden) {
    closeResetModal();
  }
}

function filterSongs() {
  const query = normalize(dom.search.value);
  if (!query) {
    state.filtered = state.songs.slice(0, 80);
    return;
  }

  state.filtered = state.songs
    .filter((song) => normalize(`${song.title} ${song.artist} ${song.collection || ""}`).includes(query))
    .slice(0, 100);
}

function renderAll() {
  renderDashboard();
  renderCatalog();
  renderFavorites();
  renderPlay();
  renderArtists();
  renderDevWorkspace();
  updateStats();
}

function renderDashboard() {
  const groups = getArtistGroups();
  const topArtists = groups.slice(0, 3);
  if (dom.topArtistStack) {
    dom.topArtistStack.innerHTML = topArtists.length
      ? topArtists.map(([artist, songs]) => renderTopArtist(artist, songs)).join("")
      : `<span class="top-artist-empty">MDL</span>`;
  }
  if (dom.dashboardPlaySummary) {
    dom.dashboardPlaySummary.textContent = state.play.length
      ? `${state.play.length} musica${state.play.length === 1 ? "" : "s"} no repertorio`
      : "Monte o repertorio para comecar";
  }
}

function renderTopArtist(artist, songs) {
  const thumb = getArtistThumb(artist);
  const initials = getInitials(artist);
  const thumbTitle = isLeader() ? `Enviar thumb online de ${artist}` : `Salvar thumb de ${artist} neste aparelho`;
  return `
    <button class="top-artist-avatar" type="button" data-action="set-artist-thumb" data-artist="${escapeAttr(artist)}" title="${escapeAttr(thumbTitle)}" aria-label="${escapeAttr(thumbTitle)}">
      ${thumb ? `<img src="${escapeAttr(thumb)}" alt="">` : `<span>${escapeHtml(initials)}</span>`}
      <b>${formatNumber(songs.length)}</b>
    </button>
  `;
}

function renderCatalog() {
  dom.songList.innerHTML = state.filtered.length
    ? state.filtered.map(renderSongCard).join("")
    : emptyState("Nenhuma música encontrada.");
  syncFavoriteControls();
  renderPermissionState();
}

function renderFavorites() {
  const songs = state.songs.filter((song) => state.favorites.has(song.id));
  dom.favoriteList.innerHTML = songs.length
    ? songs.map(renderSongCard).join("")
    : emptyState("Suas favoritas aparecem aqui.");
  syncFavoriteControls();
  renderPermissionState();
}

function renderPlay() {
  const entries = state.play
    .map((entry) => ({ entry, song: findSong(entry.id) }))
    .filter(({ song }) => Boolean(song));

  const playEmptyText = isLeader()
    ? "Adicione músicas pelo botão + no acervo. Elas aparecem aqui para o ensaio."
    : "O Play do ensaio aparecerá aqui quando o líder adicionar músicas.";

  dom.playList.innerHTML = entries.length
    ? entries.map(({ entry, song }, index) => renderWorshipSong(entry, song, index)).join("")
    : emptyState(playEmptyText);

  if (dom.editPlayButton) {
    dom.editPlayButton.textContent = state.playEditing ? "Concluir" : "Editar";
  }
  updateStats();
  renderPermissionState();
}

function renderArtists() {
  const artists = getArtistGroups("name");
  dom.artistList.innerHTML = artists.map(([artist, songs]) => renderArtistCard(artist, songs)).join("");
  updateStats();
}

function getArtistGroups(sortBy = "count") {
  const groups = new Map();
  state.songs.forEach((song) => {
    if (!groups.has(song.artist)) groups.set(song.artist, []);
    groups.get(song.artist).push(song);
  });

  const artists = Array.from(groups.entries());
  if (sortBy === "name") return artists.sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  return artists.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "pt-BR"));
}

function renderArtistCard(artist, songs) {
  const total = songs.length;
  const saved = songs.filter((song) => state.offlineSongs.has(song.id)).length;
  const progress = state.offlineArtistDownloads.get(artist);
  const isOffline = total > 0 && saved >= total;
  const countLabel = `${total} ${total === 1 ? "música" : "músicas"}`;
  const offlineLabel = progress
    ? `Baixando ${Math.min(progress.saved, progress.total)}/${progress.total}`
    : isOffline
      ? "biblioteca offline"
      : saved
        ? `${saved}/${total} offline`
        : "";
  const metaLabel = [countLabel, offlineLabel].filter(Boolean).join(" · ");
  const downloadTitle = isOffline
    ? `Biblioteca de ${artist} já está offline`
    : `Baixar biblioteca de cifras de ${artist}`;
  const downloadClass = [
    "mini-action",
    "artist-download",
    isOffline ? "active" : "",
    progress ? "loading" : ""
  ].filter(Boolean).join(" ");
  const downloadState = progress ? ` disabled aria-busy="true"` : "";
  const downloadIcon = progress
    ? `<span class="download-spinner" aria-hidden="true"></span>`
    : isOffline
      ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>`
      : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>`;
  const thumb = getArtistThumb(artist);
  const thumbTitle = isLeader() ? "Enviar thumb online" : "Salvar thumb neste aparelho";

  return `
    <article class="artist-card">
      <button class="artist-thumb" type="button" data-action="set-artist-thumb" data-artist="${escapeAttr(artist)}" title="${escapeAttr(thumbTitle)}" aria-label="${escapeAttr(thumbTitle)} de ${escapeAttr(artist)}">
        ${thumb ? `<img src="${escapeAttr(thumb)}" alt="">` : `<span>${escapeHtml(getInitials(artist))}</span>`}
      </button>
      <button class="artist-main" type="button" data-artist="${escapeAttr(artist)}">
        <span class="artist-title">${escapeHtml(artist)}</span>
        <span class="artist-meta">${escapeHtml(metaLabel)}</span>
      </button>
      <div class="artist-actions">
        <button class="${downloadClass}" type="button" data-action="download-artist" data-artist="${escapeAttr(artist)}" title="${escapeAttr(downloadTitle)}" aria-label="${escapeAttr(downloadTitle)}"${downloadState}>
          ${downloadIcon}
        </button>
        <button class="mini-action primary" type="button" data-artist="${escapeAttr(artist)}" title="Ver cifras" aria-label="Ver cifras de ${escapeAttr(artist)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
        </button>
      </div>
    </article>
  `;
}

function renderArtistSongs(artist) {
  dom.search.value = artist;
  state.filtered = getArtistSongs(artist);
  showView("acervo");
  renderCatalog();
}

function renderSongCard(song) {
  const isFavorite = state.favorites.has(song.id);
  const favoriteClass = isFavorite ? "mini-action active" : "mini-action";
  const favoriteTitle = isFavorite ? "Remover dos favoritos" : "Favoritar";
  const favoriteGlyph = isFavorite ? "★" : "☆";
  const songMeta = getSongMetaLabel(song);
  const playLocked = !isLeader();
  const media = getSongMedia(song.id);
  const cover = media?.cover || getArtistThumb(song.artist);
  const hasAudio = Boolean(media?.audioBlob);
  const playTitle = playLocked ? "Apenas o líder pode adicionar ao Play do ensaio" : "Adicionar ao Play do ensaio";
  return `
    <article class="song-card">
      <button class="song-cover" type="button" data-action="set-cover" data-id="${escapeAttr(song.id)}" title="Trocar capa local" aria-label="Trocar capa local de ${escapeAttr(song.title)}">
        ${cover ? `<img src="${escapeAttr(cover)}" alt="">` : `<span>${escapeHtml(song.key || getInitials(song.title))}</span>`}
      </button>
      <button class="song-main" type="button" data-action="open" data-id="${escapeAttr(song.id)}">
        <span class="song-title">${escapeHtml(song.title)}</span>
        <span class="song-meta">${escapeHtml(songMeta)}${hasAudio ? " - MP3 local" : ""}</span>
      </button>
      <div class="song-actions">
        ${hasAudio ? `<button class="mini-action audio-ready" type="button" data-action="play-audio" data-id="${escapeAttr(song.id)}" title="Tocar MP3 local" aria-label="Tocar MP3 local"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg></button>` : ""}
        <button class="mini-action" type="button" data-action="set-audio" data-id="${escapeAttr(song.id)}" title="Adicionar MP3 local" aria-label="Adicionar MP3 local">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
        </button>
        <button class="${favoriteClass}" type="button" data-action="favorite" data-id="${escapeAttr(song.id)}" title="${favoriteTitle}" aria-label="${favoriteTitle}" aria-pressed="${isFavorite}">${favoriteGlyph}</button>
        <button class="mini-action primary${playLocked ? " locked" : ""}" type="button" data-action="add-play" data-id="${escapeAttr(song.id)}" title="${escapeAttr(playTitle)}" aria-label="${escapeAttr(playTitle)}"${playLocked ? " disabled" : ""}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
        </button>
      </div>
    </article>
  `;
}

function getSongMetaLabel(song) {
  const collection = getVisibleCollection(song.collection);
  return [song.artist, collection].filter(Boolean).join(" · ");
}

function getVisibleCollection(collection) {
  const label = String(collection || "").trim();
  if (!label || normalize(label) === "cifras_multi") return "";
  return label;
}

function renderWorshipSong(entry, song, index) {
  const key = entry.key || song.key || "Tom";
  const media = getSongMedia(song.id);
  const cover = media?.cover || getArtistThumb(song.artist);
  const hasAudio = Boolean(media?.audioBlob);
  const offlineBadge = state.offlineSongs.has(song.id) ? `<span class="offline-badge">offline</span>` : "";
  const localAudioBadge = hasAudio ? `<span class="local-audio-badge">MP3</span>` : "";
  const removeButton = state.playEditing && isLeader()
    ? `<button class="worship-remove" type="button" data-action="remove-play" data-id="${escapeAttr(song.id)}" title="Remover cifra">×</button>`
    : "";

  return `
    <article class="worship-song">
      <span class="worship-cover">
        ${cover ? `<img src="${escapeAttr(cover)}" alt="">` : `<span>${escapeHtml(song.key || getInitials(song.title))}</span>`}
      </span>
      <span class="worship-index">${index + 1}</span>
      <button class="worship-song-main" type="button" data-action="open" data-id="${escapeAttr(song.id)}">
        <strong>${escapeHtml(song.title)}</strong>
        <span>${escapeHtml(song.artist)}</span>
      </button>
      ${offlineBadge}
      ${localAudioBadge}
      <span class="tone-pill">${escapeHtml(key)}</span>
      ${removeButton}
    </article>
  `;
}

async function openSong(id) {
  const song = findSong(id);
  if (!song) return;

  state.previousView = state.currentView === "reader" ? state.previousView : state.currentView;
  state.currentSongId = id;
  state.transposeOffset = 0;
  state.baseKey = song.key || null;
  state.activeChordBase = null;
  state.currentSheetHtml = "";
  dom.readerTitle.textContent = song.title;
  dom.readerArtist.textContent = song.artist;
  dom.chordSheet.innerHTML = `<div class="loader">Abrindo cifra...</div>`;
  syncFavoriteControls();
  closeChordGuide(true);
  showView("reader");

  try {
    const response = await fetch(`/api/songs/${encodeURIComponent(id)}?v=${Date.now()}`);
    if (!response.ok) throw new Error("song-not-found");
    const data = await response.json();
    idbSaveSong(data).catch(() => {});
    state.offlineSongs.add(id);
    state.currentSheetHtml = normalizeSheetContent(data.html || "");
    state.baseKey = song.key || inferKeyFromHtml(state.currentSheetHtml);
  } catch {
    const offlineSong = await idbGetSong(id);
    state.currentSheetHtml = normalizeSheetContent(offlineSong?.html || sampleSheets[id] || `${escapeHtml(song.title)}\n\nCifra ainda não importada.`);
    state.baseKey = song.key || inferKeyFromHtml(state.currentSheetHtml);
  }

  renderCurrentSheet();
  updateReaderMedia();
}

function renderCurrentSheet() {
  const html = state.singerMode
    ? stripChordsToLyrics(state.currentSheetHtml)
    : decorateChordHtml(transposeHtml(state.currentSheetHtml, state.transposeOffset));
  dom.chordSheet.innerHTML = `<pre>${html}</pre>`;
  applyReaderPreferences();
  updateToneButton();
  renderPermissionState();
  if (state.singerMode) {
    closeChordGuide(true);
  } else if (state.chordGuideOpen && state.activeChordBase) {
    refreshChordGuide();
  }
}

function openChordGuide(chordName) {
  const currentChord = String(chordName || "").trim();
  if (!currentChord) return;

  stopAutoScroll();
  state.activeChordBase = transposeChordText(currentChord, -state.transposeOffset);
  state.chordGuideOpen = true;
  refreshChordGuide();
}

function refreshChordGuide() {
  if (!state.activeChordBase) return closeChordGuide();

  const currentChord = transposeChordText(state.activeChordBase, state.transposeOffset);
  const guide = buildChordGuide(currentChord);
  if (!guide) return closeChordGuide();

  dom.chordGuideName.textContent = guide.name;
  dom.chordGuideMeta.textContent = guide.meta;
  dom.chordGuideNotes.innerHTML = guide.notes.map((note) => `<span>${escapeHtml(note)}</span>`).join("");
  dom.chordGuideHint.innerHTML = state.devMode
    ? `${escapeHtml(guide.hint)} <button class="chord-dev-edit" type="button" data-action="dev-edit-active-chord">Editar desenho</button>`
    : escapeHtml(guide.hint);
  dom.chordGuideDiagram.innerHTML = renderChordGuideDiagram(guide);
  dom.chordGuide.classList.add("open");
  dom.chordGuide.setAttribute("aria-hidden", "false");
  document.body.classList.add("chord-guide-open");
}

function closeChordGuide(preserveBase = false) {
  state.chordGuideOpen = false;
  if (!preserveBase) state.activeChordBase = null;
  dom.chordGuide.classList.remove("open");
  dom.chordGuide.setAttribute("aria-hidden", "true");
  document.body.classList.remove("chord-guide-open");
}

async function addToPlay(id, selectedKey = null) {
  if (!isLeader()) return requireLeader();
  if (!id) return;
  const song = findSong(id);
  if (!song) return;

  const existing = state.play.find((entry) => entry.id === id);
  if (existing) {
    if (selectedKey) existing.key = selectedKey;
  } else {
    state.play.push({ id, key: selectedKey || song.key || null });
  }

  state.play = normalizePlayEntries(state.play);
  state.playDirty = true;
  savePlay();
  await pushSharedPlay();
  renderPlay();
  toast("Adicionada ao Play do ensaio");
  notifyContactsWhatsApp(id);
  downloadSongForOffline(id);
}

async function removeFromPlay(id) {
  if (!isLeader()) return requireLeader();
  state.play = normalizePlayEntries(state.play.filter((entry) => entry.id !== id));
  state.playDirty = true;
  savePlay();
  await pushSharedPlay();
  renderPlay();
}

async function clearPlay() {
  if (!isLeader()) return requireLeader();
  state.play = [];
  state.playDirty = true;
  savePlay();
  await pushSharedPlay();
  renderPlay();
}

function toggleFavorite(id) {
  if (!id) return;
  let isFavorite = false;
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
  } else {
    state.favorites.add(id);
    isFavorite = true;
  }
  localStorage.setItem("mdl.favorites", JSON.stringify(Array.from(state.favorites)));
  renderCatalog();
  renderFavorites();
  updateStats();
  syncFavoriteControls();
  toast(isFavorite ? "Musica adicionada aos favoritos" : "Musica removida dos favoritos");
}

function syncFavoriteControls() {
  document.querySelectorAll('[data-action="favorite"][data-id]').forEach((button) => {
    const isFavorite = state.favorites.has(button.dataset.id);
    const title = isFavorite ? "Remover dos favoritos" : "Favoritar";
    button.classList.toggle("active", isFavorite);
    button.textContent = isFavorite ? "★" : "☆";
    button.title = title;
    button.setAttribute("aria-label", title);
    button.setAttribute("aria-pressed", String(isFavorite));
  });

  const readerIsFavorite = Boolean(state.currentSongId && state.favorites.has(state.currentSongId));
  if (dom.readerFavoriteButton) {
    dom.readerFavoriteButton.classList.toggle("active", readerIsFavorite);
    dom.readerFavoriteButton.title = readerIsFavorite ? "Remover dos favoritos" : "Favoritar";
    dom.readerFavoriteButton.setAttribute("aria-pressed", String(readerIsFavorite));
  }
}

function getCurrentUserId() {
  return state.auth?.user?.id || state.selectedLoginUser || "local";
}

function getSongMedia(id) {
  const songId = String(id || "");
  if (!state.songMedia.has(songId)) state.songMedia.set(songId, {});
  return state.songMedia.get(songId);
}

function setPublicArtistThumbs(thumbs = {}, songs = []) {
  state.publicArtistThumbs = new Map();

  if (thumbs && typeof thumbs === "object" && !Array.isArray(thumbs)) {
    Object.entries(thumbs).forEach(([artist, thumb]) => {
      const name = normalizeArtistName(artist);
      const url = String(thumb || "").trim();
      if (name && url) state.publicArtistThumbs.set(name, url);
    });
  }

  songs.forEach((song) => {
    const name = normalizeArtistName(song.artist);
    const url = String(song.artistThumb || "").trim();
    if (name && url && !state.publicArtistThumbs.has(name)) {
      state.publicArtistThumbs.set(name, url);
    }
  });
}

function setPublicArtistThumb(artist, thumb) {
  const name = normalizeArtistName(artist);
  const url = String(thumb || "").trim();
  if (!name || !url) return;
  state.publicArtistThumbs.set(name, url);
  state.songs.forEach((song) => {
    if (normalizeArtistName(song.artist) === name) song.artistThumb = url;
  });
}

function getArtistThumb(artist) {
  const name = normalizeArtistName(artist);
  if (!name) return "";
  return state.artistThumbs.get(name)
    || state.publicArtistThumbs.get(name)
    || getPublicArtistThumbByNormalizedName(name)
    || "";
}

function getPublicArtistThumbByNormalizedName(artist) {
  const key = normalize(artist);
  const match = Array.from(state.publicArtistThumbs.entries())
    .find(([candidate]) => normalize(candidate) === key);
  return match?.[1] || "";
}

function getLibraryRefreshSignature() {
  const artistThumbSnapshot = Array.from(state.publicArtistThumbs.entries())
    .sort(([left], [right]) => left.localeCompare(right, "pt-BR"));
  return JSON.stringify({
    generatedAt: state.generatedAt || "",
    songs: state.songs.length,
    artistThumbs: artistThumbSnapshot
  });
}

function normalizeArtistName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function makeMediaKey(type, value) {
  return `${getCurrentUserId()}:${type}:${String(value || "").toLowerCase()}`;
}

function chooseLocalCover(id) {
  if (!id || !dom.localCoverInput) return;
  state.pendingCoverSongId = id;
  dom.localCoverInput.value = "";
  dom.localCoverInput.click();
}

function chooseArtistThumb(artist) {
  if (!artist || !dom.artistThumbInput) return;
  state.pendingArtistThumb = artist;
  dom.artistThumbInput.value = "";
  dom.artistThumbInput.click();
}

function chooseLocalAudio(id) {
  if (!id || !dom.localAudioInput) return;
  state.pendingAudioSongId = id;
  dom.localAudioInput.value = "";
  dom.localAudioInput.click();
}

async function handleLocalCoverSelected(event) {
  const songId = state.pendingCoverSongId;
  state.pendingCoverSongId = null;
  const file = event.target.files?.[0];
  if (!songId || !file) return;
  if (!file.type.startsWith("image/")) return toast("Escolha uma imagem");
  if (file.size > LOCAL_COVER_MAX_BYTES) return toast("Imagem muito grande");

  const dataUrl = await fileToDataUrl(file);
  const media = getSongMedia(songId);
  media.cover = dataUrl;
  media.coverName = file.name;
  state.songMedia.set(songId, media);
  await idbPutMedia({
    key: makeMediaKey("song-cover", songId),
    type: "song-cover",
    userId: getCurrentUserId(),
    songId,
    name: file.name,
    mime: file.type,
    size: file.size,
    dataUrl,
    updatedAt: new Date().toISOString()
  });
  renderAll();
  updateReaderMedia();
  toast("Capa salva neste aparelho");
}

async function handleArtistThumbSelected(event) {
  const artist = state.pendingArtistThumb;
  state.pendingArtistThumb = null;
  const file = event.target.files?.[0];
  if (!artist || !file) return;
  if (!file.type.startsWith("image/")) return toast("Escolha uma imagem");
  if (file.size > LOCAL_COVER_MAX_BYTES) return toast("Imagem muito grande");

  const dataUrl = await fileToDataUrl(file);
  const artistName = normalizeArtistName(artist);
  state.artistThumbs.set(artistName, dataUrl);
  await idbPutMedia({
    key: makeMediaKey("artist-thumb", artistName),
    type: "artist-thumb",
    userId: getCurrentUserId(),
    artist: artistName,
    name: file.name,
    mime: file.type,
    size: file.size,
    dataUrl,
    updatedAt: new Date().toISOString()
  });

  const uploaded = isLeader() ? await uploadArtistThumb(artistName, dataUrl) : null;
  if (uploaded) {
    state.artistThumbs.delete(artistName);
    await idbDeleteMedia(makeMediaKey("artist-thumb", artistName)).catch(() => {});
  }
  renderDashboard();
  renderCatalog();
  renderFavorites();
  renderPlay();
  renderArtists();
  updateReaderMedia();
  toast(uploaded
    ? "Thumb salva no sistema online"
    : isLeader()
      ? "Thumb salva neste aparelho; online indisponivel"
      : "Thumb salva neste aparelho");
}

async function uploadArtistThumb(artist, dataUrl) {
  try {
    const response = await fetch("/api/artist-thumbs", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ artist, dataUrl })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.url) throw new Error(data.error || "upload-failed");

    setPublicArtistThumb(data.artist || artist, data.url);
    idbSetMeta("catalog", {
      generatedAt: state.generatedAt,
      artistThumbs: Object.fromEntries(state.publicArtistThumbs),
      songs: state.songs
    }).catch(() => {});
    return data;
  } catch {
    return null;
  }
}

async function handleLocalAudioSelected(event) {
  const songId = state.pendingAudioSongId;
  state.pendingAudioSongId = null;
  const file = event.target.files?.[0];
  if (!songId || !file) return;
  if (!file.type.startsWith("audio/") && !/\.mp3$/i.test(file.name)) return toast("Escolha um MP3");
  if (file.size > LOCAL_AUDIO_MAX_BYTES) return toast("MP3 muito grande para este aparelho");

  const previousUrl = state.localAudioUrls.get(songId);
  if (previousUrl) URL.revokeObjectURL(previousUrl);
  state.localAudioUrls.delete(songId);

  const media = getSongMedia(songId);
  media.audioBlob = file;
  media.audioName = file.name;
  media.audioSize = file.size;
  media.audioMime = file.type || "audio/mpeg";
  state.songMedia.set(songId, media);
  await idbPutMedia({
    key: makeMediaKey("song-audio", songId),
    type: "song-audio",
    userId: getCurrentUserId(),
    songId,
    name: file.name,
    mime: file.type || "audio/mpeg",
    size: file.size,
    blob: file,
    updatedAt: new Date().toISOString()
  });
  renderAll();
  updateReaderMedia();
  toast("MP3 salvo somente neste aparelho");
}

async function playLocalAudio(id) {
  const song = findSong(id);
  const media = getSongMedia(id);
  if (!song || !media?.audioBlob) return chooseLocalAudio(id);
  if (state.currentSongId !== id) await openSong(id);
  updateReaderMedia();
  dom.localAudioPlayer?.play().catch(() => {});
}

function updateReaderMedia() {
  if (!dom.readerMedia) return;
  const song = findSong(state.currentSongId);
  if (!song) {
    dom.readerMedia.hidden = true;
    return;
  }

  const media = getSongMedia(song.id);
  const cover = media.cover || getArtistThumb(song.artist);
  dom.readerMedia.hidden = false;
  if (dom.readerCover) {
    dom.readerCover.innerHTML = cover ? `<img src="${escapeAttr(cover)}" alt="">` : `<span>${escapeHtml(song.key || getInitials(song.title))}</span>`;
  }
  if (dom.readerAudioName) dom.readerAudioName.textContent = media.audioName || "Adicionar MP3 local";
  if (dom.readerAudioStatus) {
    dom.readerAudioStatus.textContent = media.audioBlob
      ? `${formatBytes(media.audioSize)} neste aparelho`
      : "Nenhum MP3 local para esta cifra";
  }
  if (dom.localAudioPlayer) {
    if (media.audioBlob) {
      dom.localAudioPlayer.hidden = false;
      dom.localAudioPlayer.src = getLocalAudioUrl(song.id, media.audioBlob);
    } else {
      dom.localAudioPlayer.hidden = true;
      dom.localAudioPlayer.removeAttribute("src");
      dom.localAudioPlayer.load();
    }
  }
}

function getLocalAudioUrl(songId, blob) {
  if (!state.localAudioUrls.has(songId)) {
    state.localAudioUrls.set(songId, URL.createObjectURL(blob));
  }
  return state.localAudioUrls.get(songId);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getInitials(value) {
  return String(value || "MDL")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "MDL";
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

async function refreshLibrary() {
  await loadSongs();
  const playChanged = await syncSharedPlay({ silent: true });
  filterSongs();
  renderAll();
  if (playChanged) downloadPlayForOffline();
}

async function autoRefreshLibrary() {
  if (state.currentView === "reader") return;
  const beforeLibrary = getLibraryRefreshSignature();
  const beforePlay = getPlaySignature(state.play);
  await loadSongs();
  const playChanged = await syncSharedPlay({ silent: true });
  if (getLibraryRefreshSignature() !== beforeLibrary || getPlaySignature(state.play) !== beforePlay || playChanged) {
    filterSongs();
    renderAll();
    if (getPlaySignature(state.play) !== beforePlay || playChanged) {
      downloadPlayForOffline();
    }
  }
}

function showView(viewName) {
  if (viewName === "dev" && !state.devMode) {
    toast("Acesso desenvolvedor bloqueado");
    return;
  }
  if (viewName !== "reader") {
    stopAutoScroll();
    stopTuner();
    closeChordGuide(true);
  }
  state.currentView = viewName;
  ["acervo", "favoritas", "play", "artistas", "reader", "admin", "dev"].forEach((name) => {
    document.body.classList.remove(`screen-${name}`);
  });
  document.body.classList.add(`screen-${viewName}`);

  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelectorAll(".quick-card").forEach((card) => card.classList.remove("active"));

  const view = document.getElementById(`view-${viewName}`);
  if (view) view.classList.add("active");

  if (viewName === "dev") {
    // O modo desenvolvedor deve manter o dashboard normal visível e
    // anexar os editores abaixo dele, como na tela premium de referência.
    document.getElementById("view-acervo")?.classList.add("active");
    document.querySelector(`[data-view="acervo"]`)?.classList.add("active");
    renderDevWorkspace();
  } else {
    const quick = document.querySelector(`[data-view="${viewName}"]`);
    if (quick) quick.classList.add("active");
  }
}

function setReaderFont(size) {
  state.readerFont = Math.max(12, Math.min(24, size));
  localStorage.setItem("mdl.readerFont", String(state.readerFont));
  applyReaderPreferences();
}

function applyReaderPreferences() {
  dom.chordSheet.style.setProperty("--reader-font", `${state.readerFont}px`);
  dom.chordSheet.classList.toggle("singer-mode", state.singerMode);
  if (dom.singerModeButton) {
    dom.singerModeButton.classList.toggle("active", state.singerMode);
    dom.singerModeButton.setAttribute("aria-pressed", String(state.singerMode));
  }
  syncTunerControls();
}

function toggleVoiceToneDetector() {
  if (state.voiceToneRunning) {
    stopVoiceToneDetector();
    toast("Detecção de tom encerrada");
  } else {
    startVoiceToneDetector();
  }
}

async function startVoiceToneDetector() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass || !navigator.mediaDevices?.getUserMedia) {
    toast("Microfone indisponível neste navegador");
    return;
  }

  const btn = document.getElementById("voiceToneButton");
  if (btn) {
    btn.textContent = "🎤 Ouvindo...";
    btn.classList.add("active");
  }

  toast("Cante algumas notas - detectando seu tom...");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const audioContext = new AudioContextClass();
    if (audioContext.state === "suspended") await audioContext.resume();

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.85;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    state.voiceToneRunning = true;
    state.voiceToneStream = stream;
    state.voiceToneContext = audioContext;
    state.voiceToneSource = source;
    state.voiceToneAnalyser = analyser;
    state.voiceToneBuffer = new Float32Array(analyser.fftSize);
    state.voiceToneDetected = null;

    const detectedNotes = [];
    const startTime = performance.now();
    const DETECTION_DURATION_MS = 4000;

    function collectTick() {
      if (!state.voiceToneRunning) return;

      const elapsed = performance.now() - startTime;

      if (elapsed >= DETECTION_DURATION_MS) {
        stopVoiceToneDetector();
        applyDetectedVoiceTone(detectedNotes);
        return;
      }

      state.voiceToneAnalyser.getFloatTimeDomainData(state.voiceToneBuffer);

      const freq = detectPitch(state.voiceToneBuffer, state.voiceToneContext.sampleRate);
      if (freq) {
        const noteObj = frequencyToNote(freq);
        detectedNotes.push(noteObj.name);
      }

      state.voiceToneFrame = requestAnimationFrame(collectTick);
    }

    state.voiceToneFrame = requestAnimationFrame(collectTick);
  } catch {
    stopVoiceToneDetector();
    toast("Não foi possível abrir o microfone");
  }
}

function stopVoiceToneDetector() {
  if (state.voiceToneFrame) {
    cancelAnimationFrame(state.voiceToneFrame);
    state.voiceToneFrame = null;
  }
  if (state.voiceToneSource) {
    try { state.voiceToneSource.disconnect(); } catch {}
  }
  if (state.voiceToneStream) {
    state.voiceToneStream.getTracks().forEach((t) => t.stop());
  }
  if (state.voiceToneContext) {
    state.voiceToneContext.close().catch(() => {});
  }

  state.voiceToneRunning = false;
  state.voiceToneStream = null;
  state.voiceToneContext = null;
  state.voiceToneSource = null;
  state.voiceToneAnalyser = null;
  state.voiceToneBuffer = null;

  const btn = document.getElementById("voiceToneButton");
  if (btn) {
    btn.textContent = "🎤 Meu Tom";
    btn.classList.remove("active");
  }
}

function applyDetectedVoiceTone(detectedNotes) {
  if (!detectedNotes.length) {
    toast("Não detectei nenhum tom - tente cantar mais alto");
    return;
  }

  const counts = {};
  for (const note of detectedNotes) {
    counts[note] = (counts[note] || 0) + 1;
  }
  const dominantNote = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

  if (!state.baseKey) {
    toast("Abra uma cifra primeiro para usar o detector de tom");
    return;
  }

  const baseIndex = NOTE_INDEX[state.baseKey] ?? 0;
  const targetIndex = NOTE_INDEX[dominantNote] ?? 0;

  let semitones = targetIndex - baseIndex;
  if (semitones > 6) semitones -= 12;
  if (semitones < -6) semitones += 12;

  state.transposeOffset = semitones;
  renderCurrentSheet();
  updateToneButton();

  const toastMsg = semitones === 0
    ? `Sua voz está no tom original (${dominantNote})`
    : `Tom transportado para ${dominantNote} (${semitones > 0 ? "+" : ""}${semitones} semitons)`;

  toast(toastMsg);
}

function transposeCurrentSong(direction) {
  state.transposeOffset += direction;
  renderCurrentSheet();
}

function resetTone() {
  state.transposeOffset = 0;
  renderCurrentSheet();
}

function toggleSingerMode() {
  state.singerMode = !state.singerMode;
  localStorage.setItem("mdl.singerMode", String(state.singerMode));
  stopAutoScroll();
  closeChordGuide(true);
  renderCurrentSheet();
}

function toggleAutoScroll() {
  if (state.autoScrollTimer) {
    stopAutoScroll();
    return;
  }

  state.autoScrollTimer = setInterval(() => {
    dom.chordSheet.scrollTop += 1;
    const finished = dom.chordSheet.scrollTop + dom.chordSheet.clientHeight >= dom.chordSheet.scrollHeight - 2;
    if (finished) stopAutoScroll();
  }, 65);

  if (dom.autoButton) dom.autoButton.classList.add("active");
}

function stopAutoScroll() {
  if (state.autoScrollTimer) {
    clearInterval(state.autoScrollTimer);
    state.autoScrollTimer = null;
  }
  if (dom.autoButton) dom.autoButton.classList.remove("active");
}

function updateToneButton() {
  if (!dom.toneButton) return;
  dom.toneButton.textContent = currentKeyLabel();
}

function currentKeyLabel() {
  if (!state.baseKey) return "Tom";
  return `Tom ${transposeNote(state.baseKey, state.transposeOffset)}`;
}

function toggleTunerPanel() {
  state.tunerOpen = !state.tunerOpen;
  if (!state.tunerOpen) stopTuner(true);
  syncTunerControls();
}

function syncTunerControls() {
  if (dom.tunerPanel) dom.tunerPanel.hidden = !state.tunerOpen;
  if (dom.tunerButton) {
    dom.tunerButton.classList.toggle("active", state.tunerOpen);
    dom.tunerButton.setAttribute("aria-pressed", String(state.tunerOpen));
  }
  if (dom.tunerStartButton) {
    dom.tunerStartButton.textContent = state.tunerRunning ? "Parar" : "Iniciar";
    dom.tunerStartButton.classList.toggle("active", state.tunerRunning);
    dom.tunerStartButton.setAttribute("aria-label", state.tunerRunning ? "Parar afinador" : "Iniciar afinador");
  }
}

async function startTuner() {
  if (state.tunerRunning) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass || !navigator.mediaDevices?.getUserMedia) {
    setTunerStatus("Microfone indisponível");
    toast("Microfone indisponível neste navegador");
    return;
  }

  try {
    state.tunerOpen = true;
    syncTunerControls();
    setTunerStatus("Abrindo microfone");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    const audioContext = new AudioContextClass();
    if (audioContext.state === "suspended") await audioContext.resume();

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.82;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    state.tunerStream = stream;
    state.tunerAudioContext = audioContext;
    state.tunerSource = source;
    state.tunerAnalyser = analyser;
    state.tunerBuffer = new Float32Array(analyser.fftSize);
    state.tunerRunning = true;
    state.tunerLastAt = 0;
    syncTunerControls();
    tickTuner();
  } catch {
    stopTuner();
    setTunerStatus("Microfone bloqueado");
    toast("Não foi possível abrir o microfone");
  }
}

function stopTuner(resetReading = false) {
  if (state.tunerFrame) {
    cancelAnimationFrame(state.tunerFrame);
    state.tunerFrame = null;
  }
  if (state.tunerSource) {
    try {
      state.tunerSource.disconnect();
    } catch {}
  }
  if (state.tunerStream) {
    state.tunerStream.getTracks().forEach((track) => track.stop());
  }
  if (state.tunerAudioContext) {
    state.tunerAudioContext.close().catch(() => {});
  }

  state.tunerRunning = false;
  state.tunerStream = null;
  state.tunerAudioContext = null;
  state.tunerSource = null;
  state.tunerAnalyser = null;
  state.tunerBuffer = null;
  state.tunerLastAt = 0;

  if (resetReading) resetTunerReading();
  else if (dom.tunerCents) dom.tunerCents.textContent = "Afinador pausado";
  syncTunerControls();
}

function tickTuner(timestamp = performance.now()) {
  if (!state.tunerRunning || !state.tunerAnalyser || !state.tunerBuffer) return;
  state.tunerFrame = requestAnimationFrame(tickTuner);

  if (timestamp - state.tunerLastAt < TUNER_UPDATE_INTERVAL_MS) return;
  state.tunerLastAt = timestamp;

  state.tunerAnalyser.getFloatTimeDomainData(state.tunerBuffer);
  const frequency = detectPitch(state.tunerBuffer, state.tunerAudioContext.sampleRate);
  renderTunerReading(frequency);
}

function detectPitch(buffer, sampleRate) {
  let sumSquares = 0;
  for (const sample of buffer) sumSquares += sample * sample;
  const rms = Math.sqrt(sumSquares / buffer.length);
  if (rms < TUNER_SILENCE_RMS) return null;

  const minTau = Math.max(2, Math.floor(sampleRate / TUNER_MAX_FREQUENCY));
  const maxTau = Math.min(buffer.length - 1, Math.floor(sampleRate / TUNER_MIN_FREQUENCY));
  const searchLength = buffer.length - maxTau;
  const yin = new Float32Array(maxTau + 1);

  for (let tau = 1; tau <= maxTau; tau += 1) {
    let difference = 0;
    for (let index = 0; index < searchLength; index += 1) {
      const delta = buffer[index] - buffer[index + tau];
      difference += delta * delta;
    }
    yin[tau] = difference;
  }

  let runningSum = 0;
  for (let tau = 1; tau <= maxTau; tau += 1) {
    runningSum += yin[tau];
    yin[tau] = runningSum ? (yin[tau] * tau) / runningSum : 1;
  }

  for (let tau = minTau; tau <= maxTau; tau += 1) {
    if (yin[tau] < 0.12) {
      while (tau + 1 <= maxTau && yin[tau + 1] < yin[tau]) tau += 1;
      const betterTau = refinePitchTau(yin, tau);
      return sampleRate / betterTau;
    }
  }

  return null;
}

function refinePitchTau(yin, tau) {
  const previous = yin[tau - 1];
  const current = yin[tau];
  const next = yin[tau + 1];
  if (previous === undefined || next === undefined) return tau;
  const divisor = previous + next - (2 * current);
  return divisor ? tau + ((previous - next) / (2 * divisor)) : tau;
}

function renderTunerReading(frequency) {
  if (!frequency) {
    resetTunerReading("Aguardando som");
    return;
  }

  const note = frequencyToNote(frequency);
  const cents = Math.round(note.cents);
  const offset = clamp(note.cents, -50, 50);

  if (dom.tunerNote) dom.tunerNote.textContent = note.name;
  if (dom.tunerFrequency) dom.tunerFrequency.textContent = `${frequency.toFixed(1)} Hz`;
  if (dom.tunerNeedle) dom.tunerNeedle.style.left = `${50 + offset}%`;
  if (dom.tunerCents) {
    dom.tunerCents.textContent = Math.abs(cents) <= 5
      ? "Afinado!"
      : cents < 0
        ? `Suba ${Math.abs(cents)} cents`
        : `Desça ${Math.abs(cents)} cents`;
  }
}

function frequencyToNote(frequency) {
  const midi = Math.round(12 * Math.log2(frequency / 440) + 69);
  const noteIndex = (midi + 1200) % 12;
  const target = 440 * (2 ** ((midi - 69) / 12));
  return {
    name: NOTE_SHARP[noteIndex],
    octave: Math.floor(midi / 12) - 1,
    cents: 1200 * Math.log2(frequency / target)
  };
}

function resetTunerReading(message = "Iniciar microfone") {
  if (dom.tunerNote) dom.tunerNote.textContent = "A";
  if (dom.tunerFrequency) dom.tunerFrequency.textContent = "440 Hz";
  if (dom.tunerCents) dom.tunerCents.textContent = message;
  if (dom.tunerNeedle) dom.tunerNeedle.style.left = "50%";
}

function setTunerStatus(message) {
  if (dom.tunerCents) dom.tunerCents.textContent = message;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function startService() {
  const first = state.play[0];
  if (!first) return toast("Adicione músicas ao culto primeiro");
  openSong(first.id);
}

async function sharePlay() {
  const songs = state.play.map((entry, index) => {
    const song = findSong(entry.id);
    if (!song) return null;
    return `${index + 1}. ${song.title} - ${song.artist} (${entry.key || song.key || "Tom"})`;
  }).filter(Boolean);

  if (!songs.length) return toast("Nenhuma música no culto");

  const text = `Play do ensaio - MDL Monte Sião\n\n${songs.join("\n")}`;
  if (navigator.share) {
    await navigator.share({ title: "Play do ensaio", text });
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    toast("Lista copiada");
  } else {
    toast("Compartilhamento indisponível");
  }
}

function saveContacts() {
  localStorage.setItem("mdl.contacts", JSON.stringify(state.contacts || []));
}

function notifyContactsWhatsApp(songId) {
  const contacts = state.contacts || [];
  if (!contacts.length) return;

  const song = findSong(songId);
  if (!song) return;

  const playEntry = state.play.find((e) => e.id === songId);
  const key = playEntry?.key || song.key || "Tom não definido";
  const appUrl = window.location.origin;

  const message =
    `🎵 *${song.title}*\n` +
    `Artista: ${song.artist || "Desconhecido"}\n` +
    `Tom: *${key}*\n\n` +
    `Adicionada ao Play do ensaio!\n` +
    `👉 Acesse a cifra: ${appUrl}`;

  const confirmSend = confirm(
    `Notificar ${contacts.length} contato(s) sobre "${song.title}" no tom ${key}?\n\nClique OK para abrir o WhatsApp para cada contato.`
  );

  if (!confirmSend) return;

  contacts.forEach((contact, index) => {
    const phone = contact.phone.replace(/\D/g, "");
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    setTimeout(() => {
      window.open(waUrl, "_blank");
    }, index * 800);
  });
}

function openContactsModal() {
  if (!isLeader()) return requireLeader();

  let modal = document.getElementById("contactsModal");
  if (!modal) {
    modal = document.createElement("section");
    modal.id = "contactsModal";
    modal.className = "account-modal";
    modal.setAttribute("aria-labelledby", "contactsTitle");
    modal.innerHTML = `
      <button class="account-backdrop" type="button" data-action="close-contacts" aria-label="Fechar contatos"></button>
      <div class="account-card" style="max-width:480px">
        <div class="account-head">
          <div>
            <span>Líder</span>
            <h2 id="contactsTitle">Contatos do ministério</h2>
            <p>Serão notificados quando você adicionar músicas ao ensaio</p>
          </div>
          <button type="button" data-action="close-contacts" aria-label="Fechar">&times;</button>
        </div>

        <div id="contactsList" style="margin-bottom:1rem"></div>

        <div style="display:flex;flex-direction:column;gap:8px;padding-top:1rem;border-top:1px solid var(--border)">
          <strong style="font-size:14px">Adicionar contato</strong>
          <input id="contactNameInput" type="text" placeholder="Nome (ex: João Violão)" maxlength="60">
          <input id="contactPhoneInput" type="tel" placeholder="WhatsApp com DDI (ex: 5521999990000)" maxlength="20">
          <button type="button" data-action="add-contact" style="margin-top:4px">Adicionar</button>
        </div>

        <p class="account-status" id="contactsStatus" aria-live="polite"></p>
      </div>
    `;
    document.body.appendChild(modal);
  }

  renderContactsList();
  modal.hidden = false;
  modal.removeAttribute("hidden");
}

function closeContactsModal() {
  const modal = document.getElementById("contactsModal");
  if (modal) modal.hidden = true;
}

function renderContactsList() {
  const list = document.getElementById("contactsList");
  if (!list) return;

  const contacts = state.contacts || [];

  if (!contacts.length) {
    list.innerHTML = `<p style="color:var(--text-2);font-size:13px">Nenhum contato cadastrado ainda.</p>`;
    return;
  }

  list.innerHTML = contacts.map((c, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
      <div>
        <strong style="font-size:14px">${escapeHtml(c.name)}</strong>
        <small style="display:block;color:var(--text-2)">${escapeHtml(c.phone)}</small>
      </div>
      <button type="button" data-action="remove-contact" data-index="${i}"
        style="font-size:13px;padding:4px 10px">Remover</button>
    </div>
  `).join("");
}

function addContact() {
  const nameInput = document.getElementById("contactNameInput");
  const phoneInput = document.getElementById("contactPhoneInput");
  const status = document.getElementById("contactsStatus");

  const name = nameInput?.value.trim();
  const phone = phoneInput?.value.replace(/\D/g, "").trim();

  if (!name) {
    if (status) status.textContent = "Digite o nome do contato";
    return;
  }
  if (!phone || phone.length < 10) {
    if (status) status.textContent = "Digite um número de WhatsApp válido com DDI (ex: 5521999990000)";
    return;
  }

  if (!state.contacts) state.contacts = [];
  state.contacts.push({ name, phone });
  saveContacts();
  renderContactsList();

  if (nameInput) nameInput.value = "";
  if (phoneInput) phoneInput.value = "";
  if (status) status.textContent = `${name} adicionado!`;
  setTimeout(() => { if (status) status.textContent = ""; }, 2500);
}

function removeContact(index) {
  if (!state.contacts) return;
  const removed = state.contacts[index];
  state.contacts.splice(index, 1);
  saveContacts();
  renderContactsList();
  if (removed) toast(`${removed.name} removido`);
}

function togglePlayEditing() {
  if (!isLeader()) return requireLeader();
  state.playEditing = !state.playEditing;
  renderPlay();
}


function isDevMode() { return Boolean(state.devMode && state.devToken); }
async function handleDevLogoTap() {
  clearTimeout(state.devTapTimer);
  state.devTapCount += 1;
  state.devTapTimer = setTimeout(() => { state.devTapCount = 0; }, 2600);
  if (state.devTapCount < 5) return;
  state.devTapCount = 0;
  if (state.devMode) { showView("dev"); return; }
  const password = prompt("Senha do Modo Desenvolvedor:");
  if (!password) return;
  await loginDevMode(password);
}
async function loginDevMode(password) {
  try {
    const response = await fetch("/api/dev-login", { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ password }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.token) throw new Error(data.error || "dev-denied");
    state.devMode = true; state.devToken = data.token; sessionStorage.setItem("mdl.devToken", data.token);
    await loadDevChordLibrary(); syncAuthUi(); renderAll(); showView("dev"); toast("Modo desenvolvedor ativado");
  } catch { toast("Senha DEV inválida"); }
}
function disableDevMode() {
  state.devMode = false;
  state.devToken = "";
  sessionStorage.removeItem("mdl.devToken");
  document.body.classList.remove("role-dev", "screen-dev");
  document.querySelectorAll(".dev-only-card, .dev-only").forEach((el) => { el.hidden = true; });
  document.getElementById("devReaderEditButton")?.remove();
}
function exitDevMode() {
  disableDevMode();
  showView("acervo");
  syncAuthUi();
  renderAll();
  toast("Modo desenvolvedor encerrado");
}
function devHeaders(extra = {}) { return authHeaders({ ...extra, ...(state.devToken ? { "X-Dev-Token": state.devToken } : {}) }); }
async function loadDevChordLibrary() { if (!state.devToken) return; try { const response = await fetch(`/api/dev/chords?v=${Date.now()}`, { headers: devHeaders() }); const data = await response.json().catch(() => ({})); if (response.ok && data.chords && typeof data.chords === "object") { state.customChordShapes = data.chords; Object.assign(CHORD_SHAPE_LIBRARY, data.chords); } } catch {} }
function renderDevWorkspace() { if (!state.devMode) return; renderDevSongList(); renderDevChordList(); renderDevChordEditor(); }
function showDevTab(tab = "cifras") { const key = tab === "acordes" ? "acordes" : "cifras"; document.querySelectorAll(".dev-card").forEach((button) => button.classList.toggle("active", button.dataset.tab === key)); document.getElementById("devTabCifras")?.classList.toggle("active", key === "cifras"); document.getElementById("devTabAcordes")?.classList.toggle("active", key === "acordes"); }
function renderDevSongList() { if (!dom.devSongList || !state.devMode) return; const query = normalize(dom.devSongSearch?.value || ""); const songs = state.songs.filter((song) => !query || normalize(`${song.title} ${song.artist} ${song.collection || ""}`).includes(query)).slice(0, 120); dom.devSongList.innerHTML = songs.length ? songs.map((song) => `<button type="button" data-action="dev-open-song" data-id="${escapeAttr(song.id)}" class="${song.id === state.devCurrentSongId ? "active" : ""}"><strong>${escapeHtml(song.title)}</strong><span>${escapeHtml(song.artist)}</span></button>`).join("") : `<div class="dev-empty">Nenhuma música encontrada.</div>`; }
async function openDevEditorFromReader() { if (!state.currentSongId) return; await openDevSong(state.currentSongId, true); }
async function openDevSong(id, goToDev = false) { if (!state.devMode) return; const song = findSong(id); if (!song) return; state.devCurrentSongId = id; state.devPreviewTranspose = 0; if (dom.devSongStatus) dom.devSongStatus.textContent = "Carregando música..."; try { const response = await fetch(`/api/songs/${encodeURIComponent(id)}?v=${Date.now()}`); const data = response.ok ? await response.json() : {}; if (dom.devSongTitle) dom.devSongTitle.value = data.title || song.title || ""; if (dom.devSongArtist) dom.devSongArtist.value = data.artist || song.artist || ""; if (dom.devSongKey) dom.devSongKey.value = data.key || song.key || ""; if (dom.devSongCollection) dom.devSongCollection.value = data.collection || song.collection || ""; if (dom.devSongHtml) dom.devSongHtml.value = normalizeSheetContent(data.html || sampleSheets[id] || ""); if (dom.devSongStatus) dom.devSongStatus.textContent = ""; } catch { if (dom.devSongHtml) dom.devSongHtml.value = sampleSheets[id] || ""; if (dom.devSongStatus) dom.devSongStatus.textContent = "Usando versão local/offline."; } renderDevSongList(); renderDevPreview(); showDevTab("cifras"); if (goToDev) showView("dev"); }
function renderDevPreview() { if (!dom.devChordPreview) return; const rawHtml = dom.devSongHtml?.value || ""; const title = dom.devSongTitle?.value || "Selecione uma música"; if (dom.devPreviewTitle) dom.devPreviewTitle.textContent = title; const html = state.devPreviewSingerMode ? stripChordsToLyrics(rawHtml) : decorateChordHtml(transposeHtml(rawHtml, state.devPreviewTranspose)); dom.devChordPreview.innerHTML = `<pre>${html || "Abra uma música para testar a leitura."}</pre>`; }
function toggleDevPreviewSinger() { state.devPreviewSingerMode = !state.devPreviewSingerMode; renderDevPreview(); }
function transposeDevPreview(amount, reset = false) { state.devPreviewTranspose = reset ? 0 : state.devPreviewTranspose + amount; renderDevPreview(); }
async function saveDevSong() { if (!isDevMode()) return toast("Ative o modo desenvolvedor"); if (!state.devCurrentSongId) return toast("Selecione uma música"); if (dom.devSongStatus) dom.devSongStatus.textContent = "Salvando..."; try { const response = await fetch("/api/dev/save-song", { method: "POST", headers: devHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ id: state.devCurrentSongId, title: dom.devSongTitle?.value || "", artist: dom.devSongArtist?.value || "", key: dom.devSongKey?.value || "", collection: dom.devSongCollection?.value || "", html: dom.devSongHtml?.value || "" }) }); const data = await response.json().catch(() => ({})); if (!response.ok || !data.ok) throw new Error(data.error || "save-failed"); if (dom.devSongStatus) dom.devSongStatus.textContent = "Salvo com versionamento."; toast("Cifra salva"); await refreshLibrary(); if (state.currentSongId === state.devCurrentSongId) await openSong(state.devCurrentSongId); } catch { if (dom.devSongStatus) dom.devSongStatus.textContent = "Não foi possível salvar."; toast("Falha ao salvar cifra"); } }
async function restoreDevSongVersion() { if (!isDevMode()) return toast("Ative o modo desenvolvedor"); if (!state.devCurrentSongId) return toast("Selecione uma música"); if (!confirm("Restaurar a versão anterior desta música?")) return; try { const response = await fetch("/api/dev/restore-song", { method: "POST", headers: devHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ id: state.devCurrentSongId }) }); const data = await response.json().catch(() => ({})); if (!response.ok || !data.ok) throw new Error(data.error || "restore-failed"); await openDevSong(state.devCurrentSongId); await refreshLibrary(); toast("Versão restaurada"); } catch { toast("Não há versão anterior para restaurar"); } }
function getDevChordKeys() { return Object.keys(CHORD_SHAPE_LIBRARY).sort((a, b) => a.localeCompare(b, "pt-BR")); }
function renderDevChordList() { if (!dom.devChordList || !state.devMode) return; const query = normalize(dom.devChordSearch?.value || ""); const chords = getDevChordKeys().filter((name) => !query || normalize(name).includes(query)).slice(0, 180); dom.devChordList.innerHTML = chords.length ? chords.map((name) => `<button type="button" data-action="dev-open-chord" data-chord="${escapeAttr(name)}" class="${name === state.devChordName ? "active" : ""}"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(CHORD_SHAPE_LIBRARY[name]?.label || "Forma sugerida")}</span></button>`).join("") : `<div class="dev-empty">Nenhum acorde encontrado.</div>`; }
function openDevChord(name) {
  const chordName = String(name || "C").trim() || "C";
  const sourceShape = (state.customChordShapes && state.customChordShapes[chordName]) || CHORD_SHAPE_LIBRARY[chordName] || { frets: ["x", "x", "x", "x", "x", "x"], baseFret: 1 };
  const shape = normalizeChordShape(sourceShape);
  state.devChordName = chordName;
  state.devChordFrets = shape.frets.slice();
  state.devChordBaseFret = shape.baseFret || 1;
  state.devChordBarres = shape.barres || [];
  if (dom.devChordNameInput) dom.devChordNameInput.value = chordName;
  if (dom.devChordBaseFret) dom.devChordBaseFret.value = String(state.devChordBaseFret);
  if (dom.devChordBarre) dom.devChordBarre.value = formatDevBarres(state.devChordBarres);
  const parsed = parseChordName(chordName);
  const savedNotes = Array.isArray(sourceShape.notes) ? sourceShape.notes.join(", ") : "";
  if (dom.devChordNotes) dom.devChordNotes.value = savedNotes || (parsed ? buildChordNotes(parsed).join(", ") : "");
  renderDevChordList();
  renderDevChordEditor();
  showDevTab("acordes");
}
function openDevChordFromGuide() { const currentChord = state.activeChordBase ? transposeChordText(state.activeChordBase, state.transposeOffset) : dom.chordGuideName?.textContent; closeChordGuide(); showView("dev"); openDevChord(currentChord || "C"); }
function newDevChord() { state.devChordName = ""; state.devChordFrets = ["x", "x", "x", "x", "x", "x"]; state.devChordBaseFret = 1; state.devChordBarres = []; if (dom.devChordNameInput) dom.devChordNameInput.value = ""; if (dom.devChordNotes) dom.devChordNotes.value = ""; if (dom.devChordBaseFret) dom.devChordBaseFret.value = "1"; if (dom.devChordBarre) dom.devChordBarre.value = ""; renderDevChordEditor(); }
function clearDevChord() { state.devChordFrets = ["x", "x", "x", "x", "x", "x"]; state.devChordBarres = []; if (dom.devChordBarre) dom.devChordBarre.value = ""; renderDevChordEditor(); }
function syncDevChordFromInputs() { state.devChordName = String(dom.devChordNameInput?.value || "").trim(); state.devChordBaseFret = Math.max(1, Math.min(15, Number(dom.devChordBaseFret?.value || 1))); state.devChordBarres = parseDevBarres(dom.devChordBarre?.value || ""); renderDevChordPreview(); }
function renderDevChordEditor() { if (!dom.devChordGrid || !state.devMode) return; const rows = [1, 2, 3, 4, 5]; dom.devChordGrid.innerHTML = `<div class="dev-chord-grid-lines" aria-hidden="true">${STRING_LABELS.map((_, index) => `<span class="dev-string-line" style="--string:${index}"></span>`).join("")}${[0,1,2,3,4,5].map((fret) => `<span class="dev-fret-line" style="--fret:${fret}"></span>`).join("")}</div>${rows.map((row) => STRING_LABELS.map((_, stringIndex) => { const absoluteFret = state.devChordBaseFret + row - 1; const active = state.devChordFrets[stringIndex] === absoluteFret; return `<button type="button" class="dev-fret-dot${active ? " active" : ""}" style="--string:${stringIndex}; --fret:${row}" data-string="${stringIndex}" data-fret="${absoluteFret}" aria-label="Corda ${stringIndex + 1}, casa ${absoluteFret}"></button>`; }).join("")).join("")}`; dom.devChordGrid.querySelectorAll(".dev-fret-dot").forEach((button) => { button.addEventListener("click", () => { const stringIndex = Number(button.dataset.string); const fret = Number(button.dataset.fret); state.devChordFrets[stringIndex] = state.devChordFrets[stringIndex] === fret ? "x" : fret; renderDevChordEditor(); }); }); if (dom.devChordStringModes) { dom.devChordStringModes.innerHTML = STRING_LABELS.map((label, index) => { const value = state.devChordFrets[index]; return `<button type="button" data-string="${index}" class="${value === 0 ? "open" : value === "x" ? "muted" : ""}">${escapeHtml(label)}: ${value === 0 ? "O" : value === "x" ? "X" : value}</button>`; }).join(""); dom.devChordStringModes.querySelectorAll("button").forEach((button) => { button.addEventListener("click", () => { const index = Number(button.dataset.string); state.devChordFrets[index] = state.devChordFrets[index] === 0 ? "x" : 0; renderDevChordEditor(); }); }); } renderDevChordPreview(); }
function renderDevChordPreview() { if (!dom.devChordPreviewDiagram) return; const name = String(dom.devChordNameInput?.value || state.devChordName || "Acorde").trim(); if (dom.devChordPreviewName) dom.devChordPreviewName.textContent = name || "Acorde"; const shape = normalizeChordShape({ frets: state.devChordFrets, baseFret: state.devChordBaseFret, barres: state.devChordBarres, label: "Forma personalizada" }); dom.devChordPreviewDiagram.innerHTML = renderChordGuideDiagram({ shape }); }
async function saveDevChord() { if (!isDevMode()) return toast("Ative o modo desenvolvedor"); const name = String(dom.devChordNameInput?.value || "").trim(); if (!name) return toast("Digite o nome do acorde"); syncDevChordFromInputs(); const shape = { frets: state.devChordFrets, baseFret: state.devChordBaseFret, barres: state.devChordBarres, label: "Forma personalizada", notes: String(dom.devChordNotes?.value || "").split(",").map((note) => note.trim()).filter(Boolean) }; if (dom.devChordStatus) dom.devChordStatus.textContent = "Salvando acorde..."; try { const response = await fetch("/api/dev/save-chord", { method: "POST", headers: devHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ name, shape }) }); const data = await response.json().catch(() => ({})); if (!response.ok || !data.ok) throw new Error(data.error || "save-chord-failed"); CHORD_SHAPE_LIBRARY[name] = shape; state.customChordShapes = { ...(state.customChordShapes || {}), [name]: shape }; state.devChordName = name; renderDevChordList(); renderDevChordPreview(); if (state.chordGuideOpen) refreshChordGuide(); if (dom.devChordStatus) dom.devChordStatus.textContent = "Acorde salvo. Clique em Conferir no sistema para testar."; toast("Acorde salvo"); } catch { if (dom.devChordStatus) dom.devChordStatus.textContent = "Não foi possível salvar."; toast("Falha ao salvar acorde"); } }
function parseDevBarres(value) { return String(value || "").split(/[;,]/).map((item) => { const match = item.trim().match(/^(\d+)\s*:\s*(\d)\s*-\s*(\d)$/); if (!match) return null; return { fret: Number(match[1]), fromString: Number(match[2]), toString: Number(match[3]) }; }).filter(Boolean); }
function formatDevBarres(barres) { return (barres || []).map((barre) => `${barre.fret}:${barre.fromString}-${barre.toString}`).join(", "); }

async function adminRefresh() {
  try {
    await fetch("/api/import", { method: "POST" });
    toast("Atualizando acervo");
    setTimeout(refreshLibrary, 1600);
  } catch {
    toast("Não foi possível atualizar");
  }
}

function updateStats() {
  const total = state.songs.length;
  const artists = new Set(state.songs.map((song) => song.artist)).size;
  const audioCount = Array.from(state.songMedia.values()).filter((media) => media.audioBlob).length;
  dom.libraryStats.textContent = `${total} ${total === 1 ? "música" : "músicas"} · ${artists} ${artists === 1 ? "artista" : "artistas"}`;
  dom.favoriteStats.textContent = `${state.favorites.size} ${state.favorites.size === 1 ? "música" : "músicas"}`;
  if (dom.playStats) dom.playStats.textContent = `${state.play.length} ${state.play.length === 1 ? "música separada" : "músicas separadas"}`;
  dom.playCount.textContent = String(state.play.length);
  if (dom.worshipCount) dom.worshipCount.textContent = String(state.play.length);
  if (dom.worshipProgress) dom.worshipProgress.style.width = state.play.length ? `${Math.min(100, Math.max(26, state.play.length * 20))}%` : "0%";
  dom.artistStats.textContent = `${artists} ${artists === 1 ? "artista" : "artistas"}`;
  if (dom.adminSongCount) dom.adminSongCount.textContent = formatNumber(total);
  if (dom.adminArtistCount) dom.adminArtistCount.textContent = formatNumber(artists);
  if (dom.dashboardSongCount) dom.dashboardSongCount.textContent = formatNumber(total);
  if (dom.dashboardArtistCount) dom.dashboardArtistCount.textContent = formatNumber(artists);
  if (dom.dashboardAudioCount) dom.dashboardAudioCount.textContent = formatNumber(audioCount);
  if (dom.dashboardFavoriteCount) dom.dashboardFavoriteCount.textContent = formatNumber(state.favorites.size);
  if (dom.dashboardPlayCount) dom.dashboardPlayCount.textContent = formatNumber(state.play.length);
  if (dom.dashboardArtistShortcutCount) dom.dashboardArtistShortcutCount.textContent = formatNumber(artists);
  if (dom.adminUpdatedAt) dom.adminUpdatedAt.textContent = state.generatedAt ? `Atualizada hoje às ${formatTime(state.generatedAt)}` : "Atualizada automaticamente";
}

function savePlay() {
  localStorage.setItem("mdl.playEnsaio", JSON.stringify(state.play));
  if (state.playUpdatedAt) localStorage.setItem("mdl.playEnsaioUpdatedAt", state.playUpdatedAt);
  else localStorage.removeItem("mdl.playEnsaioUpdatedAt");
  if (state.playDirty) localStorage.setItem("mdl.playEnsaioDirty", "true");
  else localStorage.removeItem("mdl.playEnsaioDirty");
  renderDashboard();
  updateStats();
}

function getPlayableSongIdSet() {
  if (!state.catalogReady) return null;
  return new Set(state.songs.map((song) => song.id).filter(Boolean));
}

function getPlaySignature(items = state.play) {
  return JSON.stringify(normalizePlayEntries(items, null).map((entry) => `${entry.id}:${entry.key || ""}`));
}

async function pushSharedPlay({ silent = false } = {}) {
  if (!isLeader() || !state.auth?.token || !state.catalogReady) return false;

  try {
    const response = await fetch("/api/play", {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ items: state.play })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "play-sync-failed");

    state.play = normalizePlayEntries(data.play);
    state.playUpdatedAt = data.updatedAt || "";
    state.playDirty = false;
    savePlay();
    return true;
  } catch {
    state.playDirty = true;
    savePlay();
    if (!silent) toast("Play salvo neste aparelho e sera sincronizado quando a conexao voltar");
    return false;
  }
}

async function syncSharedPlay({ allowLeaderSeed = false, silent = true } = {}) {
  if (!state.auth?.token || !state.catalogReady) return false;

  const localPlay = normalizePlayEntries(state.play);
  if (getPlaySignature(localPlay) !== getPlaySignature(state.play)) {
    state.play = localPlay;
    savePlay();
  }

  try {
    const response = await fetch(`/api/play?v=${Date.now()}`, {
      headers: authHeaders()
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "play-fetch-failed");

    const remotePlay = normalizePlayEntries(data.play);
    const remoteUpdatedAt = data.updatedAt || "";
    const localSignature = getPlaySignature(localPlay);
    const remoteSignature = getPlaySignature(remotePlay);

    if (allowLeaderSeed && isLeader() && localSignature && !remoteSignature && !remoteUpdatedAt) {
      return pushSharedPlay({ silent });
    }

    if (state.playDirty && isLeader()) {
      const canPublishLocal = !state.playUpdatedAt || state.playUpdatedAt === remoteUpdatedAt || remoteSignature === localSignature;
      if (canPublishLocal) {
        return pushSharedPlay({ silent: true });
      }
    }

    if (remoteSignature !== localSignature || remoteUpdatedAt !== state.playUpdatedAt) {
      state.play = remotePlay;
      state.playUpdatedAt = remoteUpdatedAt;
      state.playDirty = false;
      savePlay();
      return true;
    }

    if (state.playDirty) {
      state.playDirty = false;
      savePlay();
    }
    return false;
  } catch {
    if (!silent && state.playDirty) toast("Sem conexao para atualizar o Play compartilhado");
    return false;
  }
}

function findSong(id) {
  return state.songs.find((song) => song.id === id);
}

function getArtistSongs(artist) {
  return state.songs.filter((song) => song.artist === artist);
}

function getArtistOfflineInfo(artist) {
  const songs = getArtistSongs(artist);
  const saved = songs.filter((song) => state.offlineSongs.has(song.id)).length;
  return { songs, saved, total: songs.length };
}

function normalizePlayEntries(items, validSongIds = getPlayableSongIdSet()) {
  if (!Array.isArray(items)) return [];

  const normalized = [];
  const seen = new Set();
  for (const item of items) {
    const rawId = typeof item === "string" ? item : item?.id;
    const id = typeof rawId === "string" ? rawId.trim() : "";
    if (!id || seen.has(id)) continue;
    if (validSongIds && !validSongIds.has(id)) continue;

    const key = typeof item === "object" && item && typeof item.key === "string"
      ? item.key.trim() || null
      : null;

    normalized.push({ id, key });
    seen.add(id);
  }
  return normalized;
}

function migratePlay(items) {
  return normalizePlayEntries(items, null);
}

async function downloadSongForOffline(id) {
  if (!id) return;
  const saved = await downloadSingleSongForOffline(id);
  if (saved) {
    renderOfflineStatus();
    toast("Cifra disponível offline");
  } else {
    toast("Não foi possível baixar offline");
  }
}

async function downloadArtistForOffline(artist) {
  const artistName = String(artist || "");
  if (!artistName.trim() || state.offlineArtistDownloads.has(artistName)) return;

  const { songs, saved, total } = getArtistOfflineInfo(artistName);
  if (!total) return toast("Artista não encontrado");

  const pendingIds = songs
    .map((song) => song.id)
    .filter((id) => id && !state.offlineSongs.has(id));

  if (!pendingIds.length) {
    renderArtists();
    return toast("Biblioteca já está offline");
  }

  state.offlineArtistDownloads.set(artistName, { saved, total });
  renderArtists();
  toast(`Baixando ${pendingIds.length} cifras`);

  try {
    await downloadIdsForOffline(pendingIds, (savedNow) => {
      const current = state.offlineArtistDownloads.get(artistName);
      if (!current) return;
      current.saved = Math.min(total, saved + savedNow);
      state.offlineArtistDownloads.set(artistName, current);
      renderArtists();
    });

    renderOfflineStatus();
    const info = getArtistOfflineInfo(artistName);
    toast(info.saved >= info.total ? "Biblioteca offline pronta" : `${info.saved}/${info.total} cifras offline`);
  } catch {
    toast("Não foi possível baixar toda a biblioteca");
  } finally {
    state.offlineArtistDownloads.delete(artistName);
    renderOfflineStatus();
  }
}

async function downloadPlayForOffline() {
  const ids = state.play.map((entry) => entry.id).filter(Boolean);
  if (!ids.length) return;

  try {
    await downloadIdsForOffline(ids);
    renderOfflineStatus();
  } catch {
    await Promise.all(ids.map((id) => downloadSingleSongForOffline(id)));
    renderOfflineStatus();
  }
}

async function downloadIdsForOffline(ids, onProgress) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean))).filter((id) => !state.offlineSongs.has(id));
  const savedIds = [];

  for (const chunk of chunkArray(uniqueIds, OFFLINE_BUNDLE_SIZE)) {
    let savedChunkIds = [];
    try {
      savedChunkIds = await downloadOfflineBundle(chunk);
    } catch {
      savedChunkIds = [];
      for (const id of chunk) {
        if (await downloadSingleSongForOffline(id)) savedChunkIds.push(id);
      }
    }
    savedIds.push(...savedChunkIds);
    if (onProgress) onProgress(savedIds.length);
  }

  return savedIds;
}

async function downloadOfflineBundle(ids) {
  const response = await fetch("/api/offline-bundle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids })
  });
  if (!response.ok) throw new Error("bundle-failed");

  const bundle = await response.json();
  const returnedIds = new Set();
  const savedIds = [];

  for (const song of bundle.songs || []) {
    if (!song?.id) continue;
    returnedIds.add(song.id);
    if (await saveOfflineSongRecord(song)) savedIds.push(song.id);
  }

  for (const id of ids.filter((item) => !returnedIds.has(item))) {
    if (await downloadSingleSongForOffline(id)) savedIds.push(id);
  }

  return savedIds;
}

async function downloadSingleSongForOffline(id) {
  if (!id) return false;
  try {
    const response = await fetch(`/api/songs/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error("download-failed");
    const song = await response.json();
    return saveOfflineSongRecord(song);
  } catch {
    const cached = await idbGetSong(id).catch(() => null);
    if (!cached) return false;
    state.offlineSongs.add(id);
    return true;
  }
}

async function saveOfflineSongRecord(song) {
  if (!song?.id) return false;
  await idbSaveSong(song);
  state.offlineSongs.add(song.id);
  return true;
}

function renderOfflineStatus() {
  renderPlay();
  renderArtists();
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function refreshOfflineSongIds() {
  const songs = await idbGetAllSongs().catch(() => []);
  state.offlineSongs = new Set(songs.map((song) => song.id));
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

function initTheme() {
  const savedTheme = localStorage.getItem("mdl.theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  applyTheme(savedTheme || (prefersDark ? "dark" : "light"));
}

function applyTheme(theme) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";
  state.theme = normalizedTheme;
  document.documentElement.dataset.theme = normalizedTheme;
  localStorage.setItem("mdl.theme", normalizedTheme);

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", normalizedTheme === "dark" ? "#090f1a" : "#111111");

  if (dom.themeToggleButton) {
    dom.themeToggleButton.setAttribute("aria-label", normalizedTheme === "dark" ? "Ativar modo claro" : "Ativar modo noturno");
    dom.themeToggleButton.setAttribute("aria-pressed", String(normalizedTheme === "dark"));
  }
  if (dom.themeToggleIcon) {
    dom.themeToggleIcon.innerHTML = normalizedTheme === "dark" ? "&#9728;" : "&#9790;";
  }
}

function toggleTheme() {
  applyTheme(state.theme === "dark" ? "light" : "dark");
}

function initInstallPrompt() {
  setInstallPromptState();
  bindInstallPromptActivity();

  if (isAppInstalled()) {
    markAppInstalled();
    hideInstallPrompt(true);
    return;
  }

  if (!isStandaloneApp()) {
    setTimeout(showInstallPrompt, 800);
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    showInstallPrompt();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    markAppInstalled();
    hideInstallPrompt(true);
    toast("Aplicativo instalado na tela inicial");
  });
}

function showInstallPrompt() {
  if (!dom.installPrompt || isAppInstalled()) return;
  setInstallPromptState();
  dom.installPrompt.hidden = false;
  requestAnimationFrame(() => {
    dom.installPrompt.classList.add("visible");
    scheduleInstallPromptAutoHide();
  });
}

function hideInstallPrompt(immediate = false) {
  if (!dom.installPrompt) return;
  clearInstallPromptAutoHide();
  dom.installPrompt.classList.remove("visible");
  if (immediate) {
    dom.installPrompt.hidden = true;
    return;
  }
  setTimeout(() => {
    dom.installPrompt.hidden = true;
  }, 180);
}

function setInstallPromptState() {
  if (!dom.installPromptButton) return;
  const installed = isAppInstalled();
  dom.installPromptButton.disabled = installed;
  dom.installPromptButton.textContent = installed ? "Instalado" : "Instalar";

  if (dom.installPromptText) {
    if (installed) {
      dom.installPromptText.textContent = "Aplicativo instalado na tela inicial.";
    } else if (deferredInstallPrompt) {
      dom.installPromptText.textContent = "Toque em Instalar para criar o icone na tela inicial.";
    } else {
      dom.installPromptText.textContent = getInstallHelpMessage();
    }
  }
}

function bindInstallPromptActivity() {
  if (!dom.installPrompt) return;
  ["pointerdown", "keydown", "focusin"].forEach((eventName) => {
    dom.installPrompt.addEventListener(eventName, clearInstallPromptAutoHide);
  });
}

function scheduleInstallPromptAutoHide() {
  clearInstallPromptAutoHide();
  installPromptAutoHideTimer = setTimeout(() => hideInstallPrompt(), INSTALL_PROMPT_AUTO_HIDE_MS);
}

function clearInstallPromptAutoHide() {
  if (!installPromptAutoHideTimer) return;
  clearTimeout(installPromptAutoHideTimer);
  installPromptAutoHideTimer = null;
}

async function installApp() {
  if (isAppInstalled()) {
    toast("O aplicativo ja esta instalado");
    return;
  }

  if (!deferredInstallPrompt) {
    toast(getInstallHelpMessage());
    return;
  }

  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice.catch(() => null);
  deferredInstallPrompt = null;
  setInstallPromptState();

  if (choice?.outcome === "accepted") {
    hideInstallPrompt();
    toast("Instalacao iniciada");
  } else {
    toast("Instalacao cancelada");
  }
}

function isStandaloneApp() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function isAppInstalled() {
  return isStandaloneApp() || localStorage.getItem("mdl.appInstalled") === "true";
}

function markAppInstalled() {
  localStorage.setItem("mdl.appInstalled", "true");
}

function getInstallHelpMessage() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIos) {
    return "No Safari, toque em Compartilhar e depois em Adicionar a Tela de Inicio.";
  }
  return "No navegador, abra o menu e escolha Instalar aplicativo ou Adicionar a tela inicial.";
}

function openOfflineDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("indexeddb-unavailable"));
      return;
    }
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("songs")) {
        db.createObjectStore("songs", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("media")) {
        db.createObjectStore("media", { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbSaveSong(song) {
  if (!song?.id) return;
  const db = await openOfflineDb();
  await idbRequest(db.transaction("songs", "readwrite").objectStore("songs").put({
    ...song,
    savedOfflineAt: new Date().toISOString()
  }));
  db.close();
}

async function idbGetSong(id) {
  const db = await openOfflineDb();
  const song = await idbRequest(db.transaction("songs", "readonly").objectStore("songs").get(id));
  db.close();
  return song || null;
}

async function idbGetAllSongs() {
  const db = await openOfflineDb();
  const songs = await idbRequest(db.transaction("songs", "readonly").objectStore("songs").getAll());
  db.close();
  return songs || [];
}

async function idbPutMedia(record) {
  if (!record?.key) return;
  const db = await openOfflineDb();
  await idbRequest(db.transaction("media", "readwrite").objectStore("media").put(record));
  db.close();
}

async function idbDeleteMedia(key) {
  if (!key) return;
  const db = await openOfflineDb();
  await idbRequest(db.transaction("media", "readwrite").objectStore("media").delete(key));
  db.close();
}

async function idbGetAllMedia() {
  const db = await openOfflineDb();
  const media = await idbRequest(db.transaction("media", "readonly").objectStore("media").getAll());
  db.close();
  return media || [];
}

async function loadLocalMedia() {
  state.songMedia = new Map();
  state.artistThumbs = new Map();
  const records = await idbGetAllMedia().catch(() => []);
  const userId = getCurrentUserId();

  for (const record of records) {
    if (record.userId !== userId) continue;
    if (record.type === "song-cover" && record.songId && record.dataUrl) {
      const media = getSongMedia(record.songId);
      media.cover = record.dataUrl;
      media.coverName = record.name || "";
      state.songMedia.set(record.songId, media);
    }
    if (record.type === "song-audio" && record.songId && record.blob) {
      const media = getSongMedia(record.songId);
      media.audioBlob = record.blob;
      media.audioName = record.name || "MP3 local";
      media.audioSize = record.size || record.blob.size || 0;
      media.audioMime = record.mime || record.blob.type || "audio/mpeg";
      state.songMedia.set(record.songId, media);
    }
    if (record.type === "artist-thumb" && record.artist && record.dataUrl) {
      state.artistThumbs.set(normalizeArtistName(record.artist), record.dataUrl);
    }
  }
}

async function idbSetMeta(key, value) {
  const db = await openOfflineDb();
  await idbRequest(db.transaction("meta", "readwrite").objectStore("meta").put({ key, value }));
  db.close();
}

async function idbGetMeta(key) {
  const db = await openOfflineDb();
  const record = await idbRequest(db.transaction("meta", "readonly").objectStore("meta").get(key));
  db.close();
  return record?.value || null;
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function normalizeSheetContent(html) {
  const match = String(html || "").match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  return (match ? match[1] : String(html || "")).trim();
}

function decorateChordHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("i").forEach((node) => {
    node.innerHTML = wrapChordNodeTokens(node.textContent || "");
  });
  return template.innerHTML;
}

function stripChordsToLyrics(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("i").forEach((node) => node.remove());

  const lines = (template.content.textContent || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim());

  const cleaned = [];
  for (const line of lines) {
    if (!line) {
      if (cleaned.length && cleaned[cleaned.length - 1]) cleaned.push("");
      continue;
    }
    cleaned.push(line);
  }

  while (cleaned.length && !cleaned[0]) cleaned.shift();
  while (cleaned.length && !cleaned[cleaned.length - 1]) cleaned.pop();

  return escapeHtml(cleaned.join("\n"));
}

function splitChordSegments(text) {
  return String(text || "").split(/(\s+)/);
}

function mapChordTokens(text, chordMapper, otherMapper = (segment) => segment) {
  return splitChordSegments(text).map((segment) => {
    if (!segment) return "";
    if (/^\s+$/.test(segment)) return segment;
    const parsed = parseChordName(segment);
    return parsed ? chordMapper(parsed, segment) : otherMapper(segment);
  }).join("");
}

function findFirstChordToken(text) {
  for (const segment of splitChordSegments(text)) {
    if (!segment || /^\s+$/.test(segment)) continue;
    const parsed = parseChordName(segment);
    if (parsed) return parsed;
  }
  return null;
}

function wrapChordNodeTokens(text) {
  return mapChordTokens(
    text,
    (_, chordText) => `<span class="chord-token" data-chord="${escapeAttr(chordText)}" role="button" tabindex="0" aria-label="Mostrar acorde ${escapeAttr(chordText)}">${escapeHtml(chordText)}</span>`,
    (segment) => escapeHtml(segment)
  );
}

function buildChordGuide(chordName) {
  const parsed = parseChordName(chordName);
  if (!parsed) return null;

  const shape = resolveChordShape(parsed);
  const metaParts = [parsed.familyMeta.label];
  if (shape?.label) metaParts.push(shape.label);
  if (parsed.bass) metaParts.push(`baixo em ${parsed.bass}`);

  let hint = "Toque em outro acorde da cifra para ver a próxima posição.";
  if (!shape) {
    hint = `Ainda não há diagrama pronto para ${parsed.name}, mas as notas do acorde já apareceram aqui.`;
  } else if (shape.approximate && parsed.bass && !shape.handlesBass) {
    hint = `Mostrando uma base compatível. Ao tocar, destaque o baixo em ${parsed.bass}.`;
  } else if (shape.approximate) {
    hint = "Mostrando uma base compatível para você ajustar a extensão direto no instrumento.";
  } else if (parsed.bass && !shape.handlesBass) {
    hint = `Use a forma principal e destaque o baixo em ${parsed.bass}.`;
  }

  return {
    name: parsed.name,
    meta: metaParts.join(" · "),
    notes: buildChordNotes(parsed),
    shape,
    hint
  };
}

function renderChordGuideDiagram(guide) {
  if (!guide.shape) {
    return `<div class="chord-guide-empty">Diagrama ainda não disponível para esse tipo de acorde.</div>`;
  }

  return `
    <div class="chord-diagram-card">
      <div class="chord-diagram-top">${renderChordMarkers(guide.shape.frets)}</div>
      <div class="chord-diagram-body${guide.shape.baseFret === 1 ? " is-open" : ""}">
        ${guide.shape.baseFret > 1 ? `<span class="chord-base-fret">${guide.shape.baseFret}</span>` : ""}
        ${STRING_LABELS.map((_, index) => `<span class="chord-string-line" style="--string:${index};"></span>`).join("")}
        ${[0, 1, 2, 3, 4, 5].map((fret) => `<span class="chord-fret-line${fret === 0 && guide.shape.baseFret === 1 ? " nut" : ""}" style="--fret:${fret};"></span>`).join("")}
        ${renderChordBarres(guide.shape)}
        ${renderChordDots(guide.shape)}
      </div>
      <div class="chord-string-labels">${STRING_LABELS.map((label) => `<span>${label}</span>`).join("")}</div>
    </div>
  `;
}

function renderChordMarkers(frets) {
  return frets.map((fret) => {
    if (fret === "x") return `<span class="chord-marker muted">x</span>`;
    if (fret === 0) return `<span class="chord-marker open">o</span>`;
    return `<span class="chord-marker"></span>`;
  }).join("");
}

function renderChordDots(shape) {
  return shape.frets.map((fret, index) => {
    if (!Number.isInteger(fret) || fret <= 0) return "";
    const relativeFret = fret - shape.baseFret + 1;
    if (relativeFret < 1 || relativeFret > 5) return "";
    if (isStringCoveredByBarre(shape, index, fret)) return "";
    return `<span class="chord-dot" style="--string:${index}; --fret:${relativeFret};"></span>`;
  }).join("");
}

function renderChordBarres(shape) {
  return (shape.barres || []).map((barre) => {
    const relativeFret = barre.fret - shape.baseFret + 1;
    if (relativeFret < 1 || relativeFret > 5) return "";
    const start = Math.min(barre.fromString, barre.toString);
    const end = Math.max(barre.fromString, barre.toString);
    return `<span class="chord-barre" style="--string-start:${start}; --string-end:${end}; --fret:${relativeFret};"></span>`;
  }).join("");
}

function isStringCoveredByBarre(shape, stringIndex, fret) {
  return (shape.barres || []).some((barre) => {
    const start = Math.min(barre.fromString, barre.toString);
    const end = Math.max(barre.fromString, barre.toString);
    return barre.fret === fret && stringIndex >= start && stringIndex <= end;
  });
}

function parseChordName(chordName) {
  const normalized = String(chordName || "").trim().replace(/\s+/g, "");
  const match = normalized.match(/^([A-G](?:#|b)?)([0-9A-Za-zº°+\-#b()]*)(?:\/([A-G](?:#|b)?))?$/);
  if (!match) return null;

  const [, root, suffix = "", bass] = match;
  const family = detectChordFamilyNormalized(suffix);
  return {
    name: `${root}${suffix}${bass ? `/${bass}` : ""}`,
    root,
    suffix,
    bass: bass || null,
    family,
    familyMeta: CHORD_FAMILY_META[family] || CHORD_FAMILY_META.major
  };
}

function detectChordFamily(suffix) {
  const compact = String(suffix || "").replace(/\s+/g, "");
  if (!compact) return "major";
  if (/sus2/i.test(compact)) return "sus2";
  if (/sus4/i.test(compact) || /\(4\)/.test(compact)) return compact.includes("7") ? "7sus4" : "sus4";
  if (/dim/i.test(compact) || /[º°]/.test(compact)) return "dim";
  if (/aug/i.test(compact) || compact.includes("+")) return "aug";
  if (/maj7/i.test(compact) || /7M/.test(compact) || /M7/.test(compact)) return "maj7";
  if (/^m/i.test(compact) && compact.includes("7") && compact.includes("9")) return "m9";
  if (/^m/i.test(compact) && compact.includes("7")) return "m7";
  if (/^m/i.test(compact) && /(add9|9|2)/i.test(compact)) return "madd9";
  if (/(add9|9)/i.test(compact) && compact.includes("7")) return "9";
  if (/(add9|9|2)/i.test(compact)) return "add9";
  if (compact === "5") return "power";
  if (compact.includes("7")) return "7";
  if (/^m/i.test(compact)) return "minor";
  return "major";
}

function detectChordFamilyNormalized(suffix) {
  const compact = String(suffix || "").replace(/\s+/g, "");
  const isMinor = /^m(?!aj)/i.test(compact);
  const hasAddNine = /add\s*9/i.test(compact);
  const hasNine = /(?:^|[^0-9])9(?:$|[^0-9])/.test(compact) || /\(9\)/.test(compact);
  const hasTwo = !hasNine && (/(?:^|[^0-9])2(?:$|[^0-9])/.test(compact) || /\(2\)/.test(compact));

  if (!compact) return "major";
  if (/sus2/i.test(compact)) return "sus2";
  if (/sus4/i.test(compact) || /\(4\)/.test(compact)) return compact.includes("7") ? "7sus4" : "sus4";
  if (/dim/i.test(compact) || /[ÂºÂ°]/.test(compact)) return "dim";
  if (/aug/i.test(compact) || compact.includes("+")) return "aug";
  if (/maj7/i.test(compact) || /7M/.test(compact) || /M7/.test(compact)) return "maj7";
  if (isMinor && hasNine) return hasAddNine ? "madd9" : "m9";
  if (isMinor && compact.includes("7")) return "m7";
  if (isMinor && (hasAddNine || hasTwo)) return "madd9";
  if (hasNine) return hasAddNine ? "add9" : "9";
  if (hasAddNine || hasTwo) return "add9";
  if (compact === "5") return "power";
  if (compact.includes("7")) return "7";
  if (isMinor) return "minor";
  return "major";
}

function buildChordNotes(parsed) {
  const preferFlats = parsed.root.includes("b") || parsed.bass?.includes("b");
  const notes = parsed.familyMeta.intervals.map((interval) => transposeNote(parsed.root, interval, preferFlats));
  if (parsed.bass && !notes.includes(parsed.bass)) notes.unshift(parsed.bass);
  return Array.from(new Set(notes));
}

function resolveChordShape(parsed) {
  const exactKey = `${parsed.root}${parsed.familyMeta.lookup}${parsed.bass ? `/${parsed.bass}` : ""}`;
  const customExactShape = state.customChordShapes?.[parsed.name] || state.customChordShapes?.[exactKey];
  if (customExactShape) {
    return normalizeChordShape(customExactShape, { approximate: false, handlesBass: true });
  }
  const exactShape = CHORD_SHAPE_LIBRARY[exactKey];
  if (exactShape) {
    return normalizeChordShape(exactShape, { approximate: false, handlesBass: true });
  }

  const customBassShape = resolveCustomBassShape(parsed);
  if (customBassShape) {
    return customBassShape;
  }

  const baseKey = `${parsed.root}${parsed.familyMeta.lookup}`;
  const baseShape = CHORD_SHAPE_LIBRARY[baseKey];
  if (baseShape) {
    return normalizeChordShape(baseShape, {
      approximate: Boolean(parsed.bass) || Boolean(parsed.familyMeta.approximate),
      handlesBass: !parsed.bass
    });
  }

  if (!parsed.familyMeta.shapeFamily) return null;
  return createMovableShape(parsed);
}

function resolveCustomBassShape(parsed) {
  if (parsed.family !== "major" || !parsed.bass || parsed.suffix) return null;
  if ((NOTE_INDEX[parsed.bass] - NOTE_INDEX[parsed.root] + 12) % 12 !== 4) return null;

  let bestShape = null;
  let bestScore = null;

  for (const key of CUSTOM_MAJOR_BASS_SHAPE_KEYS) {
    const reference = parseChordName(key);
    const template = CHORD_SHAPE_LIBRARY[key];
    if (!reference || !template) continue;

    const upward = (NOTE_INDEX[parsed.root] - NOTE_INDEX[reference.root] + 12) % 12;
    const deltas = upward === 0 ? [0] : [upward, upward - 12];

    for (const delta of deltas) {
      const shiftedShape = transposeChordShape(template, delta);
      if (!shiftedShape) continue;
      const score = scoreChordShape(shiftedShape);
      if (!bestScore || score < bestScore) {
        bestShape = shiftedShape;
        bestScore = score;
      }
    }
  }

  return bestShape ? normalizeChordShape(bestShape, { approximate: false, handlesBass: true }) : null;
}

function transposeChordShape(shape, semitones) {
  const frets = shape.frets.map((fret) => {
    if (fret === "x") return "x";
    const nextFret = fret + semitones;
    return nextFret >= 0 ? nextFret : null;
  });
  if (frets.some((fret) => fret === null)) return null;

  const barres = (shape.barres || []).map((barre) => ({
    ...barre,
    fret: barre.fret + semitones
  }));
  if (barres.some((barre) => barre.fret < 0)) return null;

  return {
    ...shape,
    frets,
    barres
  };
}

function scoreChordShape(shape) {
  const positiveFrets = shape.frets.filter((value) => Number.isInteger(value) && value > 0);
  if (!positiveFrets.length) return 0;
  const maxFret = Math.max(...positiveFrets);
  const minFret = Math.min(...positiveFrets);
  return maxFret * 100 + minFret * 10 + (maxFret - minFret);
}

function createMovableShape(parsed) {
  const family = parsed.familyMeta.shapeFamily;
  const anchor = pickChordAnchor(parsed.root);
  const model = MOVABLE_CHORD_SHAPES[family]?.[anchor];
  if (!model) return null;

  const rootFret = fretForRoot(parsed.root, OPEN_STRING_NOTE_INDEX[anchor]);
  const frets = model.template.map((value) => value === "x" ? "x" : value + rootFret);
  return normalizeChordShape({
    frets,
    label: model.label,
    baseFret: frets.some((value) => value === 0) ? 1 : Math.max(1, rootFret)
  }, {
    approximate: Boolean(parsed.bass) || Boolean(parsed.familyMeta.approximate),
    handlesBass: !parsed.bass
  });
}

function pickChordAnchor(root) {
  const fretOnLowE = fretForRoot(root, OPEN_STRING_NOTE_INDEX.lowE);
  const fretOnA = fretForRoot(root, OPEN_STRING_NOTE_INDEX.a);
  return fretOnA < fretOnLowE ? "a" : "lowE";
}

function fretForRoot(root, openIndex) {
  return (NOTE_INDEX[root] - openIndex + 120) % 12;
}

function normalizeChordShape(shape, overrides = {}) {
  const positiveFrets = shape.frets.filter((value) => Number.isInteger(value) && value > 0);
  const hasOpenStrings = shape.frets.some((value) => value === 0);
  return {
    frets: shape.frets.slice(),
    barres: Array.isArray(shape.barres) ? shape.barres.map((barre) => ({ ...barre })) : [],
    label: shape.label || "Forma sugerida",
    baseFret: shape.baseFret || ((!hasOpenStrings && positiveFrets.length) ? Math.min(...positiveFrets) : 1),
    approximate: Boolean(shape.approximate || overrides.approximate),
    handlesBass: overrides.handlesBass ?? true
  };
}

function transposeHtml(html, semitones) {
  if (!semitones) return html;
  const template = document.createElement("template");
  template.innerHTML = html;
  const chordNodes = template.content.querySelectorAll("i");
  chordNodes.forEach((node) => {
    node.textContent = transposeChordText(node.textContent, semitones);
  });
  return template.innerHTML;
}

function transposeChordText(text, semitones) {
  if (!semitones) return String(text || "");
  return mapChordTokens(text, (parsed) => {
    const nextRoot = transposeNote(parsed.root, semitones);
    const nextBass = parsed.bass ? `/${transposeNote(parsed.bass, semitones)}` : "";
    return `${nextRoot}${parsed.suffix}${nextBass}`;
  });
}

function transposeNote(note, semitones, preferFlats = note.includes("b")) {
  const index = NOTE_INDEX[note];
  if (index === undefined) return note;
  const next = (index + semitones + 1200) % 12;
  return preferFlats ? NOTE_FLAT[next] : NOTE_SHARP[next];
}

function inferKeyFromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const firstChordNode = template.content.querySelector("i");
  const text = firstChordNode ? firstChordNode.textContent : template.content.textContent;
  const match = String(text || "").match(/\b([A-G](?:#|b)?)(?:[0-9A-Za-zº°+\-#b()]*)?(?:\/[A-G](?:#|b)?)?\b/);
  return match ? match[1] : null;
}

function emptyState(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function inferKeyFromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const firstChordNode = template.content.querySelector("i");
  const text = firstChordNode ? firstChordNode.textContent : template.content.textContent;
  return findFirstChordToken(text)?.root || null;
}

function toast(text) {
  const previous = document.querySelector(".toast");
  if (previous) previous.remove();
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = text;
  Object.assign(node.style, {
    position: "fixed",
    left: "50%",
    bottom: "18px",
    transform: "translateX(-50%)",
    background: "#171615",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "8px",
    boxShadow: "0 12px 28px rgba(0,0,0,.28)",
    fontSize: "13px",
    fontWeight: "850",
    zIndex: "50"
  });
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 1400);
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatTime(value) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
