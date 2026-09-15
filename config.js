/**
 * SURVIVOR CHALLENGE CONFIG
 * ---------------------------------------------------------
 * 1. In Google Sheets: File > Share > Publish to web
 *    - Select the specific sheet/tab that holds your pick data
 *    - Choose "Comma-separated values (.csv)" from the format dropdown
 *      (it defaults to "Web page" — make sure you change it)
 *    - Click Publish, then copy the URL it gives you (it should end
 *      in "output=csv", NOT "single=true")
 * 2. Paste that URL into the SHEET_CSV_URL field FURTHER DOWN in this
 *    file, between the quotes. Do NOT paste it up here in this comment —
 *    this block is just instructions, it isn't read by the code.
 *
 * Expected columns in your sheet (exact header names, any order):
 *   Week         -> e.g. 1, 2, 3...
 *   Name         -> MVP's name (used only to enforce no-repeat picks, never displayed)
 *   QB Pick      -> e.g. "Josh Allen"
 *   Result       -> "Survived" / "Eliminated" / "Pending" (optional)
 *
 * If SHEET_CSV_URL is left blank, the site falls back to the sample
 * data in public/data/sample-weeks.json so you can preview the layout.
 */
window.SURVIVOR_CONFIG = {
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRxe4Ssdq_lp_0QZruZOvphHNcnlbnGFqQ7jqvWWO-L7HQcgPKbi2gZwQmnwiA4NJrg85gcZPZp406x/pub?gid=648629051&single=true&output=csv",
// Weekly Typeform link MVPs use to submit their pick. Update this each week
  // to swap in the correct survey (byes, injuries, etc.) — nothing else needs
  // to change when you do.
  TYPEFORM_URL: "https://form.typeform.com/to/lNnCrTZ9",
  // The combined TD threshold QBs need to hit to survive (passing + rushing + receiving)
  TD_THRESHOLD: 1.5,

  // Season framing shown in the hero
  SEASON_LABEL: "2026 Season",

  // Manual control over which week the home page shows as "current."
  // Set this to a number (e.g. 1) to lock the home page to that week
  // regardless of what's in the sheet — entering results or even adding
  // next week's picks to the sheet won't change what's displayed until
  // you update this number yourself. Leave null to auto-show whichever
  // week has the highest number in your data instead.
  CURRENT_WEEK: 2,

  // Total number of MVPs competing this season. The "Still Alive" stat is this
  // number minus everyone eliminated so far — set it once at kickoff. If left
  // blank, the site falls back to counting just this week's entries instead.
  TOTAL_MVPS: 568,
    // Set to false to keep the "Still Alive" stat blank. Flip to true once
  // eliminations begin — TOTAL_MVPS above stays untouched either way.
  SHOW_REMAINING: true,

  // Optional: ISO datetime string for when this week's picks lock (kickoff).
  // Leave blank to hide the countdown.
  NEXT_LOCK_ISO: "2026-09-20T13:00:00-04:00",
};
