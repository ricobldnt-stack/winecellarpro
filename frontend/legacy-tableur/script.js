const STORAGE_KEY = "simple-spreadsheet-data-v1";
const PENDING_SYNC_KEY = "simple-spreadsheet-pending-sync-v1";
const LOCAL_EDITED_AT_KEY = "simple-spreadsheet-local-edited-at-v1";
const CLOUD_UPDATED_AT_KEY = "simple-spreadsheet-cloud-updated-at-v1";
const DEFAULT_ROWS = 20;
const DEFAULT_COLS = 8;
const CLOUD_SYNC_CONFIG = {
  url: "",
  anonKey: "",
  table: "wine_cellar_tables",
  recordId: "default",
};

const table = document.getElementById("spreadsheet");
const addRowBtn = document.getElementById("add-row-btn");
const removeRowBtn = document.getElementById("remove-row-btn");
const addColBtn = document.getElementById("add-col-btn");
const removeColBtn = document.getElementById("remove-col-btn");
const saveBtn = document.getElementById("save-btn");
const exportBtn = document.getElementById("export-btn");
const importInput = document.getElementById("import-input");
const networkStatusEl = document.getElementById("network-status");
const syncStatusEl = document.getElementById("sync-status");
const DEFAULT_XLSX_FILE = "Classeur1_test.xlsx";
const COLUMN_LABELS = [
  "Emplacement",
  "Pays/Région",
  "Appellation",
  "Quantité",
  "Format",
  "Couleur",
  "Nom du vin",
  "Millésime",
  "Année d'achat",
  "Prix d'achat unitaire",
  "Cote",
  "Montant actuel total",
  "Variation",
  "Apogée",
  "Commentaire",
  "Accord Mets/vins",
  "Remarque",
];
const FRENCH_WINE_REGIONS = [
  "Alsace",
  "Auvergne",
  "Beaujolais",
  "Bordeaux",
  "Bourgogne",
  "Champagne",
  "Corse",
  "Jura",
  "Languedoc",
  "Provence",
  "Roussillon",
  "Savoie",
  "Sud-Ouest",
  "Val de Loire",
  "Vallée du Rhône",
];
const FOREIGN_WINE_COUNTRIES = [
  "Afrique du Sud",
  "Allemagne",
  "Argentine",
  "Australie",
  "Autriche",
  "Chili",
  "Espagne",
  "Etats-Unis",
  "Georgie",
  "Grece",
  "Hongrie",
  "Italie",
  "Nouvelle-Zelande",
  "Portugal",
  "Suisse",
];
const REGION_SEPARATOR = "__SEPARATOR__";
const REGION_OPTIONS = [
  ...sortAlphabetically(FRENCH_WINE_REGIONS),
  REGION_SEPARATOR,
  ...sortAlphabetically(FOREIGN_WINE_COUNTRIES),
  REGION_SEPARATOR,
  "Autre",
];
const APPELLATIONS_BY_REGION = {
  Alsace: ["Alsace AOC", "Riesling d'Alsace", "Gewurztraminer d'Alsace", "Cremant d'Alsace", "Autre"],
  Beaujolais: ["Beaujolais", "Beaujolais-Villages", "Brouilly", "Fleurie", "Morgon", "Autre"],
  Bordeaux: ["Medoc", "Saint-Estephe", "Pauillac", "Margaux", "Saint-Emilion", "Pomerol", "Sauternes", "Autre"],
  Bourgogne: ["Bourgogne", "Chablis", "Cote de Nuits-Villages", "Gevrey-Chambertin", "Meursault", "Pouilly-Fuisse", "Autre"],
  Champagne: ["Champagne Brut", "Champagne Blanc de Blancs", "Champagne Rose", "Autre"],
  Corse: ["Patrimonio", "Ajaccio", "Vin de Corse", "Autre"],
  Jura: ["Arbois", "Cotes du Jura", "Chateau-Chalon", "Macvin du Jura", "Autre"],
  Languedoc: ["Languedoc", "Pic Saint-Loup", "Faugeres", "Minervois", "Autre"],
  Provence: ["Cotes de Provence", "Bandol", "Cassis", "Palette", "Autre"],
  Roussillon: ["Cotes du Roussillon", "Collioure", "Banyuls", "Maury", "Autre"],
  Savoie: ["Apremont", "Roussette de Savoie", "Chignin", "Autre"],
  "Sud-Ouest": ["Cahors", "Madiran", "Gaillac", "Jurancon", "Monbazillac", "Autre"],
  "Val de Loire": ["Sancerre", "Pouilly-Fume", "Vouvray", "Muscadet", "Chinon", "Autre"],
  "Vallée du Rhône": [
    "Cotes du Rhone",
    "Cotes du Rhone Villages",
    "Cairanne",
    "Rasteau",
    "Gigondas",
    "Vacqueyras",
    "Beaumes-de-Venise",
    "Chateauneuf-du-Pape",
    "Lirac",
    "Tavel",
    "Vinsobres",
    "Ventoux",
    "Costieres de Nimes",
    "Coteaux du Tricastin / Grignan-les-Adhemar",
    "Crozes-Hermitage",
    "Hermitage",
    "Saint-Joseph",
    "Cornas",
    "Cote-Rotie",
    "Condrieu",
    "Chateau-Grillet",
    "Saint-Peray",
    "Clairette de Die",
    "Muscat de Beaumes-de-Venise",
    "Rasteau Vin Doux Naturel",
    "Autre",
  ],
  Auvergne: ["Cotes d'Auvergne", "Saint-Pourcain", "Autre"],
  Italie: ["Chianti", "Barolo", "Barbaresco", "Amarone", "Prosecco", "Autre"],
  Espagne: ["Rioja", "Ribera del Duero", "Priorat", "Cava", "Autre"],
  Portugal: ["Douro", "Dao", "Vinho Verde", "Porto", "Autre"],
  Allemagne: ["Mosel", "Rheingau", "Pfalz", "Autre"],
  "Etats-Unis": ["Napa Valley", "Sonoma", "Willamette Valley", "Autre"],
  Argentine: ["Mendoza", "Salta", "Patagonia", "Autre"],
  Chili: ["Maipo Valley", "Colchagua Valley", "Casablanca Valley", "Autre"],
  Australie: ["Barossa Valley", "Yarra Valley", "Margaret River", "Autre"],
  "Afrique du Sud": ["Stellenbosch", "Paarl", "Swartland", "Autre"],
  Autre: ["Autre"],
};
const FORMAT_OPTIONS = ["37.5 cl", "75 cl", "1.5 L", "3 L", "6 L", "Autre"];
const COULEUR_OPTIONS = ["Rouge", "Blanc", "Rose", "Effervescent", "Orange", "Doux", "Autre"];
const CURRENT_YEAR = new Date().getFullYear();
const MILLÉSIME_OPTIONS = generateDescendingYearOptions(CURRENT_YEAR, 1945);
const ANNEE_ACHAT_OPTIONS = [
  ...generateDescendingYearOptions(CURRENT_YEAR, 2000),
  "Avant 2000",
];
const COTE_OPTIONS = ["A boire", "A surveiller", "A garder", "Collection", "Autre"];
const APOGEE_OPTIONS = ["Pret a boire", "1-2 ans", "3-5 ans", "5-10 ans", "10+ ans", "Inconnu"];
const EMPLACEMENT_OPTIONS = ["Cave A - Haut", "Cave A - Milieu", "Cave A - Bas", "Casiers", "Frigo", "Autre"];
const COMMENTAIRE_OPTIONS = ["A boire en priorite", "Garde longue", "Pour invitation", "A racheter", "Deguste", "RAS"];

