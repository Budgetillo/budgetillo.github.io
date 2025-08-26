// ===== Util: chei lunare =====
function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function prevMonthKey() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabelRO(d = new Date()) {
  return d.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
          .replace(/^\w/, c => c.toUpperCase());
}

// ===== Selectori =====
const form = document.getElementById('expense-form');
const categorySelect = document.getElementById('category');
const amountInput = document.getElementById('amount');
const detailsInput = document.getElementById('details');

const list = document.getElementById('expense-list');
const totalDisplay = document.getElementById('total');
const balanceDisplay = document.getElementById('balance');
const currentMonthEl = document.getElementById('current-month');

const startingBalanceInput = document.getElementById('starting-balance');
const setBalanceBtn = document.getElementById('set-balance');
const clearAllBtn = document.getElementById('clear-all');
const incomeInput = document.getElementById('income-amount');
const addIncomeBtn = document.getElementById('add-income');

// ===== Chei LocalStorage =====
const LS = {
  EXPENSES: (m) => `expenses_${m}`,
  STARTING: (m) => `startingBalance_${m}`,          // sold curent (crește cu venituri)
  STARTING_INITIAL: (m) => `startingInitial_${m}`,   // reper: sold la începutul lunii
  ROLLOVER_FLAG: (m) => `rollover_done_${m}`,        // ca să nu întrebăm de 2 ori în aceeași lună
  APP_INIT: 'appInitialized'                         // marcat prima vizită
};

// ===== Helpers =====
function readJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function toNumber(n, fb = 0) {
  if (typeof n === 'string') n = n.replace(',', '.').trim();
  const v = parseFloat(n);
  return Number.isFinite(v) ? v : fb;
}
function money(n) { return `${toNumber(n, 0).toFixed(2)} lei`; }

// ===== Stare pe luna curentă =====
const MONTH = currentMonthKey();
const PREV = prevMonthKey();

let expenses = readJSON(LS.EXPENSES(MONTH), []);
// Default = 0 la prima vizită
let startingBalance = toNumber(localStorage.getItem(LS.STARTING(MONTH)), 0);

// reperul (soldul inițial al lunii)
let startingInitial = localStorage.getItem(LS.STARTING_INITIAL(MONTH));
startingInitial = startingInitial === null ? startingBalance : toNumber(startingInitial, startingBalance);
localStorage.setItem(LS.STARTING_INITIAL(MONTH), startingInitial);

// ===== Totaluri =====
function computeTotals(expArr = expenses, startBal = startingBalance) {
  const total = expArr.reduce((s, e) => s + toNumber(e.amount, 0), 0);
  const balance = startBal - total;
  return { total, balance };
}

// ===== Rollover (doar după prima vizită) =====
function maybeRolloverFromPreviousMonth() {
  const isFirstVisit = !localStorage.getItem(LS.APP_INIT);
  if (isFirstVisit) return;

  const hasStartingCurrent = localStorage.getItem(LS.STARTING(MONTH)) !== null;
  const askedThisMonth = localStorage.getItem(LS.ROLLOVER_FLAG(MONTH)) === '1';
  if (hasStartingCurrent || askedThisMonth) return;

  const prevExpenses = readJSON(LS.EXPENSES(PREV), []);
  const prevStart = toNumber(localStorage.getItem(LS.STARTING(PREV)), NaN);
  if (!prevExpenses.length && !Number.isFinite(prevStart)) return;

  const prevStartVal = Number.isFinite(prevStart) ? prevStart : 0;
  const prevTotals = prevExpenses.reduce((s, e) => s + toNumber(e.amount, 0), 0);
  const prevBalance = prevStartVal - prevTotals;

  const ok = confirm(`Vrei să preiei soldul rămas din luna trecută (${money(prevBalance)}) ca sold inițial pentru luna curentă?`);
  if (ok) {
    startingBalance = prevBalance < 0 ? 0 : prevBalance;
    startingInitial = startingBalance;
    localStorage.setItem(LS.STARTING(MONTH), startingBalance);
    localStorage.setItem(LS.STARTING_INITIAL(MONTH), startingInitial);
  }
  localStorage.setItem(LS.ROLLOVER_FLAG(MONTH), '1');
}

// ===== Placeholder-uri pentru "Detalii" în funcție de categorie =====
const DETAILS_HINT = {
  "Supermarket": "Ex: cumpărături Carrefour, Lidl",
  "Locuință": "Ex: chirie, reparații, mobilă",
  "Facturi/Utilități": "Ex: curent, apă, internet",
  "Transport": "Ex: benzină, motorină, bilete",
  "Sănătate": "Ex: consult medical, pastile",
  "Îmbrăcăminte": "Ex: pantofi, geacă",
  "Divertisment": "Ex: cinema, jocuri, ieșiri",
  "Educație": "Ex: curs, carte",
  "Rate": "Ex: credit bancar, leasing",
  "Taxe/Impozite": "Ex: rovinietă, impozit",
  "Altele": "Ex: cadou, diverse"
};
categorySelect?.addEventListener('change', () => {
  const ph = DETAILS_HINT[categorySelect.value] || "Detalii (opțional)";
  if (detailsInput) detailsInput.placeholder = ph;
});

