const $ = id => document.getElementById(id);
const fmt = n => `$${Number(n).toFixed(2)}`;
const num = v => Number(v.replace(",", ".")) || 0;

const STORE_KEY = "john-ledger-v3";

const store = {
  savings: 0,
  mgo: 0,
  fronted: 0,
  entries: []
};

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function load() {
  const d = JSON.parse(localStorage.getItem(STORE_KEY));
  if (d) Object.assign(store, d);
}

function refresh() {
  $("savingsDisplay").textContent = fmt(store.savings);
  $("mgoDisplay").textContent = fmt(store.mgo);
  $("frontedDisplay").textContent = fmt(store.fronted);
  save();
}

function applyTransaction(type, from, to, amt) {
  if (type === "deposit") {
    if (to === "Savings") store.savings += amt;
    if (to === "MGO") store.mgo += amt;
    if (to === "Fronted") store.fronted += amt;
  }

  if (type === "debit") {
    if (from === "Savings") store.savings -= amt;
    if (from === "MGO") store.mgo -= amt;
    if (from === "Fronted") store.fronted -= amt;
  }

  if (type === "transfer") {
    if (from === "Savings") store.savings -= amt;
    if (from === "MGO") store.mgo -= amt;
    if (from === "Fronted") store.fronted -= amt;

    if (to === "Savings") store.savings += amt;
    if (to === "MGO") store.mgo += amt;
    if (to === "Fronted") store.fronted += amt;
  }
}

function renderHistory() {
  const list = $("historyList");
  list.innerHTML = "";

  store.entries
    .slice()
    .sort((a,b) => new Date(b.date) - new Date(a.date))
    .forEach(e => {

      const row = document.createElement("div");
      row.className = "history-item";
      if (e.cleared) row.classList.add("cleared");

      row.innerHTML = `
        <div>
          <strong>${e.date}</strong> — ${fmt(e.amount)}
          <div class="tiny">${e.type.toUpperCase()} ${e.from || ""} → ${e.to || ""}</div>
          <div class="tiny">${e.note}</div>
        </div>
        <div>
          <button class="ghost resolve">Resolve</button>
          <button class="ghost delete">Delete</button>
        </div>
      `;

      row.querySelector(".resolve").onclick = () => {
        e.cleared = !e.cleared;
        save();
        renderHistory();
      };

      row.querySelector(".delete").onclick = () => {
        reverseTransaction(e);
        store.entries = store.entries.filter(x => x.id !== e.id);
        refresh();
        renderHistory();
      };

      list.appendChild(row);
    });
}

function reverseTransaction(e) {

  if (e.type === "deposit") {
    if (e.to === "Savings") store.savings -= e.amount;
    if (e.to === "MGO") store.mgo -= e.amount;
    if (e.to === "Fronted") store.fronted -= e.amount;
  }

  if (e.type === "debit") {
    if (e.from === "Savings") store.savings += e.amount;
    if (e.from === "MGO") store.mgo += e.amount;
    if (e.from === "Fronted") store.fronted += e.amount;
  }

  if (e.type === "transfer") {

    // reverse the original transfer
    if (e.to === "Savings") store.savings -= e.amount;
    if (e.to === "MGO") store.mgo -= e.amount;
    if (e.to === "Fronted") store.fronted -= e.amount;

    if (e.from === "Savings") store.savings += e.amount;
    if (e.from === "MGO") store.mgo += e.amount;
    if (e.from === "Fronted") store.fronted += e.amount;
  }
}

$("txnType").onchange = function() {
  $("fromWrapper").style.display = "none";
  $("toWrapper").style.display = "none";

  if (this.value === "deposit") {
    $("toWrapper").style.display = "block";
  }

  if (this.value === "debit") {
    $("fromWrapper").style.display = "block";
  }

  if (this.value === "transfer") {
    $("fromWrapper").style.display = "block";
    $("toWrapper").style.display = "block";
  }
};

$("entryAmt").addEventListener("blur", function () {
  let value = this.value.trim();
  if (!value) return;

  value = value.replace(",", ".");
  const number = parseFloat(value);

  if (!isNaN(number)) {
    this.value = number.toFixed(2);
  } else {
    this.value = "";
  }
});