let data = createEmptyData(DEFAULT_ROWS, DEFAULT_COLS);
let selectedCell = { row: null, col: null };
let supabaseClient = null;

registerOfflineMode();
initCloudSync();
initNetworkStatus();
renderTable();
initDataSource();

addRowBtn.addEventListener("click", () => {
  addRow();
  renderTable();
  saveData();
});

removeRowBtn.addEventListener("click", () => {
  removeRow();
  renderTable();
  saveData();
});

addColBtn.addEventListener("click", () => {
  addColumn();
  renderTable();
  saveData();
});

removeColBtn.addEventListener("click", () => {
  removeColumn();
  renderTable();
  saveData();
});

saveBtn.addEventListener("click", () => {
  saveData();
  alert("Donnees sauvegardees.");
});

exportBtn.addEventListener("click", () => {
  const csv = toCsv(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "tableur.csv";
  link.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  importFromFile(file);
  importInput.value = "";
});

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return null;
    return parsed.map((row) =>
      Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : []
    );
  } catch {
    return null;
  }
}

function initCloudSync() {
  const hasConfig = Boolean(CLOUD_SYNC_CONFIG.url && CLOUD_SYNC_CONFIG.anonKey);
  const hasLibrary = typeof window.supabase !== "undefined";
  if (!hasConfig || !hasLibrary) return;
  supabaseClient = window.supabase.createClient(
    CLOUD_SYNC_CONFIG.url,
    CLOUD_SYNC_CONFIG.anonKey
  );
}

