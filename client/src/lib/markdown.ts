function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();

  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return trimmed;
  }

  return null;
}

function applyInlineMarkdown(value: string) {
  let html = escapeHtml(value);

  html = html.replace(/`([^`]+)`/g, (_match, code) => `<code>${code}</code>`);
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    const safeUrl = normalizeUrl(url);
    if (!safeUrl) {
      return label;
    }

    const external = /^https?:/i.test(safeUrl);
    return `<a href="${escapeAttribute(safeUrl)}"${external ? ' target="_blank" rel="noreferrer"' : ""}>${label}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  html = html.replace(/(^|[^_])_([^_]+)_(?!_)/g, "$1<em>$2</em>");

  return html;
}

export function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];

  let paragraphLines: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let codeFence = false;
  let codeLines: string[] = [];

  const closeParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    html.push(`<p>${applyInlineMarkdown(paragraphLines.join(" "))}</p>`);
    paragraphLines = [];
  };

  const closeList = () => {
    if (!listType) {
      return;
    }

    html.push(`</${listType}>`);
    listType = null;
  };

  const closeCodeFence = () => {
    if (!codeFence) {
      return;
    }

    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeFence = false;
    codeLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (codeFence) {
      if (trimmed.startsWith("```")) {
        closeCodeFence();
      } else {
        codeLines.push(line);
      }
      continue;
    }

    if (!trimmed) {
      closeParagraph();
      closeList();
      continue;
    }

    if (trimmed.startsWith("```")) {
      closeParagraph();
      closeList();
      codeFence = true;
      codeLines = [];
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeParagraph();
      closeList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${applyInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeParagraph();
      closeList();
      html.push("<hr />");
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      closeParagraph();
      if (listType !== "ol") {
        closeList();
        listType = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${applyInlineMarkdown(orderedMatch[1])}</li>`);
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (unorderedMatch) {
      closeParagraph();
      if (listType !== "ul") {
        closeList();
        listType = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${applyInlineMarkdown(unorderedMatch[1])}</li>`);
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      closeParagraph();
      closeList();
      html.push(`<blockquote><p>${applyInlineMarkdown(quoteMatch[1])}</p></blockquote>`);
      continue;
    }

    paragraphLines.push(trimmed);
  }

  closeParagraph();
  closeList();
  closeCodeFence();

  return html.join("\n");
}

export function markdownToExcerpt(markdown: string, maxLength = 140) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[#>*_\-\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}
