/* =========================================================
   STUDENT PORTAL — APP.JS

   CONFIGURATION
   STATE
   SUPABASE
   DOM REFERENCES
   TOAST
   THEME
   NAVIGATION / VIEWS
   AUTHENTICATION
   SESSION
   INDEXEDDB
   OFFLINE MODE
   STUDENT DATA
   RESULT DATA
   SGPA / CGPA
   DASHBOARD
   RESULT TABLE
   MODAL
   PDF
   ERROR HANDLING
   EVENT LISTENERS
   INITIALIZATION
   ========================================================= */

/* ---------------------------------------------------------
   CONFIGURATION
   --------------------------------------------------------- */
const CONFIG = {
  // Browser-safe publishable key only. Never place a service-role
  // key or a Postgres connection string here — see README.md.
  supabaseUrl: "https://yydcbfrrsicqchgumhjr.supabase.co",
  supabasePublishableKey: "sb_publishable_HIABykMzBRENxXJxlTKATg_4QtyDgIV",
  studentsTable: "students",
  resultsTable: "results",
  dbName: "StudentPortalOffline",
  dbVersion: 1,
  toastDuration: 3400
};

/* ---------------------------------------------------------
   STATE
   --------------------------------------------------------- */
const STATE = {
  session: null,       // { regno, loggedInAt }
  student: null,       // current student row
  results: [],         // results for the active semester
  allSemesters: [],     // distinct semesters this student has data for
  activeSemester: null,
  isOnline: navigator.onLine,
  lastSynced: null,
  offlineViewing: false
};

/* ---------------------------------------------------------
   SUPABASE
   --------------------------------------------------------- */
let supabaseClient = null;

function initSupabase() {
  if (typeof supabase === "undefined" || !supabase.createClient) {
    console.error("Supabase library failed to load.");
    return false;
  }
  if (!supabaseClient) {
    supabaseClient = supabase.createClient(
      CONFIG.supabaseUrl,
      CONFIG.supabasePublishableKey
    );
  }
  return true;
}

/* ---------------------------------------------------------
   DOM REFERENCES
   --------------------------------------------------------- */
const $ = (id) => document.getElementById(id);

const dom = {};

function cacheDom() {
  Object.assign(dom, {
    header: document.querySelector(".app-header"),
    navLinks: document.querySelectorAll("[data-view-link]"),
    navIndicator: $("navIndicator"),
    themeToggle: $("themeToggle"),
    statusPill: $("statusPill"),

    loginForm: $("loginForm"),
    loginRegno: $("regno"),
    loginDob: $("dob"),
    loginMessage: $("loginMessage"),
    loginBtn: $("loginBtn"),

    dashName: $("dashName"),
    dashSub: $("dashSub"),
    avatarImg: $("avatarImg"),
    profileMeta: $("profileMeta"),
    statSemester: $("statSemester"),
    statCgpa: $("statCgpa"),
    statAttendance: $("statAttendance"),
    statStatus: $("statStatus"),
    infoGrid: $("infoGrid"),

    semesterTabs: $("semesterTabs"),
    ledgerBody: $("ledgerBody"),
    ledgerEmpty: $("ledgerEmpty"),
    ledgerLoading: $("ledgerLoading"),
    summarySubjects: $("summarySubjects"),
    summaryTotal: $("summaryTotal"),
    summarySgpa: $("summarySgpa"),
    summaryCgpa: $("summaryCgpa"),
    resultStatusBadge: $("resultStatusBadge"),
    downloadPdfBtn: $("downloadPdfBtn"),
    refreshBtn: $("refreshBtn"),
    lastSyncedNote: $("lastSyncedNote"),

    modalOverlay: $("subjectModal"),
    modalBody: $("modalBody"),
    modalClose: $("modalClose"),

    toastStack: $("toastStack"),
    logoutBtns: document.querySelectorAll("[data-logout]")
  });
}

/* ---------------------------------------------------------
   TOAST
   --------------------------------------------------------- */
function showToast(message, type = "info") {
  if (!dom.toastStack) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", "status");
  toast.textContent = message;
  dom.toastStack.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 350);
  }, CONFIG.toastDuration);
}

/* ---------------------------------------------------------
   THEME
   --------------------------------------------------------- */