function isCloudSyncEnabled() {
  return Boolean(supabaseClient);
}

function createEmptyData(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(""));
}

function normalizeData() {
  const maxCols = Math.max(1, ...data.map((r) => r.length || 0));
  data = data.map((row) => {
    const next = [...row];
    while (next.length < maxCols) next.push("");
    return next;
  });
}

function addRow() {
  const cols = data[0]?.length || DEFAULT_COLS;
  data.push(Array(cols).fill(""));
  markPendingSync();
}

function addColumn() {
  for (const row of data) row.push("");
  markPendingSync();
}

function removeRow() {
  if (data.length <= 1) return;
  const rowToDelete = selectedCell.row ?? data.length - 1;
  data.splice(rowToDelete, 1);
  selectedCell = { row: null, col: null };
  markPendingSync();
}

function removeColumn() {
  const colCount = data[0]?.length || 0;
  if (colCount <= 1) return;
  const colToDelete = selectedCell.col ?? colCount - 1;
  for (const row of data) {
    row.splice(colToDelete, 1);
  }
  selectedCell = { row: null, col: null };
  markPendingSync();
}

function ensureSize(minRows, minCols) {
  const currentCols = data[0]?.length || 0;
  const targetCols = Math.max(currentCols, minCols, DEFAULT_COLS);

  if (targetCols > currentCols) {
    for (const row of data) {
      while (row.length < targetCols) row.push("");
    }
  }

  while (data.length < minRows) {
    data.push(Array(targetCols).fill(""));
  }
}

