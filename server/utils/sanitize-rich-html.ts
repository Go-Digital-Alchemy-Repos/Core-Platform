import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h2",
  "h3",
  "h4",
  "a",
  "img",
];

// These are the only content properties that public renderers intentionally
// insert as HTML. Keep this list close to the public sanitization policy so a
// new HTML insertion point has to opt in explicitly.
const publicRichHtmlFieldNames = new Set([
  "answer",
  "body",
  "content",
  "html",
  "htmlContent",
  "leftBody",
  "rightBody",
  "subheading",
]);

export function sanitizePublicRichHtml(value: string | null | undefined): string | null {
  if (value == null) return null;
  return sanitizeHtml(value, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "data-align", "class"],
    },
    allowedClasses: {
      img: [
        "cms-richtext-media",
        "cms-richtext-media-left",
        "cms-richtext-media-center",
        "cms-richtext-media-right",
      ],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          ...(attribs.target === "_blank" ? { rel: "noopener noreferrer" } : {}),
        },
      }),
    },
  });
}

/**
 * Sanitizes only the explicitly supported HTML-bearing values in public CMS
 * payloads. Other data remains untouched so URLs, editor settings, and module
 * configuration retain their existing contracts.
 */
export function sanitizePublicCmsContent<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePublicCmsContent(item)) as T;
  }

  if (value === null || typeof value !== "object") return value;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      publicRichHtmlFieldNames.has(key) && typeof nestedValue === "string"
        ? sanitizePublicRichHtml(nestedValue)
        : sanitizePublicCmsContent(nestedValue),
    ]),
  ) as T;
}