function initTheme() {
  const saved = localStorage.getItem("sp_theme");
  const preferred = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(preferred);

  dom.themeToggle?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    applyTheme(current === "dark" ? "light" : "dark");
  });
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem("sp_theme", theme);
  if (dom.themeToggle) {
    dom.themeToggle.innerHTML = theme === "dark" ? ICONS.sun : ICONS.moon;
  }
}

const ICONS = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/></svg>'
};

/* ---------------------------------------------------------
   NAVIGATION / VIEWS
   --------------------------------------------------------- */
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  const target = $(`view-${name}`);
  if (target) target.classList.add("active");

  dom.navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.viewLink === name);
  });
  positionNavIndicator();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

  if (name === "results") renderSemesterTabs();
}

function positionNavIndicator() {
  const active = document.querySelector("[data-view-link].active");
  if (!active || !dom.navIndicator) return;
  const parentRect = active.parentElement.getBoundingClientRect();
  const rect = active.getBoundingClientRect();
  dom.navIndicator.style.width = `${rect.width}px`;
  dom.navIndicator.style.transform = `translateX(${rect.left - parentRect.left}px)`;
}

function initNav() {
  dom.navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const view = link.dataset.viewLink;
      if ((view === "dashboard" || view === "results") && !isLoggedIn()) {
        showToast("Please log in first.", "error");
        return;
      }
      showView(view);
    });
  });
  window.addEventListener("resize", positionNavIndicator);

  window.addEventListener("scroll", () => {
    dom.header?.classList.toggle("scrolled", window.scrollY > 8);
  }, { passive: true });
}

/* ---------------------------------------------------------
   SESSION
   --------------------------------------------------------- */
const SESSION_KEY = "sp_session";

function saveSession(regno) {
  STATE.session = { regno: String(regno).trim(), loggedInAt: new Date().toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(STATE.session));
}

function getSession() {
  if (STATE.session) return STATE.session;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    STATE.session = JSON.parse(raw);
    return STATE.session;
  } catch {
    return null;
  }
}

function isLoggedIn() {
  return !!getSession();
}

function clearSession() {
  STATE.session = null;
  STATE.student = null;
  STATE.results = [];
  localStorage.removeItem(SESSION_KEY);
}

function logout() {
  clearSession();
  showView("login");
  showToast("You've been logged out.", "info");
}

/* ---------------------------------------------------------
   INDEXEDDB
   --------------------------------------------------------- */
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(CONFIG.dbName, CONFIG.dbVersion);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("student")) db.createObjectStore("student", { keyPath: "regno" });
      if (!db.objectStoreNames.contains("results")) db.createObjectStore("results", { keyPath: "key" });
      if (!db.objectStoreNames.contains("metadata")) db.createObjectStore("metadata", { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbPut(storeName, value) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("IndexedDB write skipped:", err.message);
    return false;
  }
}

async function idbGet(storeName, key) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB read skipped:", err.message);
    return null;
  }
}

async function cacheStudent(student) {
  await idbPut("student", student);
  await idbPut("metadata", { key: `synced-${student.regno}`, value: new Date().toISOString() });
}

async function cacheResults(regno, semester, rows) {
  await idbPut("results", { key: `${regno}-semester-${semester}`, regno, semester, rows });
}

async function getCachedStudent(regno) {
  return idbGet("student", regno);
}

async function getCachedResults(regno, semester) {
  const rec = await idbGet("results", `${regno}-semester-${semester}`);
  return rec ? rec.rows : null;
}

async function getLastSynced(regno) {
  const rec = await idbGet("metadata", `synced-${regno}`);
  return rec ? rec.value : null;
}

/* ---------------------------------------------------------
   OFFLINE MODE
   --------------------------------------------------------- */
function updateStatusPill() {
  if (!dom.statusPill) return;
  dom.statusPill.classList.remove("offline", "syncing");
  let label = "Online";
  if (!STATE.isOnline) {
    dom.statusPill.classList.add("offline");
    label = "Offline";
  }
  const dot = STATE.isOnline ? "\u25CF" : "\u25CF";
  dom.statusPill.innerHTML = `<span class="status-dot"></span>${label}`;
}