function renderTable() {
  normalizeData();
  table.innerHTML = "";

  const cols = data[0].length;
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const corner = document.createElement("th");
  corner.textContent = "#";
  headerRow.appendChild(corner);

  for (let col = 0; col < cols; col += 1) {
    const th = document.createElement("th");
    th.textContent = getColumnLabel(col);
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");
  data.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");

    const rowHead = document.createElement("th");
    rowHead.textContent = String(rowIndex + 1);
    tr.appendChild(rowHead);

    row.forEach((value, colIndex) => {
      const td = document.createElement("td");
      td.dataset.row = String(rowIndex);
      td.dataset.col = String(colIndex);
      td.addEventListener("click", () => {
        selectedCell = { row: rowIndex, col: colIndex };
        highlightSelectedCell();
      });
      const editor = createCellEditor(rowIndex, colIndex, value);
      td.appendChild(editor);
      td.addEventListener("paste", (event) => {
        handlePaste(event, rowIndex, colIndex);
      });
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  highlightSelectedCell();
}

function colName(index) {
  let name = "";
  let n = index;
  while (n >= 0) {
    name = String.fromCharCode((n % 26) + 65) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

function getColumnLabel(index) {
  return COLUMN_LABELS[index] || colName(index);
}

function getColumnIndex(label) {
  return COLUMN_LABELS.indexOf(label);
}

function getAppellationOptions(regionValue) {
  const options = APPELLATIONS_BY_REGION[regionValue] || ["Autre"];
  return sortAlphabetically(options, { keepAutreLast: true });
}

function sortAlphabetically(list, options = {}) {
  const { keepAutreLast = false } = options;
  const normalizedList = [...new Set(list.map((item) => String(item ?? "").trim()).filter(Boolean))];
  const withoutAutre = keepAutreLast
    ? normalizedList.filter((item) => item.toLowerCase() !== "autre")
    : normalizedList;

  withoutAutre.sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));

  if (keepAutreLast && normalizedList.some((item) => item.toLowerCase() === "autre")) {
    withoutAutre.push("Autre");
  }
  return withoutAutre;
}

function generateDescendingYearOptions(startYear, endYear) {
  const years = [];
  for (let year = startYear; year >= endYear; year -= 1) {
    years.push(String(year));
  }
  return years;
}

function createCellEditor(rowIndex, colIndex, value) {
  const label = getColumnLabel(colIndex);
  const stringValue = String(value ?? "");

  if (label === "Pays/Région") {
    return createSelectEditor({
      value: stringValue,
      options: REGION_OPTIONS,
      onChange: (next) => {
        data[rowIndex][colIndex] = next;
        const appellationCol = getColumnIndex("Appellation");
        if (appellationCol >= 0) {
          const valid = getAppellationOptions(next);
          if (!valid.includes(data[rowIndex][appellationCol])) {
            data[rowIndex][appellationCol] = "";
          }
        }
        renderTable();
        saveData();
        markPendingSync();
      },
    });
  }

  if (label === "Appellation") {
    const regionCol = getColumnIndex("Pays/Région");
    const regionValue = regionCol >= 0 ? data[rowIndex][regionCol] : "";
    return createSelectEditor({
      value: stringValue,
      options: getAppellationOptions(regionValue),
      placeholder: regionValue ? "Selectionner" : "Choisir une region",
      onChange: (next) => {
        data[rowIndex][colIndex] = next;
        saveData();
        markPendingSync();
      },
    });
  }

  if (label === "Format") return createSimpleSelect(rowIndex, colIndex, stringValue, FORMAT_OPTIONS);
  if (label === "Couleur") return createSimpleSelect(rowIndex, colIndex, stringValue, COULEUR_OPTIONS);
  if (label === "Millésime") return createSimpleSelect(rowIndex, colIndex, stringValue, MILLÉSIME_OPTIONS);
  if (label === "Année d'achat") return createSimpleSelect(rowIndex, colIndex, stringValue, ANNEE_ACHAT_OPTIONS);
  if (label === "Cote") return createSimpleSelect(rowIndex, colIndex, stringValue, COTE_OPTIONS);
  if (label === "Apogée") return createSimpleSelect(rowIndex, colIndex, stringValue, APOGEE_OPTIONS);
  if (label === "Emplacement") return createSimpleSelect(rowIndex, colIndex, stringValue, EMPLACEMENT_OPTIONS);
  if (label === "Commentaire") return createSimpleSelect(rowIndex, colIndex, stringValue, COMMENTAIRE_OPTIONS);

  if (label === "Quantité") return createInputEditor(rowIndex, colIndex, stringValue, "number", "0");
  if (label === "Prix d'achat unitaire") return createInputEditor(rowIndex, colIndex, stringValue, "number", "0");
  if (label === "Montant actuel total") return createInputEditor(rowIndex, colIndex, stringValue, "number", "0");

  return createInputEditor(rowIndex, colIndex, stringValue, "text");
}

function createSimpleSelect(rowIndex, colIndex, value, options) {
  return createSelectEditor({
    value,
    options,
    onChange: (next) => {
      data[rowIndex][colIndex] = next;
      saveData();
      markPendingSync();
    },
  });
}

function createSelectEditor({ value, options, onChange, placeholder = "Selectionner" }) {
  const select = document.createElement("select");
  select.className = "cell-editor";

  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = placeholder;
  select.appendChild(empty);

  options.forEach((item) => {
    const option = document.createElement("option");
    if (item === REGION_SEPARATOR) {
      option.value = "";
      option.textContent = "....................";
      option.disabled = true;
    } else {
      option.value = item;
      option.textContent = item;
    }
    select.appendChild(option);
  });

  select.value = options.includes(value) ? value : "";
  select.addEventListener("change", () => onChange(select.value));
  return select;
}

function createInputEditor(rowIndex, colIndex, value, type = "text", min) {
  const input = document.createElement("input");
  input.className = "cell-editor";
  input.type = type;
  if (min !== undefined) input.min = min;
  input.value = value;
  input.addEventListener("input", () => {
    data[rowIndex][colIndex] = input.value;
    saveData();
    markPendingSync();
  });
  input.addEventListener("blur", saveData);
  return input;
}

function toCsv(matrix) {
  return matrix
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.map((line) => {
    const cells = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cells.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current);
    return cells;
  });
}

function setDataFromMatrix(matrix, options = {}) {
  const { clearValues = false, markAsEdited = true } = options;
  if (!Array.isArray(matrix) || !matrix.length) return false;
  data = matrix.map((row) =>
    Array.isArray(row)
      ? row.map((cell) => (clearValues ? "" : String(cell ?? "")))
      : []
  );
  ensureSize(data.length, COLUMN_LABELS.length);
  normalizeData();
  renderTable();
  saveData();
  if (markAsEdited) markPendingSync();
  return true;
}

function importFromFile(file) {
  const isXlsx = file.name.toLowerCase().endsWith(".xlsx");
  const reader = new FileReader();

  reader.onload = () => {
    if (isXlsx) {
      const parsed = parseXlsxArrayBuffer(reader.result);
      if (!setDataFromMatrix(parsed)) {
        alert("Fichier Excel invalide.");
      }
      return;
    }

    const text = String(reader.result || "");
    const parsed = parseCsv(text);
    if (!setDataFromMatrix(parsed)) {
      alert("Fichier CSV invalide.");
    }
  };

  if (isXlsx) {
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsText(file, "utf-8");
  }
}

function parseXlsxArrayBuffer(arrayBuffer) {
  if (!arrayBuffer || typeof XLSX === "undefined") return [];
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
}

async function initFromWorkbook() {
  try {
    const response = await fetch(`./${DEFAULT_XLSX_FILE}`);
    if (!response.ok) return;
    const buffer = await response.arrayBuffer();
    const parsed = parseXlsxArrayBuffer(buffer);
    setDataFromMatrix(parsed, { clearValues: true, markAsEdited: false });
  } catch {
    // Ignore if the workbook cannot be loaded.
  }
}

async function initDataSource() {
  const stored = loadData();
  if (stored) {
    data = stored;
    ensureSize(data.length, COLUMN_LABELS.length);
    normalizeData();
    renderTable();
    if (navigator.onLine) {
      await pullFromCloudIfNewer();
      await tryResync();
    }
    updateSyncStatus();
    return;
  }
  await initFromWorkbook();
  if (navigator.onLine) {
    await pullFromCloudIfNewer();
    await tryResync();
  }
  updateSyncStatus();
}

function parseClipboardGrid(rawText) {
  const normalized = rawText.replace(/\r/g, "").trim();
  if (!normalized) return [];

  const rows = normalized.split("\n").map((line) => line.split("\t"));
  return rows.map((row) => row.map((cell) => cell.trim()));
}

function handlePaste(event, startRow, startCol) {
  const clipboardText = event.clipboardData?.getData("text/plain") || "";
  const grid = parseClipboardGrid(clipboardText);
  if (!grid.length) return;

  event.preventDefault();

  const maxColsInPaste = Math.max(...grid.map((row) => row.length));
  ensureSize(startRow + grid.length, startCol + maxColsInPaste);

  grid.forEach((row, rowOffset) => {
    row.forEach((cell, colOffset) => {
      data[startRow + rowOffset][startCol + colOffset] = cell;
    });
  });

  renderTable();
  saveData();
  markPendingSync();
}

function highlightSelectedCell() {
  const cells = table.querySelectorAll("td");
  cells.forEach((cell) => cell.classList.remove("selected-cell"));

  if (selectedCell.row === null || selectedCell.col === null) return;
  const selector = `td[data-row="${selectedCell.row}"][data-col="${selectedCell.col}"]`;
  const activeCell = table.querySelector(selector);
  if (activeCell) {
    activeCell.classList.add("selected-cell");
  }
}

function registerOfflineMode() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Silent fail: app still works online.
    });
  });
}

