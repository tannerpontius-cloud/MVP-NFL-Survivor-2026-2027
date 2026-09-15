/**
 * Shared logic: loading pick data (from a published Google Sheet CSV, or
 * the sample fallback), parsing it, and aggregating it into % breakdowns.
 * Loaded before index.js / history.js on every page.
 */
window.Survivor = (function () {
  const cfg = window.SURVIVOR_CONFIG || {};
  const rawBaseUrl = window.SURVIVOR_BASE_URL || "/";
  const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl : `${rawBaseUrl}/`;

  function fromBase(path) {
    return `${baseUrl}${path.replace(/^\/+/, "")}`;
  }

  async function loadData() {
    if (cfg.SHEET_CSV_URL && cfg.SHEET_CSV_URL.trim()) {
      const res = await fetch(cfg.SHEET_CSV_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("Sheet fetch failed: " + res.status);
      const csv = await res.text();
      return rowsToWeeks(parseCSV(csv));
    }
    const res = await fetch(fromBase("data/sample-weeks.json"), { cache: "no-store" });
    if (!res.ok) throw new Error("Sample data fetch failed");
    return res.json();
  }

  // Minimal CSV parser that handles quoted fields containing commas.
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }

    if (!rows.length) return [];
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    return rows.slice(1)
      .filter((r) => r.some((cell) => cell.trim() !== ""))
      .map((r) => {
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = (r[idx] || "").trim(); });
        return obj;
      });
  }

  // Turns flat sheet rows into the { week, entries: [...] } shape the renderers expect.
  function rowsToWeeks(rows) {
    const byWeek = new Map();
    rows.forEach((r) => {
      const week = parseInt(r["week"], 10);
      if (!week || !r["qb pick"]) return;
      if (!byWeek.has(week)) byWeek.set(week, []);
      byWeek.get(week).push({
        name: r["name"] || "",
        qb: r["qb pick"],
        result: normalizeResult(r["result"]),
      });
    });
    return Array.from(byWeek.entries())
      .map(([week, entries]) => ({ week, entries }))
      .sort((a, b) => a.week - b.week);
  }

  function normalizeResult(raw) {
    const v = (raw || "").trim().toLowerCase();
    if (v.startsWith("surv") || v === "yes" || v === "y") return "Survived";
    if (v.startsWith("elim") || v === "no" || v === "n") return "Eliminated";
    return "Pending";
  }

  function aggregatePicks(entries) {
    const counts = new Map(); // key: qb -> { qb, count, results }
    entries.forEach((e) => {
      const key = e.qb.toLowerCase();
      if (!counts.has(key)) {
        counts.set(key, { qb: e.qb, count: 0, results: { Survived: 0, Eliminated: 0, Pending: 0 } });
      }
      const c = counts.get(key);
      c.count += 1;
      c.results[e.result] = (c.results[e.result] || 0) + 1;
    });
    const total = entries.length;
    return Array.from(counts.values())
      .map((c) => ({ ...c, pct: total ? (c.count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
  }

  function dominantResult(c) {
    const { Survived, Eliminated, Pending } = c.results;
    if (Pending >= Survived && Pending >= Eliminated) return "Pending";
    return Survived >= Eliminated ? "Survived" : "Eliminated";
  }

  // Every QB a given name has already been credited with picking, across all
  // recorded weeks — used to enforce "once picked, never again."
  function usedQBsForName(weeksData, name) {
    const target = name.trim().toLowerCase();
    if (!target) return [];
    const used = new Map(); // qb -> { qb, week }
    weeksData.forEach((w) => {
      w.entries.forEach((e) => {
        if ((e.name || "").trim().toLowerCase() === target) {
          const key = e.qb.toLowerCase();
          if (!used.has(key)) used.set(key, { qb: e.qb, week: w.week });
        }
      });
    });
    return Array.from(used.values()).sort((a, b) => a.week - b.week);
  }

  // Total eliminations recorded across every week so far — used to derive
  // "MVPs still alive" from a configured season roster size without ever
  // needing to know who any of them are.
  function cumulativeEliminated(weeksData) {
    return weeksData.reduce((sum, w) => sum + w.entries.filter((e) => e.result === "Eliminated").length, 0);
  }

  // Picks the week to show as "current."
  //
  // A CURRENT_WEEK value in config.js always wins. If that week has no rows in
  // the sheet yet, this returns an empty week for that number, so the site
  // shows the new week with an empty pick panel rather than quietly reverting
  // to the previous week. Bump CURRENT_WEEK and the page follows immediately,
  // with or without data behind it.
  //
  // Leave CURRENT_WEEK as null to auto-select whichever week number is highest
  // in the sheet instead.
  function resolveCurrentWeek(weeksData) {
    if (cfg.CURRENT_WEEK != null) {
      const target = Number(cfg.CURRENT_WEEK);
      const match = weeksData.find((w) => w.week === target);
      return match || { week: target, entries: [] };
    }
    return weeksData[weeksData.length - 1];
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return { cfg, loadData, parseCSV, rowsToWeeks, normalizeResult, aggregatePicks, dominantResult, usedQBsForName, cumulativeEliminated, resolveCurrentWeek, escapeHTML };
})();

/**
 * Pick links + lock state.
 *
 * Points every [data-pick-link] element at this week's Typeform URL, and once
 * NEXT_LOCK_ISO passes, swaps them to a locked state. Any [data-lock-note]
 * element gets the matching supporting line. Both values come from config.js,
 * so the weekly update is still a one-file change.
 *
 * Optional per-element attributes:
 *   data-locked-label  — locked text for that button (default "Picks are locked")
 *   data-lock-note     — element whose text tracks the lock state
 */
(function () {
  const cfg = window.SURVIVOR_CONFIG || {};
  const lockDate = cfg.NEXT_LOCK_ISO ? new Date(cfg.NEXT_LOCK_ISO) : null;
  const hasLockDate = lockDate && !isNaN(lockDate.getTime());

  function formatLock(date) {
    try {
      return date.toLocaleString("en-US", {
        timeZone: "America/New_York",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }) + " ET";
    } catch (err) {
      return date.toLocaleString();
    }
  }

  function isLocked() {
    return hasLockDate && Date.now() >= lockDate.getTime();
  }

  function render() {
    const locked = isLocked();

    document.querySelectorAll("[data-pick-link]").forEach(function (el) {
      el.href = cfg.TYPEFORM_URL || "#";

      // Remember the original label the first time through so we can restore it.
      if (!el.dataset.openLabel) el.dataset.openLabel = el.textContent.trim();

      if (locked) {
        el.classList.add("is-locked");
        el.setAttribute("aria-disabled", "true");
        el.removeAttribute("target");
        el.textContent = el.getAttribute("data-locked-label") || "Picks are locked";
      } else {
        el.classList.remove("is-locked");
        el.removeAttribute("aria-disabled");
        el.setAttribute("target", "_blank");
        el.textContent = el.dataset.openLabel;
      }
    });

       document.querySelectorAll("[data-lock-note]").forEach(function (el) {
      if (!hasLockDate) { el.textContent = ""; return; }

      const headline = locked
        ? LOCKED_NOTE_MAIN
        : "Picks lock " + formatLock(lockDate);

      const detail = locked ? LOCKED_NOTE_DETAIL : OPEN_NOTE_DETAIL;

      el.textContent = "";

      const main = document.createElement("span");
      main.className = "lock-note-main";
      main.textContent = headline;
      el.appendChild(main);

      if (detail) {
        const sub = document.createElement("span");
        sub.className = "lock-note-sub";
        sub.textContent = detail;
        el.appendChild(sub);
      }
    });
  }

  // Block clicks on locked links, including keyboard activation.
  document.addEventListener("click", function (event) {
    const link = event.target.closest("[data-pick-link]");
    if (link && link.classList.contains("is-locked")) event.preventDefault();
  });
  // --- Note copy. Edit these strings to change what appears under the button. ---
  const OPEN_NOTE_DETAIL =
    "Once you have submitted your pick for the week, you will receive a confirmation email. " +
    "If for any reason you submit multiple picks, we will be taking the latest submission.";

  const LOCKED_NOTE_MAIN =
    "This week is closed. Check out "This Week"s breakdown!";

  const LOCKED_NOTE_DETAIL = "";
  
  render();
  // Recheck so a tab left open across the deadline updates on its own.
  setInterval(render, 15000);
})();