function initOfflineHandlers() {
  window.addEventListener("online", () => {
    STATE.isOnline = true;
    updateStatusPill();
    showToast("Back online. Syncing your data...", "success");
    if (isLoggedIn()) refreshEverything(true);
  });
  window.addEventListener("offline", () => {
    STATE.isOnline = false;
    updateStatusPill();
    showToast("You're offline. Showing your last synchronized data.", "info");
  });
  updateStatusPill();
}

/* ---------------------------------------------------------
   STUDENT DATA
   --------------------------------------------------------- */
async function fetchStudent(regno) {
  if (!STATE.isOnline) {
    const cached = await getCachedStudent(regno);
    if (cached) {
      STATE.offlineViewing = true;
      return cached;
    }
    throw new AppError("You're offline and this student's data has not been synchronized on this device.");
  }

  if (!initSupabase()) throw new AppError("The portal isn't configured correctly. Please try again later.");

  const { data, error } = await supabaseClient
    .from(CONFIG.studentsTable)
    .select("*")
    .eq("regno", regno)
    .maybeSingle();

  if (error) throw new AppError("Access to student records is currently unavailable.", error);
  if (!data) {
    const cached = await getCachedStudent(regno);
    if (cached) return cached;
    throw new AppError("We couldn't find that student record.");
  }

  await cacheStudent(data);
  return data;
}

/* ---------------------------------------------------------
   RESULT DATA
   --------------------------------------------------------- */
async function fetchAvailableSemesters(regno) {
  if (STATE.isOnline && initSupabase()) {
    const { data, error } = await supabaseClient
      .from(CONFIG.resultsTable)
      .select("semester")
      .eq("regno", regno);
    if (!error && data) {
      const sems = [...new Set(data.map((r) => Number(r.semester)))].sort((a, b) => a - b);
      if (sems.length) return sems;
    }
  }
  // fall back to whatever semesters are cached locally
  const found = [];
  for (let s = 1; s <= 8; s++) {
    const cached = await getCachedResults(regno, s);
    if (cached && cached.length) found.push(s);
  }
  return found;
}

async function fetchResults(regno, semester) {
  if (!STATE.isOnline) {
    const cached = await getCachedResults(regno, semester);
    if (cached) {
      STATE.offlineViewing = true;
      return cached;
    }
    throw new AppError(`You're offline. Semester ${semester} has not been synchronized on this device.`);
  }

  if (!initSupabase()) throw new AppError("The portal isn't configured correctly. Please try again later.");

  const { data, error } = await supabaseClient
    .from(CONFIG.resultsTable)
    .select("*")
    .eq("regno", regno)
    .eq("semester", Number(semester))
    .order("subject_code", { ascending: true });

  if (error) throw new AppError("We couldn't retrieve your academic records. Please try again.", error);

  if (!data || data.length === 0) {
    const cached = await getCachedResults(regno, semester);
    if (cached && cached.length) return cached;
    return [];
  }

  await cacheResults(regno, semester, data);
  return data;
}

async function fetchAllResultsForCgpa(regno) {
  if (STATE.isOnline && initSupabase()) {
    const { data, error } = await supabaseClient
      .from(CONFIG.resultsTable)
      .select("grade_point,credits")
      .eq("regno", regno);
    if (!error && data) return data;
  }
  // offline fallback: combine every cached semester
  let combined = [];
  for (let s = 1; s <= 8; s++) {
    const cached = await getCachedResults(regno, s);
    if (cached) combined = combined.concat(cached);
  }
  return combined;
}

/* ---------------------------------------------------------
   SGPA / CGPA
   --------------------------------------------------------- */
function calcSgpa(rows) {
  if (!rows || rows.length === 0) return "0.00";
  const hasCredits = rows.some((r) => Number(r.credits) > 0);
  if (hasCredits) {
    const totalCredits = rows.reduce((sum, r) => sum + Number(r.credits || 0), 0);
    const weighted = rows.reduce((sum, r) => sum + Number(r.grade_point || 0) * Number(r.credits || 0), 0);
    return totalCredits > 0 ? (weighted / totalCredits).toFixed(2) : "0.00";
  }
  const total = rows.reduce((sum, r) => sum + Number(r.grade_point || 0), 0);
  return (total / rows.length).toFixed(2);
}

function calcCgpa(rows) {
  return calcSgpa(rows); // same formula, applied across every synchronized subject
}