function initNetworkStatus() {
  if (!networkStatusEl) return;
  updateNetworkStatus();
  updateSyncStatus();
  tryResync();
  window.addEventListener("online", () => {
    updateNetworkStatus();
    tryResync();
  });
  window.addEventListener("offline", () => {
    updateNetworkStatus();
    updateSyncStatus();
  });
}

function updateNetworkStatus() {
  if (!networkStatusEl) return;
  const isOnline = navigator.onLine;
  networkStatusEl.textContent = isOnline ? "En ligne" : "Hors ligne";
  networkStatusEl.classList.toggle("online", isOnline);
  networkStatusEl.classList.toggle("offline", !isOnline);
}

function markPendingSync() {
  localStorage.setItem(PENDING_SYNC_KEY, "1");
  localStorage.setItem(LOCAL_EDITED_AT_KEY, new Date().toISOString());
  updateSyncStatus();
  if (navigator.onLine) {
    tryResync();
  }
}

function clearPendingSync() {
  localStorage.removeItem(PENDING_SYNC_KEY);
  updateSyncStatus();
}

function hasPendingSync() {
  return localStorage.getItem(PENDING_SYNC_KEY) === "1";
}

function updateSyncStatus() {
  if (!syncStatusEl) return;
  if (!isCloudSyncEnabled()) {
    syncStatusEl.textContent = "Cloud non configure";
    syncStatusEl.classList.add("pending");
    syncStatusEl.classList.remove("synced");
    return;
  }
  const pending = hasPendingSync();

  if (pending && !navigator.onLine) {
    syncStatusEl.textContent = "Modifs hors ligne en attente";
    syncStatusEl.classList.add("pending");
    syncStatusEl.classList.remove("synced");
    return;
  }

  if (pending) {
    syncStatusEl.textContent = "Synchronisation en attente";
    syncStatusEl.classList.add("pending");
    syncStatusEl.classList.remove("synced");
    return;
  }

  syncStatusEl.textContent = "Synchronise";
  syncStatusEl.classList.add("synced");
  syncStatusEl.classList.remove("pending");
}

