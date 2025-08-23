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

// ===== LocalStorage chei lunare =====
const MONTH = currentMonthKey();
const EXP_KEY = `expenses_${MONTH}`;
const START_KEY = `startingBalance_${MONTH}`;
const START_INIT_KEY = `startingInitial_${MONTH}`;

// ===== Date din localStorage (pe luna curentă) =====
const expenses = JSON.parse(localStorage.getItem(EXP_KEY)) || [];
const startingBalance = parseFloat(localStorage.getItem(START_KEY)) || 2000;
const startingInitial = Number.isFinite(parseFloat(localStorage.getItem(START_INIT_KEY)))
  ? parseFloat(localStorage.getItem(START_INIT_KEY))
  : startingBalance; // fallback dacă nu există reperul

// ===== Grupare pe categorii =====
function groupByCategory(expenses) {
  const map = {};
  expenses.forEach(exp => {
    const cat = exp.category || "Necunoscut";
    const val = parseFloat(String(exp.amount).replace(',', '.'));
    map[cat] = (map[cat] || 0) + (Number.isFinite(val) ? val : 0);
  });
  return map;
}

// ===== Calculuri =====
const total = expenses.reduce((s, e) => {
  const val = parseFloat(String(e.amount).replace(',', '.'));
  return s + (Number.isFinite(val) ? val : 0);
}, 0);
const balance = startingBalance - total;
const grouped = groupByCategory(expenses);

// Venituri adăugate = cât a crescut soldul față de „soldul inițial al lunii”
const incomesAdded = Math.max(0, startingBalance - startingInitial);

// ===== Actualizare UI =====
startInitialEl.textContent = `${startingInitial.toFixed(2)} lei`;
incomesTotalEl.textContent = `${incomesAdded.toFixed(2)} lei`;
totalStat.textContent = `${total.toFixed(2)} lei`;
balanceStat.textContent = `${balance.toFixed(2)} lei`;

// ===== Listă categorii =====
categoryList.innerHTML = "";
if (Object.keys(grouped).length === 0) {
  const li = document.createElement("li");
  li.className = "expense-item";
  li.textContent = "Nu există cheltuieli pentru afișat în luna curentă.";
  categoryList.appendChild(li);
} else {
  Object.entries(grouped).forEach(([cat, sum]) => {
    const li = document.createElement("li");
    li.className = "expense-item";
    li.innerHTML = `<span>${cat}</span><strong>${sum.toFixed(2)} lei</strong>`;
    categoryList.appendChild(li);
  });
}

// ===== Chart.js (dacă e disponibil) =====
if (typeof Chart !== "undefined" && chartCanvas && Object.keys(grouped).length > 0) {
  const ctx = chartCanvas.getContext("2d");
  const colors = [
    "#046d52", "#f5c542", "#2c82c9", "#8e44ad",
    "#e67e22", "#e74c3c", "#16a085", "#1abc9c",
    "#9b59b6", "#f39c12", "#d35400", "#27ae60"
  ];

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(grouped),
      datasets: [{
        label: "Cheltuieli pe categorii (luna curentă)",
        data: Object.values(grouped),
        backgroundColor: Object.keys(grouped).map((_, i) => colors[i % colors.length]),
        borderWidth: 2,
        borderColor: "#fff"
      }]
    },
    options: {
      responsive: true,
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1800,
        easing: 'easeOutCubic',
        delay: ctx => ctx.dataIndex * 300
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: { family: "Poppins", size: 14 },
            color: "#333"
          }
        },
        tooltip: {
          backgroundColor: "#0b4b36",
          titleColor: "#f5c542",
          bodyColor: "#fff",
          padding: 12,
          borderWidth: 1,
          borderColor: "#f5c542",
          callbacks: {
            label: ctx => `${(ctx.raw || 0).toFixed(2)} lei`
          }
        }
      }
    }
  });
} else if (chartCanvas && Object.keys(grouped).length === 0) {
  const msg = document.createElement("p");
  msg.style.marginTop = "0.8rem";
  msg.textContent = "Nu există date pentru grafic în luna curentă.";
  chartCanvas.replaceWith(msg);
}