/* ---------------------------------------------------------
   DASHBOARD
   --------------------------------------------------------- */
function renderDashboard() {
  const s = STATE.student;
  if (!s) return;

  dom.dashName.textContent = `Welcome, ${s.name || "Student"}`;
  dom.dashSub.textContent = `${s.department || "—"} · Batch ${s.batch || "—"}`;

  if (s.photo) {
    dom.avatarImg.src = s.photo;
  } else {
    dom.avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || "Student")}&background=9A5B12&color=fff8ec&size=200`;
  }
  dom.avatarImg.onerror = () => {
    dom.avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || "Student")}&background=9A5B12&color=fff8ec&size=200`;
  };

  dom.profileMeta.innerHTML = `
    <span>Reg. No <strong class="mono">${escapeHtml(s.regno)}</strong></span>
    <span>Year <strong>${escapeHtml(s.year || "—")}</strong></span>
    <span>Gender <strong>${escapeHtml(s.gender || "—")}</strong></span>
  `;

  dom.infoGrid.innerHTML = [
    ["Email", s.email], ["Phone", s.phone], ["Blood Group", s.blood_group],
    ["Date of Birth", s.dob ? formatDate(s.dob) : "—"], ["Address", s.address],
    ["Father's Name", s.father_name], ["Mother's Name", s.mother_name], ["Guardian", s.guardian]
  ].map(([label, value]) => `
    <div class="info-item">
      <div class="info-title">${label}</div>
      <div class="info-value">${escapeHtml(value || "—")}</div>
    </div>
  `).join("");

  refreshAcademicStats();
}

async function refreshAcademicStats() {
  const s = STATE.student;
  const latestSemester = STATE.allSemesters.length ? Math.max(...STATE.allSemesters) : "—";
  dom.statSemester.textContent = latestSemester === "—" ? "—" : `Semester ${latestSemester}`;
  dom.statAttendance.textContent = s.attendance || "—";

  const cgpaRows = await fetchAllResultsForCgpa(s.regno);
  const cgpa = calcCgpa(cgpaRows);
  dom.statCgpa.textContent = cgpa;

  const failCount = cgpaRows.filter((r) => (r.result || "").toUpperCase() === "FAIL").length;
  dom.statStatus.textContent = failCount > 0 ? "FAIL" : "PASS";
  dom.statStatus.className = `badge ${failCount > 0 ? "badge-fail" : "badge-pass"}`;
}

/* ---------------------------------------------------------
   RESULT TABLE
   --------------------------------------------------------- */
function renderSemesterTabs() {
  if (!dom.semesterTabs) return;
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
  dom.semesterTabs.innerHTML = semesters.map((s) => {
    const available = STATE.allSemesters.includes(s);
    const active = s === STATE.activeSemester;
    return `<button type="button" data-semester="${s}" class="${active ? "active" : ""}" ${available ? "" : "disabled title='No result yet'"}>Sem ${s}</button>`;
  }).join("");

  dom.semesterTabs.querySelectorAll("button:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => loadSemester(Number(btn.dataset.semester)));
  });
}

async function loadSemester(semester) {
  STATE.activeSemester = semester;
  renderSemesterTabs();
  toggleLedgerLoading(true);

  try {
    const rows = await fetchResults(STATE.session.regno, semester);
    STATE.results = rows;
    renderLedger(rows, semester);
  } catch (err) {
    handleAppError(err);
    renderLedger([], semester);
  } finally {
    toggleLedgerLoading(false);
  }
}

function toggleLedgerLoading(isLoading) {
  dom.ledgerLoading.classList.toggle("hidden", !isLoading);
  dom.ledgerBody.classList.toggle("hidden", isLoading);
}