// ===== Render =====
function renderExpenses() {
  list.innerHTML = '';
  if (!expenses.length) {
    const li = document.createElement('li');
    li.className = 'expense-item empty';
    li.textContent = 'Nicio cheltuială încă.';
    list.appendChild(li);
    return;
  }
  expenses.forEach(exp => addExpenseToList(exp));
}

function addExpenseToList(exp) {
  const emptyLi = list.querySelector('.empty');
  if (emptyLi) emptyLi.remove();

  const li = document.createElement('li');
  li.className = 'expense-item';
  li.dataset.id = exp.id;

  const left = document.createElement('span');
  const dateStr = new Date(exp.date).toLocaleDateString('ro-RO');
  const detailPart = exp.details ? ` • ${exp.details}` : '';
  left.textContent = `${exp.category}${detailPart} • ${money(exp.amount)} • ${dateStr}`;

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'delete-btn';
  del.setAttribute('aria-label', 'Șterge cheltuiala');
  del.textContent = '✕';
  del.addEventListener('click', () => removeExpense(exp.id));

  li.appendChild(left);
  li.appendChild(del);
  list.appendChild(li);
}

function updateDisplay() {
  const { total, balance } = computeTotals();
  totalDisplay.textContent = money(total);
  balanceDisplay.textContent = money(balance);
  if (currentMonthEl) currentMonthEl.textContent = `Luna curentă: ${monthLabelRO()}`;
}

// ===== CRUD =====
function addExpense(category, amount, details) {
  const expense = {
    id: (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random()}`,
    category,
    amount: toNumber(amount, 0),
    details: (details || '').trim(),
    date: new Date().toISOString()
  };
  expenses.push(expense);
  saveJSON(LS.EXPENSES(MONTH), expenses);
  addExpenseToList(expense);
  updateDisplay();
}

function removeExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  saveJSON(LS.EXPENSES(MONTH), expenses);
  renderExpenses();
  updateDisplay();
}

function clearAll() {
  expenses = [];
  saveJSON(LS.EXPENSES(MONTH), expenses);
  renderExpenses();
  updateDisplay();
}

// ===== Evenimente =====
form?.addEventListener('submit', e => {
  e.preventDefault();
  const category = (categorySelect?.value || '').trim();
  const amount = toNumber(amountInput?.value, NaN);
  const details = detailsInput?.value || '';

  if (!category) { categorySelect?.focus(); return; }
  if (!Number.isFinite(amount) || amount <= 0) { amountInput?.focus(); return; }

  addExpense(category, amount, details);
  amountInput.value = '';
  if (detailsInput) detailsInput.value = '';
  if (categorySelect) categorySelect.selectedIndex = 0;
  detailsInput.placeholder = "Detalii (opțional)";
});

setBalanceBtn?.addEventListener('click', () => {
  const val = toNumber(startingBalanceInput?.value, NaN);
  if (!Number.isFinite(val) || val < 0) { startingBalanceInput?.focus(); return; }
  startingBalance = val;
  // când utilizatorul setează explicit soldul, actualizăm și reperul pentru luna curentă
  startingInitial = startingBalance;
  localStorage.setItem(LS.STARTING(MONTH), startingBalance);
  localStorage.setItem(LS.STARTING_INITIAL(MONTH), startingInitial);
  updateDisplay();
});

clearAllBtn?.addEventListener('click', () => {
  if (confirm('Ești sigur(ă) că vrei să ștergi toate cheltuielile din luna curentă?')) clearAll();
});

// Venituri: cresc soldul curent, dar NU modifică reperul (pentru statistici corecte)
addIncomeBtn?.addEventListener('click', () => {
  const val = toNumber(incomeInput?.value, NaN);
  if (!Number.isFinite(val) || val <= 0) return alert("Introdu o sumă validă.");
  startingBalance += val;
  localStorage.setItem(LS.STARTING(MONTH), startingBalance);
  updateDisplay();
  incomeInput.value = '';
});

// ===== Init =====
(function init() {
  const firstVisit = !localStorage.getItem(LS.APP_INIT);
  if (firstVisit) {
    startingBalance = 0;
    startingInitial = 0;
    localStorage.setItem(LS.STARTING(MONTH), startingBalance);
    localStorage.setItem(LS.STARTING_INITIAL(MONTH), startingInitial);
    localStorage.setItem(LS.APP_INIT, '1');
  } else {
    maybeRolloverFromPreviousMonth();
  }

  // re-sync din storage
  const sb = localStorage.getItem(LS.STARTING(MONTH));
  if (sb !== null) startingBalance = toNumber(sb, startingBalance);
  const si = localStorage.getItem(LS.STARTING_INITIAL(MONTH));
  if (si !== null) startingInitial = toNumber(si, startingInitial);

  if (startingBalanceInput) startingBalanceInput.value = startingBalance;
  renderExpenses();
  updateDisplay();
})();

