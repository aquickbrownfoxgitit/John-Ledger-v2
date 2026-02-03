const $ = id => document.getElementById(id);
const fmt = n => `$${Number(n).toFixed(2)}`;
const num = v => Number(v) || 0;

const STORE_KEY = "john-ledger-v1";

const store = {
  savings: 0,
  mgo: 0,
  checking: 0,
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

function apply(from, to, amt) {
  if (from === "Savings") store.savings -= amt;
  if (from === "MGO") store.mgo -= amt;
  if (from === "Checking") store.checking -= amt;
  if (from === "Fronted") store.fronted -= amt;

  if (to === "Savings") store.savings += amt;
  if (to === "MGO") store.mgo += amt;
  if (to === "Checking") store.checking += amt;
  if (to === "Fronted") store.fronted += amt;
}

function refresh() {
  $("savingsDisplay").textContent = fmt(store.savings);
  $("mgoDisplay").textContent = fmt(store.mgo);
  $("checkingDisplay").textContent = fmt(store.checking);
  $("frontedDisplay").textContent = fmt(store.fronted);
  save();
}

function renderHistory() {
  const list = $("historyList");
  list.innerHTML = "";

  store.entries
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(e => {
      const row = document.createElement("div");
      row.className = "history-item";

      row.innerHTML = `
        <div>
          <strong>${e.date}</strong> — ${fmt(e.amount)}
          <div class="tiny">${e.from} → ${e.to}</div>
          ${e.note ? `<div class="tiny">${e.note}</div>` : ""}
        </div>
        <div>
          ${e.to === "Fronted" ? `<button class="ghost resolve">Resolve</button>` : ""}
          <button class="ghost delete">Delete</button>
        </div>
      `;

      row.querySelector(".delete").onclick = () => {
        apply(e.to, e.from, e.amount);
        store.entries = store.entries.filter(x => x.id !== e.id);
        refresh();
        renderHistory();
      };

      const res = row.querySelector(".resolve");
      if (res) {
        res.onclick = () => row.classList.toggle("cleared");
      }

      list.appendChild(row);
    });
}

$("addEntry").onclick = () => {
  const amt = num($("entryAmt").value);
  if (!amt) return;

  const entry = {
    id: crypto.randomUUID(),
    date: $("entryDate").value || new Date().toISOString().slice(0,10),
    amount: amt,
    from: $("fromAcct").value,
    to: $("toAcct").value,
    note: $("entryNote").value
  };

  apply(entry.from, entry.to, amt);
  store.entries.push(entry);

  $("entryAmt").value = "";
  $("entryNote").value = "";

  refresh();
  renderHistory();
};

$("clearChecking").onclick = () => {
  store.checking = 0;
  refresh();
};

$("exportCsv").onclick = () => {
  const from = $("fromDate").value;
  const to = $("toDate").value;

  const rows = store.entries.filter(e =>
    (!from || e.date >= from) &&
    (!to || e.date <= to)
  );

  let csv = "Date,Amount,From,To,Note\n";
  rows.forEach(r => {
    csv += `${r.date},${r.amount},${r.from},${r.to},"${r.note || ""}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "john-ledger-export.csv";
  a.click();
};

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
