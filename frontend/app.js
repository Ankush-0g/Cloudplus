const COLORS = ["#66836f", "#bf7355", "#8079a4", "#c3974f", "#528c91"];
const PATS = [["normal", "Normal traffic"], ["leak", "Memory leak (slow climb)"],
  ["spike", "Sudden spike"], ["burst", "Random bursts"]];
const $ = id => document.getElementById(id);
let S = null;
let timer = null;
let busy = false;
let pats = ["normal", "normal", "normal", "normal", "normal"];
let seenAlerts = 0;

async function api(path, method = "GET", body) {
  const response = await fetch("/api" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}). Please try again.`);
  }
  return response.json();
}

function showError(message) {
  $("errorBanner").textContent = message;
  $("errorBanner").hidden = false;
}

function clearError() {
  $("errorBanner").hidden = true;
  $("errorBanner").textContent = "";
}

async function safely(action) {
  clearError();
  try {
    await action();
  } catch (error) {
    stop();
    showError(error.message || "Something went wrong. Please try again.");
  }
}

/* Theme */
function setTheme(theme) {
  const dark = theme === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  $("themeToggle").setAttribute("aria-pressed", String(dark));
  $("themeToggle").setAttribute("aria-label", `Switch to ${dark ? "light" : "dark"} mode`);
  $("themeLabel").textContent = `${dark ? "Light" : "Dark"} mode`;
  document.querySelector('meta[name="theme-color"]').content = dark ? "#252421" : "#f7f5f0";
  localStorage.setItem("cloudpulse-theme", dark ? "dark" : "light");
  if (S) chart();
}
const savedTheme = localStorage.getItem("cloudpulse-theme");
setTheme(savedTheme === "dark" ? "dark" : "light");
$("themeToggle").addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

/* Controls */
function buildServerSelects() {
  const n = +$("n").value;
  $("srv").innerHTML = Array.from({ length: n }, (_, k) => `
    <label class="control-field" for="pattern-${k}">
      <span class="server-control-name"><i style="background:${COLORS[k]}"></i>Server-${k + 1}</span>
      <select id="pattern-${k}" data-k="${k}" aria-label="Load pattern for Server-${k + 1}">
        ${PATS.map(([value, title]) => `<option value="${value}"${pats[k] === value ? " selected" : ""}>${title}</option>`).join("")}
      </select>
    </label>`).join("");
  $("srv").querySelectorAll("select").forEach(select => {
    select.addEventListener("change", () => safely(async () => {
      pats[+select.dataset.k] = select.value;
      await applyConfig();
    }));
  });
}

$("all").innerHTML += PATS.map(([value, title]) => `<option value="${value}">${title}</option>`).join("");
$("all").addEventListener("change", () => safely(async () => {
  if (!$("all").value) return;
  pats.fill($("all").value);
  buildServerSelects();
  await applyConfig();
  $("all").value = "";
}));

[["n", "vN"], ["t", "vT"], ["th", "vH"]].forEach(([id, label]) => {
  $(id).addEventListener("input", () => {
    $(label).textContent = $(id).value;
    if (id === "n") buildServerSelects();
    if (id === "th") $("thresholdText").textContent = `${$(id).value}%`;
  });
  $(id).addEventListener("change", () => safely(applyConfig));
});

async function applyConfig() {
  stop();
  S = await api("/config", "POST", {
    servers: +$("n").value,
    steps: +$("t").value,
    threshold: +$("th").value,
    patterns: pats.slice(0, +$("n").value)
  });
  seenAlerts = 0;
  render();
}

/* Simulation */
async function step() {
  if (busy || !S || S.finished) return;
  busy = true;
  try {
    S = await api("/tick", "POST");
    render();
    if (S.finished) stop();
  } finally {
    busy = false;
  }
}

function setRunLabel(paused) {
  $("run").innerHTML = paused
    ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4h3v12H6zm5 0h3v12h-3z" fill="currentColor"/></svg><span>Pause simulation</span>'
    : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 9 6-9 6V4Z" fill="currentColor"/></svg><span>Run simulation</span>';
}

function stop() {
  clearInterval(timer);
  timer = null;
  setRunLabel(false);
}

$("run").addEventListener("click", () => safely(async () => {
  if (timer) {
    stop();
    return;
  }
  if (S.finished) await applyConfig();
  setRunLabel(true);
  timer = setInterval(() => safely(step), 650);
}));

$("step").addEventListener("click", () => safely(async () => {
  stop();
  if (S.finished) await applyConfig();
  await step();
}));

$("reset").addEventListener("click", () => safely(async () => {
  stop();
  S = await api("/reset", "POST");
  seenAlerts = 0;
  render();
}));

$("cards").addEventListener("click", event => safely(async () => {
  const button = event.target.closest("[data-spike]");
  if (!button) return;
  button.disabled = true;
  button.textContent = "Injecting…";
  S = await api("/spike/" + button.dataset.spike, "POST");
  render();
}));

/* Visualization */
function chart() {
  if (!S) return;
  const config = S.config;
  const width = 900, height = 310, left = 46, right = 18, top = 18, bottom = 32;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = index => left + index * plotWidth / Math.max(1, config.steps - 1);
  const y = value => top + (100 - value) * plotHeight / 100;
  const styles = getComputedStyle(document.documentElement);
  const gridColor = styles.getPropertyValue("--line").trim();
  const labelColor = styles.getPropertyValue("--muted").trim();
  const criticalColor = styles.getPropertyValue("--critical").trim();
  let markup = "";

  [0, 25, 50, 75, 100].forEach(value => {
    markup += `<line x1="${left}" x2="${width - right}" y1="${y(value)}" y2="${y(value)}" stroke="${gridColor}" stroke-width="1"/>`;
    markup += `<text x="${left - 10}" y="${y(value) + 3.5}" fill="${labelColor}" font-size="10" text-anchor="end">${value}</text>`;
  });

  const tickEvery = config.steps <= 16 ? 2 : config.steps <= 32 ? 4 : 6;
  for (let index = 0; index < config.steps; index += tickEvery) {
    markup += `<text x="${x(index)}" y="${height - 8}" fill="${labelColor}" font-size="9" text-anchor="middle">${index + 1}</text>`;
  }
  if ((config.steps - 1) % tickEvery !== 0) {
    markup += `<text x="${x(config.steps - 1)}" y="${height - 8}" fill="${labelColor}" font-size="9" text-anchor="middle">${config.steps}</text>`;
  }

  markup += `<line x1="${left}" x2="${width - right}" y1="${y(config.threshold)}" y2="${y(config.threshold)}" stroke="${criticalColor}" stroke-width="1.5" stroke-dasharray="6 5"/>`;
  markup += `<text x="${width - right - 3}" y="${y(config.threshold) - 7}" fill="${criticalColor}" font-size="10" text-anchor="end">${config.threshold}% threshold</text>`;

  S.data.forEach((values, server) => {
    if (!values.length) return;
    const points = values.map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");
    markup += `<path fill="none" stroke="${COLORS[server]}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" d="${points}"/>`;
    values.forEach((value, index) => {
      if (index === values.length - 1) {
        markup += `<circle cx="${x(index)}" cy="${y(value)}" r="3.3" fill="${COLORS[server]}" stroke="${styles.getPropertyValue("--surface").trim()}" stroke-width="1.5"/>`;
      }
    });
  });

  S.alerts.forEach(alert => {
    markup += `<circle cx="${x(alert.step - 1)}" cy="${y(alert.value)}" r="4.3" fill="${criticalColor}" stroke="${styles.getPropertyValue("--surface").trim()}" stroke-width="1.5"/>`;
  });
  $("chart").innerHTML = markup;
  $("chart").setAttribute("aria-label", `CPU usage across ${config.servers} servers over ${config.steps} time steps. Alert threshold is ${config.threshold} percent.`);
}

function render() {
  const config = S.config;
  const summary = S.summary;
  const serverCount = config.servers;
  const alarms = summary.active_alarms;
  const isCritical = alarms > 0;
  $("dot").className = `dot${isCritical ? " crit" : ""}`;
  $("statusText").textContent = isCritical ? `${alarms} server${alarms === 1 ? "" : "s"} need attention` : "Cluster healthy";
  $("progress").textContent = S.step === 0
    ? `${config.steps} steps · ready to begin`
    : S.finished ? `Complete · ${config.steps} of ${config.steps} steps` : `Step ${S.step} of ${config.steps}`;
  $("thresholdText").textContent = `${config.threshold}%`;

  $("kpis").innerHTML = `
    <article class="kpi"><small>Servers monitored</small><b>${serverCount}</b><span class="kpi-detail">Active instances in this scenario</span></article>
    <article class="kpi"><small>Average CPU</small><b>${summary.average.toFixed(1)}%</b><span class="kpi-detail">${S.step ? "Across recorded readings" : "Waiting for first reading"}</span></article>
    <article class="kpi"><small>Peak CPU</small><b class="${summary.peak >= config.threshold ? "bad" : ""}">${summary.peak.toFixed(1)}%</b><span class="kpi-detail">Alert threshold ${config.threshold}%</span></article>
    <article class="kpi"><small>Active alarms</small><b class="${alarms ? "bad" : "good"}">${alarms}</b><span class="kpi-detail">${summary.total_alerts} total alert${summary.total_alerts === 1 ? "" : "s"} recorded</span></article>
    <article class="kpi"><small>Most affected</small><b>${summary.most_affected === null ? "—" : "Server-" + (summary.most_affected + 1)}</b><span class="kpi-detail">${summary.most_affected === null ? "No alerts recorded" : "By total alert count"}</span></article>
    <article class="kpi"><small>Steps completed</small><b>${S.step}<span style="font-size:15px;color:var(--muted)"> / ${config.steps}</span></b><span class="kpi-detail">${S.finished ? "Simulation complete" : "Time steps in this run"}</span></article>`;

  $("legend").innerHTML = Array.from({ length: serverCount }, (_, server) =>
    `<span><i style="background:${COLORS[server]}"></i>Server-${server + 1}</span>`).join("") +
    '<span><i class="alert-legend"></i>Alert reading</span>';
  chart();

  $("cards").innerHTML = S.data.map((values, server) => {
    const cpu = values.length ? values[values.length - 1] : 0;
    const critical = S.critical[server];
    const ram = Math.min(8, 1.2 + cpu / 100 * 8 * .9);
    const pattern = PATS.find(([value]) => value === config.patterns[server]);
    return `<article class="card${critical ? " crit" : ""}">
      <h3>Server-${server + 1}<span class="badge${critical ? " crit" : ""}">${critical ? "Needs attention" : "Healthy"}</span></h3>
      <div class="row"><span>Current CPU</span><span class="cpu-reading${critical ? " bad" : ""}">${cpu.toFixed(1)}%</span></div>
      <div class="server-meter" role="meter" aria-label="Server-${server + 1} CPU usage" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${cpu}"><span style="width:${cpu}%;background:${critical ? "var(--critical)" : COLORS[server]}"></span></div>
      <div class="row"><span>Estimated RAM</span><span>${ram.toFixed(1)} GB / 8 GB</span></div>
      <div class="row"><span>Load pattern</span><span>${pattern ? pattern[1] : "Normal traffic"}</span></div>
      <button class="button button-spike" data-spike="${server}" type="button" ${S.finished ? "disabled" : ""}>Inject load spike</button>
    </article>`;
  }).join("");

  const rows = S.alerts.slice().reverse();
  $("log").innerHTML = rows.length ? rows.map((alert, index) =>
    `<tr class="${S.alerts.length - index > seenAlerts ? "new" : ""}"><td>${alert.step}</td><td>Server-${alert.server + 1}</td><td class="bad">${alert.value.toFixed(1)}%</td><td>CPU reached the ${config.threshold}% threshold</td></tr>`
  ).join("") : `<tr><td class="empty-log" colspan="4">${S.step ? "No alerts so far. All servers are below the threshold." : "Run the simulation to see server activity here."}</td></tr>`;
  seenAlerts = S.alerts.length;
}

buildServerSelects();
safely(async () => {
  S = await api("/state");
  render();
});