$("addEntry").onclick = () => {

  const type = $("txnType").value;
  const from = $("fromAcct").value;
  const to = $("toAcct").value;
  const amt = num($("entryAmt").value);
  const note = $("entryNote").value.trim();

  if (!type || !amt || !note) {
    alert("Type, amount, and note are required.");
    return;
  }

  if (type === "deposit" && !to) return;
  if (type === "debit" && !from) return;
  if (type === "transfer" && (!from || !to)) return;

  applyTransaction(type, from, to, amt);

  const entry = {
    id: crypto.randomUUID(),
    date: $("entryDate").value || new Date().toISOString().slice(0,10),
    type,
    from,
    to,
    amount: amt,
    note,
    cleared: false
  };

  store.entries.push(entry);

  $("entryAmt").value = "";
  $("entryNote").value = "";
  $("txnType").value = "";
  $("fromAcct").value = "";
  $("toAcct").value = "";
  $("fromWrapper").style.display = "none";
  $("toWrapper").style.display = "none";

  refresh();
  renderHistory();
};

$("clearFronted").onclick = () => {
  if (store.fronted <= 0) return;
  if (!confirm("Clear Fronted?")) return;
  store.fronted = 0;
  refresh();
};

$("archiveMonth").onclick = () => {
  if (!confirm("Archive month? This clears history only.")) return;
  store.entries = [];
  refresh();
  renderHistory();
};

$("exportCsv").onclick = () => {

  const includeBalances = $("includeBalances").checked;
  const fromDate = $("fromDate").value;
  const toDate = $("toDate").value;

  let rows = store.entries.filter(e =>
    (!fromDate || e.date >= fromDate) &&
    (!toDate || e.date <= toDate)
  );

  rows.sort((a,b) => new Date(a.date) - new Date(b.date));

  let csv = "Date,Type,From,To,Amount,Note,Cleared";

  if (includeBalances) {
    csv += ",Savings After,MGO After,Fronted After";
  }

  csv += "\n";

  let tempSavings = store.savings;
  let tempMGO = store.mgo;
  let tempFronted = store.fronted;

  if (includeBalances) {
    // Recalculate from zero
    tempSavings = 0;
    tempMGO = 0;
    tempFronted = 0;

    rows.forEach(e => {
      applyTemp(e, (s,m,f) => {
        tempSavings = s;
        tempMGO = m;
        tempFronted = f;
      });
    });

    tempSavings = 0;
    tempMGO = 0;
    tempFronted = 0;
  }

  rows.forEach(e => {

    if (includeBalances) {
      applyTemp(e, (s,m,f) => {
        tempSavings = s;
        tempMGO = m;
        tempFronted = f;
      });
    }

    csv += `${e.date},${e.type},${e.from || ""},${e.to || ""},${e.amount},"${e.note}",${e.cleared}`;

    if (includeBalances) {
      csv += `,${tempSavings},${tempMGO},${tempFronted}`;
    }

    csv += "\n";
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "john-ledger-export.csv";
  a.click();
};

function applyTemp(e, callback) {

  let s = 0, m = 0, f = 0;

  if (!applyTemp.state) applyTemp.state = { s:0, m:0, f:0 };
  s = applyTemp.state.s;
  m = applyTemp.state.m;
  f = applyTemp.state.f;

  if (e.type === "deposit") {
    if (e.to === "Savings") s += e.amount;
    if (e.to === "MGO") m += e.amount;
    if (e.to === "Fronted") f += e.amount;
  }

  if (e.type === "debit") {
    if (e.from === "Savings") s -= e.amount;
    if (e.from === "MGO") m -= e.amount;
    if (e.from === "Fronted") f -= e.amount;
  }

  if (e.type === "transfer") {
    if (e.from === "Savings") s -= e.amount;
    if (e.from === "MGO") m -= e.amount;
    if (e.from === "Fronted") f -= e.amount;

    if (e.to === "Savings") s += e.amount;
    if (e.to === "MGO") m += e.amount;
    if (e.to === "Fronted") f += e.amount;
  }

  applyTemp.state = { s, m, f };
  callback(s,m,f);
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab, .page").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  };
});

load();
refresh();
renderHistory();

