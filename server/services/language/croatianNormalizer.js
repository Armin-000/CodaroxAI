export function extractLastUserText(messages = []) {
  const message = [...(Array.isArray(messages) ? messages : [])].reverse().find((item) => item?.role === "user");
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .filter((part) => part?.type === "text" && typeof part?.text === "string")
      .map((part) => part.text)
      .join(" ");
  }
  return "";
}

export function shouldNormalizeCroatian(body, text) {
  const configured = String(body?.settings?.language || body?.language || "").toLowerCase();
  if (["hr", "hr-hr", "croatian", "hrvatski"].includes(configured)) return true;
  if (["en", "en-us", "en-gb", "english"].includes(configured)) return false;
  return /\b(što|sta|šta|zašto|zasto|kako|možeš|mozes|zanima|objasni|hrvatsk|pozdrav|bok|hvala|treba|želim|zelim|znači|znaci|ovdje|ovako|da li|je li|mogu|može|moze)\b/i.test(String(text || "").toLowerCase());
}

function preserveCase(original, replacement) {
  if (!original) return replacement;
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

const RULES = [
  [/\bkomponentno arhitektura\b/gi, "komponentna arhitektura"],
  [/\b(?:debagovanju|debugovanju) aplikacije\b/gi, "otklanjanju pogrešaka u aplikaciji"],
  [/\b(?:debagovanje|debugovanje) aplikacije\b/gi, "otklanjanje pogrešaka u aplikaciji"],
  [/\b(?:debagovanju|debugovanju)\b/gi, "otklanjanju pogrešaka"],
  [/\b(?:debagovanje|debugovanje)\b/gi, "otklanjanje pogrešaka"],
  [/\bsmernice\b/gi, "smjernice"],
  [/\bprilogi\b/gi, "prilozi"],
  [/\bspasavanje\b/gi, "spašavanje"],
  [/\b(?:kurseva|kursova)\b/gi, "tečajeva"],
  [/\bkursa\b/gi, "tečaja"],
  [/\bkurs\b/gi, "tečaj"],
  [/\buporediti\b/gi, "usporediti"],
  [/\buporedba\b/gi, "usporedba"],
  [/\bupoređivati\b/gi, "uspoređivati"],
  [/\brazvojaca\b/gi, "programera"],
  [/\bskilova\b/gi, "vještina"],
  [/\binterfejsa\b/gi, "sučelja"],
  [/\binterfejs\b/gi, "sučelje"],
  [/\bšta\b/gi, "što"],
  [/\bdozvala da\b/gi, "omogućuje da"],
  [/\bdozvoljava da\b/gi, "omogućuje da"],
  [/\bšto ga čari\b/gi, "što ga čini"],
  [/\bodličnu performansu\b/gi, "dobre performanse"],
  [/\bpojedini dijelove\b/gi, "pojedini dijelovi"],
];

export function normalizeCroatianResponse(value, { stripGreeting = false, stripGenericEnding = true } = {}) {
  let text = String(value || "");
  if (!text.trim()) return text;

  if (stripGreeting) {
    text = text
      .replace(/^\s*(?:Pozdrav|Bok|Hej)[^\n]*(?:\n\s*\n|\n|$)/i, "")
      .replace(/^\s*Drago mi je[^.\n!?]*[.!?]+\s*/i, "");
  }

  text = text.split(/(```[\s\S]*?```)/g).map((chunk) => {
    if (chunk.startsWith("```")) return chunk;
    let normalized = chunk;
    for (const [pattern, replacement] of RULES) {
      normalized = normalized.replace(pattern, (match) => preserveCase(match, replacement));
    }
    return normalized;
  }).join("");

  if (stripGenericEnding) {
    text = text.replace(/\n{2,}(?:Ako te zanima|Ako vas zanima|Ako želiš|Ako želite|Slobodno pitaj|Slobodno se javi)[\s\S]{0,400}$/i, "");
  }

  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
