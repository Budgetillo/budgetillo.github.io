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
// IMPORTANT: default = 0 la prima vizită
let startingBalance = toNumber(localStorage.getItem(LS.STARTING(MONTH)), 0);

// reperul (soldul inițial al lunii) — dacă nu există, îl pornim cu startingBalance (care la prima vizită = 0)
let startingInitial = localStorage.getItem(LS.STARTING_INITIAL(MONTH));
startingInitial = startingInitial === null ? startingBalance : toNumber(startingInitial, startingBalance);
localStorage.setItem(LS.STARTING_INITIAL(MONTH), startingInitial);

// ===== Totaluri =====
function computeTotals(expArr = expenses, startBal = startingBalance) {
  const total = expArr.reduce((s, e) => s + toNumber(e.amount, 0), 0);
  const balance = startBal - total;
  return { total, balance };
}

// ===== Preluare sold rămas din luna trecută (NU la prima vizită) =====
function maybeRolloverFromPreviousMonth() {
  const isFirstVisit = !localStorage.getItem(LS.APP_INIT);
  if (isFirstVisit) return; // nu întrebăm la prima vizită

  const hasStartingCurrent = localStorage.getItem(LS.STARTING(MONTH)) !== null;
  const askedThisMonth = localStorage.getItem(LS.ROLLOVER_FLAG(MONTH)) === '1';
  if (hasStartingCurrent || askedThisMonth) return;

  const prevExpenses = readJSON(LS.EXPENSES(PREV), []);
  const prevStart = toNumber(localStorage.getItem(LS.STARTING(PREV)), NaN);
  if (!prevExpenses.length && !Number.isFinite(prevStart)) return; // n-avem ce prelua

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
  left.textContent = `${exp.category} • ${money(exp.amount)} • ${dateStr}`;

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
function addExpense(category, amount) {
  const expense = {
    id: (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random()}`,
    category,
    amount: toNumber(amount, 0),
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

  if (!category) { categorySelect?.focus(); return; }
  if (!Number.isFinite(amount) || amount <= 0) { amountInput?.focus(); return; }

  addExpense(category, amount);
  amountInput.value = '';
  if (categorySelect) categorySelect.selectedIndex = 0;
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

// Venituri: cresc soldul curent, dar NU modifică reperul (ca să putem afișa „Venituri adăugate” în statistici)
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
  // marcăm prima vizită (și setăm default 0 la prima intrare)
  const firstVisit = !localStorage.getItem(LS.APP_INIT);
  if (firstVisit) {
    // asigurăm 0 la prima lună
    startingBalance = 0;
    startingInitial = 0;
    localStorage.setItem(LS.STARTING(MONTH), startingBalance);
    localStorage.setItem(LS.STARTING_INITIAL(MONTH), startingInitial);
    localStorage.setItem(LS.APP_INIT, '1');
  } else {
    // doar dacă NU e prima vizită mai întrebăm de rollover
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

