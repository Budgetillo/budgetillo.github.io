// ===== Util & luna curentă =====
function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ===== Selectori =====
const totalStat = document.getElementById("total-stat");
const balanceStat = document.getElementById("balance-stat");
const startInitialEl = document.getElementById("start-initial");
const incomesTotalEl = document.getElementById("incomes-total");
const categoryList = document.getElementById("category-list");
const chartCanvas = document.getElementById("expensesChart");

// ===== Chei lunare =====
const MONTH = currentMonthKey();
const EXP_KEY = `expenses_${MONTH}`;
const START_KEY = `startingBalance_${MONTH}`;
const START_INIT_KEY = `startingInitial_${MONTH}`;

// ===== Date din localStorage (pe luna curentă) =====
const expenses = JSON.parse(localStorage.getItem(EXP_KEY)) || [];
const startingBalance = Number.isFinite(parseFloat(localStorage.getItem(START_KEY)))
  ? parseFloat(localStorage.getItem(START_KEY)) : 0; // default 0
const startingInitial = Number.isFinite(parseFloat(localStorage.getItem(START_INIT_KEY)))
  ? parseFloat(localStorage.getItem(START_INIT_KEY)) : 0;

// ===== Grupări =====
function groupCategoryAndDetails(expenses) {
  const byCat = {}; // pentru grafic (total pe categorie)
  const byCatDetailSplit = {}; // pentru listă (cu/ fără detalii) + exemple

  expenses.forEach(exp => {
    const cat = exp.category || "Necunoscut";
    const raw = String(exp.amount ?? "").replace(',', '.');
    const val = parseFloat(raw);
    const amount = Number.isFinite(val) ? val : 0;
    const hasDetails = !!(exp.details && String(exp.details).trim().length > 0);
    const detailText = hasDetails ? String(exp.details).trim() : "";

    // total pe categorie (grafic)
    byCat[cat] = (byCat[cat] || 0) + amount;

    // split pe categorie
    if (!byCatDetailSplit[cat]) {
      byCatDetailSplit[cat] = { withDetails: 0, withoutDetails: 0, examples: new Set() };
    }
    if (hasDetails) {
      byCatDetailSplit[cat].withDetails += amount;
      if (byCatDetailSplit[cat].examples.size < 3 && detailText) {
        byCatDetailSplit[cat].examples.add(detailText.slice(0, 30));
      }
    } else {
      byCatDetailSplit[cat].withoutDetails += amount;
    }
  });

  // convertește set-urile în array pentru afișare
  Object.keys(byCatDetailSplit).forEach(cat => {
    byCatDetailSplit[cat].examples = Array.from(byCatDetailSplit[cat].examples);
  });

  return { byCat, byCatDetailSplit };
}

// ===== Calculuri =====
const total = expenses.reduce((s, e) => {
  const val = parseFloat(String(e.amount ?? "").replace(',', '.'));
  return s + (Number.isFinite(val) ? val : 0);
}, 0);
const balance = startingBalance - total;

const { byCat, byCatDetailSplit } = groupCategoryAndDetails(expenses);

// Venituri adăugate = cât a crescut soldul curent față de soldul inițial al lunii
const incomesAdded = Math.max(0, startingBalance - startingInitial);

// ===== Actualizare UI (rezumat) =====
startInitialEl.textContent = `${startingInitial.toFixed(2)} lei`;
incomesTotalEl.textContent = `${incomesAdded.toFixed(2)} lei`;
totalStat.textContent = `${total.toFixed(2)} lei`;
balanceStat.textContent = `${balance.toFixed(2)} lei`;

// ===== Listă categorii (cu/ fără detalii) =====
categoryList.innerHTML = "";
const cats = Object.keys(byCatDetailSplit);
if (cats.length === 0) {
  const li = document.createElement("li");
  li.className = "expense-item";
  li.textContent = "Nu există cheltuieli pentru afișat în luna curentă.";
  categoryList.appendChild(li);
} else {
  cats.sort((a, b) => a.localeCompare(b, 'ro'));
  cats.forEach(cat => {
    const info = byCatDetailSplit[cat];

    if (info.withoutDetails > 0) {
      const li = document.createElement("li");
      li.className = "expense-item";
      li.innerHTML = `<span>${cat} <span class="badge badge-muted">fără detalii</span></span>
                      <strong>${info.withoutDetails.toFixed(2)} lei</strong>`;
      categoryList.appendChild(li);
    }

    if (info.withDetails > 0) {
      const li = document.createElement("li");
      li.className = "expense-item item-with-details";
      const examples = info.examples.length ? ` • ex: ${info.examples.join(", ")}` : "";
      li.innerHTML = `<span>${cat} <span class="badge badge-detail">cu detalii</span><small class="examples">${examples}</small></span>
                      <strong>${info.withDetails.toFixed(2)} lei</strong>`;
      categoryList.appendChild(li);
    }
  });
}

// ===== Chart.js (pe categorie total) =====
if (typeof Chart !== "undefined" && chartCanvas && Object.keys(byCat).length > 0) {
  const ctx = chartCanvas.getContext("2d");
  const colors = [
    "#046d52", "#f5c542", "#2c82c9", "#8e44ad",
    "#e67e22", "#e74c3c", "#16a085", "#1abc9c",
    "#9b59b6", "#f39c12", "#d35400", "#27ae60"
  ];

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(byCat),
      datasets: [{
        label: "Cheltuieli pe categorii (luna curentă)",
        data: Object.values(byCat),
        backgroundColor: Object.keys(byCat).map((_, i) => colors[i % colors.length]),
        borderWidth: 2,
        borderColor: "#fff"
      }]
    },
    options: {
      responsive: true,
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1600,
        easing: 'easeOutCubic',
        delay: ctx => ctx.dataIndex * 250
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: { font: { family: "Poppins", size: 14 }, color: "#333" }
        },
        tooltip: {
          backgroundColor: "#0b4b36",
          titleColor: "#f5c542",
          bodyColor: "#fff",
          padding: 12,
          borderWidth: 1,
          borderColor: "#f5c542",
          callbacks: { label: ctx => `${(ctx.raw || 0).toFixed(2)} lei` }
        }
      }
    }
  });
} else if (chartCanvas && Object.keys(byCat).length === 0) {
  const msg = document.createElement("p");
  msg.style.marginTop = "0.8rem";
  msg.textContent = "Nu există date pentru grafic în luna curentă.";
  chartCanvas.replaceWith(msg);
}