function renderLedger(rows, semester) {
  dom.ledgerEmpty.classList.toggle("hidden", rows.length > 0);
  dom.ledgerBody.classList.toggle("hidden", rows.length === 0);

  if (rows.length === 0) {
    dom.ledgerEmpty.querySelector("p").textContent = STATE.offlineViewing
      ? `You're offline. Semester ${semester} hasn't been synchronized on this device yet.`
      : `No result is available for Semester ${semester}.`;
  }

  dom.ledgerBody.innerHTML = rows.map((r, i) => `
    <div class="ledger-row reveal" role="button" tabindex="0" data-index="${i}" aria-label="View details for ${escapeHtml(r.subject_name)}">
      <div class="subject-code">${escapeHtml(r.subject_code)}</div>
      <div>
        <div class="subject-name">${escapeHtml(r.subject_name)}</div>
        <div class="marks-line">
          <span class="cell-internal">${r.internal ?? 0}</span>
          <span class="cell-external">${r.external ?? 0}</span>
        </div>
      </div>
      <div class="cell-internal">${r.internal ?? 0}</div>
      <div class="cell-external">${r.external ?? 0}</div>
      <div class="cell-total mono">${r.total ?? (Number(r.internal || 0) + Number(r.external || 0))}</div>
      <div class="grade-tag">${escapeHtml(r.grade || "—")}</div>
      <div><span class="badge ${((r.result || "PASS").toUpperCase() === "PASS") ? "badge-pass" : "badge-fail"}">${(r.result || "PASS").toUpperCase()}</span></div>
    </div>
  `).join("");

  dom.ledgerBody.querySelectorAll(".ledger-row").forEach((row) => {
    row.addEventListener("click", () => openSubjectModal(rows[Number(row.dataset.index)]));
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSubjectModal(rows[Number(row.dataset.index)]); }
    });
  });

  requestAnimationFrame(() => {
    dom.ledgerBody.querySelectorAll(".reveal").forEach((el, i) => {
      setTimeout(() => el.classList.add("in"), i * 30);
    });
  });

  updateResultSummary(rows, semester);
}

async function updateResultSummary(rows, semester) {
  dom.summarySubjects.textContent = rows.length;
  const total = rows.reduce((sum, r) => sum + Number(r.total ?? (Number(r.internal || 0) + Number(r.external || 0))), 0);
  dom.summaryTotal.textContent = total;
  const sgpa = calcSgpa(rows);
  dom.summarySgpa.textContent = sgpa;

  const failCount = rows.filter((r) => (r.result || "").toUpperCase() === "FAIL").length;
  dom.resultStatusBadge.textContent = rows.length === 0 ? "—" : (failCount > 0 ? "FAIL" : "PASS");
  dom.resultStatusBadge.className = `badge ${failCount > 0 ? "badge-fail" : "badge-pass"}`;

  const cgpaRows = await fetchAllResultsForCgpa(STATE.session.regno);
  dom.summaryCgpa.textContent = calcCgpa(cgpaRows);

  const synced = await getLastSynced(STATE.session.regno);
  if (synced) {
    dom.lastSyncedNote.textContent = `Last synced: ${new Date(synced).toLocaleString()}`;
  }
}

/* ---------------------------------------------------------
   MODAL
   --------------------------------------------------------- */
function openSubjectModal(subject) {
  if (!subject) return;
  dom.modalBody.innerHTML = `
    <div class="info-grid">
      <div class="info-item"><div class="info-title">Subject Code</div><div class="info-value mono">${escapeHtml(subject.subject_code)}</div></div>
      <div class="info-item"><div class="info-title">Subject Name</div><div class="info-value">${escapeHtml(subject.subject_name)}</div></div>
      <div class="info-item"><div class="info-title">Internal</div><div class="info-value">${subject.internal ?? 0}</div></div>
      <div class="info-item"><div class="info-title">External</div><div class="info-value">${subject.external ?? 0}</div></div>
      <div class="info-item"><div class="info-title">Total</div><div class="info-value">${subject.total ?? (Number(subject.internal || 0) + Number(subject.external || 0))}</div></div>
      <div class="info-item"><div class="info-title">Grade</div><div class="info-value">${escapeHtml(subject.grade || "—")}</div></div>
      <div class="info-item"><div class="info-title">Grade Point</div><div class="info-value">${subject.grade_point ?? "—"}</div></div>
      <div class="info-item"><div class="info-title">Result</div><div class="info-value">${escapeHtml((subject.result || "PASS").toUpperCase())}</div></div>
    </div>
  `;
  dom.modalOverlay.classList.add("active");
  dom.modalClose.focus();
}

function closeModal() {
  dom.modalOverlay.classList.remove("active");
}

