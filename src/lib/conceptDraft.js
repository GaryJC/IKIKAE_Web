export const CONCEPT_DRAFT_KEY = "ikikae.concept.motto.v1";
export const CONCEPT_MOTTO_LIMIT = 24;

function graphemes(value) {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value), ({ segment }) => segment);
  }

  // Preserve surrogate pairs and combining marks when Segmenter is unavailable.
  return Array.from(value).reduce((parts, character) => {
    const previous = parts.at(-1);
    if (previous && (/\p{Mark}|[\uFE0E\uFE0F\u200D]/u.test(character) || previous.endsWith("\u200D") || /[\u{1F3FB}-\u{1F3FF}]/u.test(character))) {
      parts[parts.length - 1] += character;
    } else {
      parts.push(character);
    }
    return parts;
  }, []);
}

export function normalizeMotto(value) {
  const singleLine = String(value ?? "").replace(/[\r\n\t]+/g, " ");
  return graphemes(singleLine).slice(0, CONCEPT_MOTTO_LIMIT).join("");
}

export function readConceptDraft() {
  try {
    if (typeof window === "undefined") return "";
    return normalizeMotto(window.sessionStorage.getItem(CONCEPT_DRAFT_KEY) ?? "");
  } catch {
    return "";
  }
}

export function writeConceptDraft(value) {
  const normalized = normalizeMotto(value);
  try {
    if (typeof window === "undefined") return false;
    window.sessionStorage.setItem(CONCEPT_DRAFT_KEY, normalized);
    return true;
  } catch {
    return false;
  }
}

export function clearConceptDraft() {
  try {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(CONCEPT_DRAFT_KEY);
  } catch {
    // A blocked session store must not turn a successful account save into an error.
  }
}