async function tryResync() {
  if (!navigator.onLine || !hasPendingSync()) {
    updateSyncStatus();
    return;
  }
  if (!isCloudSyncEnabled()) {
    updateSyncStatus();
    return;
  }

  const payload = {
    id: CLOUD_SYNC_CONFIG.recordId,
    matrix: data,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseClient
    .from(CLOUD_SYNC_CONFIG.table)
    .upsert(payload, { onConflict: "id" });

  if (error) {
    updateSyncStatus();
    return;
  }

  localStorage.setItem(CLOUD_UPDATED_AT_KEY, payload.updated_at);
  clearPendingSync();
}

async function pullFromCloudIfNewer() {
  if (!navigator.onLine || !isCloudSyncEnabled()) return;
  if (hasPendingSync()) return;

  const { data: remote, error } = await supabaseClient
    .from(CLOUD_SYNC_CONFIG.table)
    .select("matrix, updated_at")
    .eq("id", CLOUD_SYNC_CONFIG.recordId)
    .maybeSingle();

  if (error || !remote || !Array.isArray(remote.matrix)) return;

  const lastCloudTs = localStorage.getItem(CLOUD_UPDATED_AT_KEY);
  if (
    lastCloudTs &&
    remote.updated_at &&
    new Date(remote.updated_at).getTime() <= new Date(lastCloudTs).getTime()
  ) {
    return;
  }

  setDataFromMatrix(remote.matrix, { markAsEdited: false });
  localStorage.setItem(CLOUD_UPDATED_AT_KEY, remote.updated_at || new Date().toISOString());
}