function initModal() {
  dom.modalClose?.addEventListener("click", closeModal);
  dom.modalOverlay?.addEventListener("click", (e) => {
    if (e.target === dom.modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dom.modalOverlay.classList.contains("active")) closeModal();
  });
}

/* ---------------------------------------------------------
   PDF
   --------------------------------------------------------- */
let pdfLibsLoaded = false;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensurePdfLibs() {
  if (pdfLibsLoaded) return true;
  try {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    pdfLibsLoaded = true;
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

async function downloadResultPdf() {
  if (!STATE.results.length) {
    showToast("There's nothing to export for this semester yet.", "error");
    return;
  }

  dom.downloadPdfBtn.disabled = true;
  const originalLabel = dom.downloadPdfBtn.textContent;
  dom.downloadPdfBtn.textContent = "Generating PDF...";

  try {
    const ok = await ensurePdfLibs();
    if (!ok || !window.jspdf) throw new Error("PDF libraries unavailable");

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 16;
    const s = STATE.student;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("Student Portal — Semester Result", pageWidth / 2, 18, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Generated ${new Date().toLocaleString()}`, pageWidth / 2, 24, { align: "center" });
    pdf.line(margin, 28, pageWidth - margin, 28);

    let y = 36;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    [
      `Student: ${s.name}`,
      `Register No: ${s.regno}`,
      `Department: ${s.department || "—"}`,
      `Batch: ${s.batch || "—"}`,
      `Semester: ${STATE.activeSemester}`
    ].forEach((line) => { pdf.text(line, margin, y); y += 6; });

    y += 4;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    const cols = ["Code", "Subject", "Int", "Ext", "Total", "Grade", "Result"];
    const colX = [margin, margin + 22, margin + 92, margin + 110, margin + 128, margin + 150, margin + 168];
    cols.forEach((c, i) => pdf.text(c, colX[i], y));
    y += 4;
    pdf.line(margin, y, pageWidth - margin, y);
    y += 5;

    pdf.setFont("helvetica", "normal");
    STATE.results.forEach((r) => {
      if (y > 270) { pdf.addPage(); y = 20; }
      const total = r.total ?? (Number(r.internal || 0) + Number(r.external || 0));
      const row = [r.subject_code, r.subject_name, String(r.internal ?? 0), String(r.external ?? 0), String(total), r.grade || "-", (r.result || "PASS")];
      row.forEach((val, i) => {
        const text = i === 1 && val.length > 34 ? val.slice(0, 34) + "…" : String(val);
        pdf.text(text, colX[i], y);
      });
      y += 6;
    });

    y += 8;
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;
    pdf.setFont("helvetica", "bold");
    pdf.text(`SGPA: ${dom.summarySgpa.textContent}`, margin, y);
    pdf.text(`Overall CGPA: ${dom.summaryCgpa.textContent}`, margin + 60, y);
    pdf.text(`Status: ${dom.resultStatusBadge.textContent}`, margin + 130, y);

    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      pdf.text(`Page ${i} of ${pageCount} · Generated by Student Portal`, pageWidth / 2, 290, { align: "center" });
    }

    pdf.save(`Semester_${STATE.activeSemester}_Result_${s.regno}.pdf`);
    showToast("PDF downloaded.", "success");
  } catch (err) {
    console.error(err);
    showToast("Unable to generate PDF. Please try again.", "error");
  } finally {
    dom.downloadPdfBtn.disabled = false;
    dom.downloadPdfBtn.textContent = originalLabel;
  }
}

/* ---------------------------------------------------------
   AUTHENTICATION
   --------------------------------------------------------- */
async function handleLogin(e) {
  e.preventDefault();
  const regno = String(dom.loginRegno.value || "").trim();
  const dob = dom.loginDob.value;

  clearLoginMessage();

  if (!regno || !dob) {
    setLoginMessage("Please enter your registration number and date of birth.", "error");
    return;
  }

  setLoginLoading(true);

  try {
    if (!STATE.isOnline) {
      // offline login: only allow a device that has previously synced this student
      const cached = await getCachedStudent(regno);
      if (!cached || cached.dob !== dob) {
        throw new AppError("You're offline and this student hasn't been synchronized on this device yet.");
      }
      saveSession(regno);
      STATE.student = cached;
      STATE.offlineViewing = true;
      await afterLoginSuccess();
      return;
    }

    if (!initSupabase()) throw new AppError("The portal isn't configured correctly. Please try again later.");

    const { data, error } = await supabaseClient
      .from(CONFIG.studentsTable)
      .select("*")
      .eq("regno", regno)
      .eq("dob", dob)
      .maybeSingle();

    if (error) throw new AppError("Unable to connect to the server. Please check your internet connection.", error);
    if (!data) throw new AppError("Registration number or date of birth is incorrect.");

    saveSession(regno);
    STATE.student = data;
    await cacheStudent(data);
    await afterLoginSuccess();
  } catch (err) {
    setLoginMessage(err.userMessage || "Something went wrong. Please try again.", "error");
    if (!(err instanceof AppError)) console.error(err);
  } finally {
    setLoginLoading(false);
  }
}

async function afterLoginSuccess() {
  setLoginMessage("Login successful. Redirecting…", "success");
  showToast(`Welcome, ${STATE.student.name || "Student"}.`, "success");
  await loadAcademicData();
  dom.loginForm.reset();
  showView("dashboard");
}

function setLoginLoading(isLoading) {
  dom.loginBtn.disabled = isLoading;
  dom.loginBtn.innerHTML = isLoading
    ? `<span class="spinner" aria-hidden="true"></span> Checking…`
    : "Log in";
}

function setLoginMessage(text, type) {
  dom.loginMessage.textContent = text;
  dom.loginMessage.className = type || "";
}

function clearLoginMessage() {
  dom.loginMessage.textContent = "";
  dom.loginMessage.className = "";
}

/* ---------------------------------------------------------
   DATA ORCHESTRATION
   --------------------------------------------------------- */
async function loadAcademicData() {
  const regno = STATE.session.regno;
  try {
    STATE.student = STATE.student || await fetchStudent(regno);
    renderDashboard();

    STATE.allSemesters = await fetchAvailableSemesters(regno);
    const defaultSemester = STATE.allSemesters.length ? Math.max(...STATE.allSemesters) : 1;
    await loadSemester(defaultSemester);
  } catch (err) {
    handleAppError(err);
  }
}

async function refreshEverything(silent = false) {
  if (!isLoggedIn()) return;
  try {
    STATE.student = await fetchStudent(STATE.session.regno);
    renderDashboard();
    STATE.allSemesters = await fetchAvailableSemesters(STATE.session.regno);
    await loadSemester(STATE.activeSemester || Math.max(...STATE.allSemesters, 1));
    if (!silent) showToast("Results refreshed.", "success");
  } catch (err) {
    handleAppError(err);
  }
}

/* ---------------------------------------------------------
   ERROR HANDLING
   --------------------------------------------------------- */
class AppError extends Error {
  constructor(userMessage, cause) {
    super(userMessage);
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

function handleAppError(err) {
  const message = err instanceof AppError ? err.userMessage : "Something went wrong. Please try again.";
  showToast(message, "error");
  if (!(err instanceof AppError)) console.error(err);
  else if (err.cause) console.error(err.cause);
}

function initGlobalErrorHandlers() {
  window.addEventListener("error", (e) => {
    console.error("Global error:", e.error || e.message);
  });
  window.addEventListener("unhandledrejection", (e) => {
    console.error("Unhandled rejection:", e.reason);
  });
}

/* ---------------------------------------------------------
   HELPERS
   --------------------------------------------------------- */
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(isoDate) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

/* ---------------------------------------------------------
   EVENT LISTENERS
   --------------------------------------------------------- */
function initEventListeners() {
  dom.loginForm?.addEventListener("submit", handleLogin);
  dom.logoutBtns.forEach((btn) => btn.addEventListener("click", logout));
  dom.downloadPdfBtn?.addEventListener("click", downloadResultPdf);
  dom.refreshBtn?.addEventListener("click", () => refreshEverything(false));
}

/* ---------------------------------------------------------
   INITIALIZATION
   --------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  cacheDom();
  initGlobalErrorHandlers();
  initTheme();
  initNav();
  initModal();
  initEventListeners();
  initOfflineHandlers();
  initSupabase();

  if (isLoggedIn()) {
    STATE.session = getSession();
    showView("dashboard");
    await loadAcademicData();
  } else {
    showView("login");
  }
});
