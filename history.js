(function () {
  const S = window.Survivor;
  const els = {
    ladder: document.getElementById("ladder"),
    weeksList: document.getElementById("weeks-list"),
  };
  init();
  async function init() {
    let weeksData = [];
    try {
      weeksData = await S.loadData();
    } catch (err) {
      console.error("Failed to load pick data", err);
    }
    if (!weeksData.length) {
      els.ladder.innerHTML = '<p class="state-msg">No history yet — check back once Week 1 is recorded.</p>';
      els.weeksList.innerHTML = "";
      return;
    }
    renderLadder(weeksData);
    renderWeeksList(weeksData);
  }
  function renderLadder(weeksData) {
    const cfg = S.cfg;
    // Oldest week first so the pool can roll forward correctly.
    const ordered = [...weeksData].sort((a, b) => a.week - b.week);
    // Pool entering Week 1: the full MVP roster, or that week's entries as a fallback.
    let pool = Number(cfg.TOTAL_MVPS) || ordered[0].entries.length || 1;
    const rows = ordered.map((w) => {
      const survived = w.entries.filter((e) => e.result === "Survived").length;
      const eliminated = w.entries.filter((e) => e.result === "Eliminated").length;
      const resolved = survived + eliminated;
      const denom = pool || 1;
      const pct = (n) => Math.max(0, Math.min(100, (n / denom) * 100));
      const survivedPct = pct(survived);
      const eliminatedPct = pct(eliminated);
      const pendingPct = Math.max(0, 100 - survivedPct - eliminatedPct);
      const alive = Math.max(0, pool - eliminated);
      const countLabel = resolved === 0
        ? `<strong>${pool}</strong> in play — results pending`
        : `<strong>${alive}</strong> / ${pool} alive`;
      // Whoever is still alive after this week becomes next week's pool.
      pool = alive;
      return `
        <div class="ladder-rung">
          <div class="ladder-week-label">Wk ${w.week}</div>
          <div class="ladder-track">
            <div class="ladder-segment survived" style="width:${survivedPct.toFixed(1)}%"></div>
            <div class="ladder-segment pending" style="width:${pendingPct.toFixed(1)}%"></div>
            <div class="ladder-segment eliminated" style="width:${eliminatedPct.toFixed(1)}%"></div>
          </div>
          <div class="ladder-count">${countLabel}</div>
        </div>`;
    }).join("");
    els.ladder.innerHTML = rows;
  }
  function renderWeeksList(weeksData) {
    // Most recent week first, scroll down for earlier weeks.
    const ordered = [...weeksData].reverse();
    els.weeksList.innerHTML = ordered.map((w) => {
      const agg = S.aggregatePicks(w.entries);
      const total = w.entries.length;
      const rows = agg.map((c) => {
        const res = S.dominantResult(c);
        const tagClass = res.toLowerCase();
        return `
          <div class="pick-row">
            <div class="pick-name">${S.escapeHTML(c.qb)}</div>
            <div class="pick-status"><span class="result-tag ${tagClass}">${res}</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${c.pct.toFixed(1)}%"></div></div>
            <div class="pick-pct">${c.pct.toFixed(0)}%</div>
          </div>`;
      }).join("");
      return `
        <article class="week-block" id="week-${w.week}">
          <div class="picks-meta">
            <h3>Week ${w.week}</h3>
            <span class="total"><strong>${total}</strong> entries</span>
          </div>
          <div class="picks-panel">${rows}</div>
        </article>`;
    }).join("");
  }
})();
