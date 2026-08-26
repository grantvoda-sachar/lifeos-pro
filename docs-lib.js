// Document foldering + search for LifeOS.
//
// Folders are DERIVED from each document's text, so every document ever
// captured lands in a folder immediately with no migration and no data
// change. Writing the folder back into `categories` is a separate, opt-in
// action (see applyFolders) that only ever appends.
//
// Rules are ordered and the first match wins, in two tiers.
//
// Tier 1 names what the document IS - "credit note", "passport", "policy".
// Tier 2 names what it is ABOUT - school, medical, vehicle. Type beats topic,
// so a credit note for school shoes files under Invoices & Receipts rather
// than School & Education. Getting this backwards is how a document ends up
// somewhere you would never think to look for it.

const BY_TYPE = [
  ['Passports & IDs', /\b(passport|id ?book|id ?card|identity document|smart ?id|birth certificate|marriage certificate|unabridged)\b/],
  ['Visas & Permits', /\b(visa|permit|residence|schengen|esta|embassy|consulate|immigration)\b/],
  ['Invoices & Receipts', /\b(invoice|receipt|credit ?note|credit ?memo|debit ?note|quotation|proforma|pro ?forma|till ?slip|order ?confirmation|refund|grv)\b/],
  ['Banking & Statements', /\b(estatement|e.?statement|bank ?statement|account ?statement|transaction ?listing|proof ?of ?payment|standard ?bank|rmb|fnb|absa|nedbank|capitec|discovery ?bank)\b/],
  ['Tax', /\b(sars|irp ?5|it3|\bvat\b|efiling|paye|tax)\b/],
  ['Insurance', /\b(insurance|policy|policies|premium|underwrit|dotsure|cover ?note|short.?term)\b/],
  ['Warranties & Manuals', /\b(warrant|guarantee|user ?manual|instruction ?manual|user ?guide|spec ?sheet)\b/],
  ['Legal & Contracts', /\b(contract|agreement|affidavit|attorney|\bnda\b|power ?of ?attorney|trust ?deed|summons|subpoena|title ?deed)\b/],
];

const BY_TOPIC = [
  ['Medical & Health', /\b(medical|doctor|script|prescription|patholog|radiolog|x.?ray|dentist|dental|hospital|clinic|physio|optometr|medical ?aid|discovery ?health)\b/],
  ['School & Education', /\b(school|newsletter|report ?card|term ?[1-4]|grade ?\d|king ?david|sabje|tuition|university|matric|curriculum)\b/],
  ['Vehicle & Licensing', /\b(vehicle|licence ?disc|license ?disc|registration|natis|roadworthy|service ?plan|traffic ?fine|number ?plate|odometer|dekra)\b/],
  ['Property & Utilities', /\b(municipal|rates|levy|levies|electricity|water ?bill|lease|rental|tenant|body ?corporate|bond|utility)\b/],
  ['Travel & Bookings', /\b(flight|itinerary|boarding|booking|hotel|airbnb|airline|el ?al|flysafair|lufthansa|emirates|reservation|travel)\b/],
  ['Work & Business', /\b(vodacom|vodadealer|day ?end|dayend|staff|grievance|payroll|supplier|stock|commission|dealer)\b/],
];

export const FOLDERS = [...BY_TYPE, ...BY_TOPIC];

export const OTHER = 'Other';

/** Text a document is classified and searched on. */
export function docText(d) {
  return [d.title, d.file_name, d.summary, (d.categories || []).join(' '), d.source_module]
    .filter(Boolean).join(' ').toLowerCase();
}

/** First matching folder, or 'Other'. */
export function folderFor(d) {
  const explicit = (d.categories || []).find((c) => typeof c === 'string' && c.startsWith('doc:'));
  if (explicit) {
    const name = explicit.slice(4);
    if (FOLDERS.some(([f]) => f === name) || name === OTHER) return name;
  }
  const text = docText(d);
  for (const [name, re] of FOLDERS) if (re.test(text)) return name;
  return OTHER;
}

/**
 * Token AND search. Every whitespace-separated term must appear somewhere in
 * the document's text, so "talia shoes" narrows rather than widens. A term in
 * "quotes" must match as a phrase.
 */
export function search(docs, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return docs;
  const terms = (q.match(/"[^"]+"|\S+/g) || []).map((t) => t.replace(/^"|"$/g, '')).filter(Boolean);
  if (!terms.length) return docs;
  return docs.filter((d) => {
    const text = d._text ?? docText(d);
    return terms.every((t) => text.includes(t));
  });
}

/** Folder -> count, for the filter chips. Only folders with documents appear. */
export function folderCounts(docs) {
  const counts = new Map();
  for (const d of docs) {
    const f = d._folder ?? folderFor(d);
    counts.set(f, (counts.get(f) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** Decorate once so search and counts don't recompute per keystroke. */
export function prepare(docs) {
  for (const d of docs) { d._text = docText(d); d._folder = folderFor(d); }
  return docs;
}

/**
 * Which documents would gain a doc: tag. Never removes or replaces an existing
 * category, and skips anything already tagged.
 */
export function backfillPlan(docs) {
  return docs
    .filter((d) => !(d.categories || []).some((c) => typeof c === 'string' && c.startsWith('doc:')))
    .map((d) => ({
      id: d.id,
      title: d.title,
      folder: d._folder ?? folderFor(d),
      categories: [...(d.categories || []), 'doc:' + (d._folder ?? folderFor(d))],
    }));
}
