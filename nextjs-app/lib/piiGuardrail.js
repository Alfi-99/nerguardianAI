// lib/piiGuardrail.js

const PII_PATTERNS = [
  {
    label: 'NIK',
    regex: /\b[0-9]{16}\b/g,
    replacement: '[REDACT_NIK]',
  },
  {
    label: 'EMAIL',
    regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    replacement: '[REDACT_EMAIL]',
  },
  {
    label: 'PHONE',
    // Menangani format: +628xx, 628xx, 08xx dengan spasi/strip opsional dan digit pendek/panjang
    regex: /(?:\+62|62|0)[\s-]*8[0-9]{1,2}(?:[\s-]*[0-9]){5,11}\b/g,
    replacement: '[REDACT_PHONE]',
  },
];

/**
 * Meredaksi PII berbasis regex dari teks input.
 * @param {string} text
 * @returns {{ redactedText: string, found: string[] }}
 */
function applyRegexGuardrail(text) {
  let redactedText = text;
  const found = [];

  for (const pattern of PII_PATTERNS) {
    const matches = text.match(pattern.regex);
    if (matches) {
      found.push(...matches.map((m) => `${pattern.label}: ${m}`));
      redactedText = redactedText.replace(pattern.regex, pattern.replacement);
    }
  }

  return { redactedText, found };
}

module.exports = { applyRegexGuardrail };
