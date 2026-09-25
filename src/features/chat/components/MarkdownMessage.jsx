import { useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

function citationMarkdown(value) {
  if (typeof value !== "string") return value;

  return value.replace(
    /【([^【】\n]+?\.pdf)\s*,\s*(?:PAGE|page|Page|STR\.?|str\.?)\s*([0-9]+(?:\s*[–—-]\s*[0-9]+)?)】/g,
    (_match, filename, pages) => {
      const cleanFile = filename.trim();
      const cleanPages = pages.replace(/\s+/g, "");

      const href =
        "codarox-cite:///" +
        encodeURIComponent(cleanFile) +
        "?page=" +
        encodeURIComponent(cleanPages);

      return `[${cleanFile} · str. ${cleanPages}](${href})`;
    }
  );
}

function openPdfCitation(filename, pages) {
  const registry = window.__codaroxPdfRegistry;

  const data =
    registry instanceof Map
      ? registry.get(filename)
      : null;

  if (!data) {
    window.alert(
      `PDF "${filename}" više nije aktivno učitan u ovom razgovoru.\n\nPonovno priloži PDF kako bi se mogla otvoriti citirana stranica.`
    );
    return;
  }

  try {
    const comma = data.indexOf(",");

    if (comma === -1) {
      throw new Error("Invalid PDF data.");
    }

    const base64 = data.slice(comma + 1);
    const binary = window.atob(base64);

    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob(
      [bytes],
      { type: "application/pdf" }
    );

    const url = URL.createObjectURL(blob);

    const firstPage = String(pages)
      .split(/[–—-]/)[0]
      .trim();

    const pageNumber =
      Number.parseInt(firstPage, 10) || 1;

    window.open(
      `${url}#page=${pageNumber}`,
      "_blank",
      "noopener,noreferrer"
    );

    window.setTimeout(
      () => URL.revokeObjectURL(url),
      120000
    );
  } catch (error) {
    console.error(error);
    window.alert("PDF se trenutno ne može otvoriti.");
  }
}

function CitationLink({ href, children }) {
  if (
    typeof href === "string" &&
    href.startsWith("codarox-cite:///")
  ) {
    try {
      const url = new URL(href);

      const filename = decodeURIComponent(
        url.pathname.replace(/^\/+/, "")
      );

      const pages =
        url.searchParams.get("page") || "1";

      return (
        <button
          type="button"
          className="citation-badge"
          title={`Otvori ${filename}, str. ${pages}`}
          onClick={() =>
            openPdfCitation(filename, pages)
          }
        >
          {children}
        </button>
      );
    } catch {
      return (
        <span className="citation-badge static">
          {children}
        </span>
      );
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);

  const codeElement =
    Array.isArray(children)
      ? children[0]
      : children;

  const className =
    codeElement?.props?.className || "";

  const languageMatch =
    className.match(/language-([A-Za-z0-9_+-]+)/);

  const language =
    languageMatch?.[1]?.toUpperCase() || "CODE";

  const rawCode = String(
    codeElement?.props?.children ?? ""
  ).replace(/\n$/, "");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        1400
      );
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="code-shell">
      <div className="code-shell-header">
        <span className="code-language">
          {language}
        </span>

        <button
          type="button"
          className="code-copy"
          onClick={copyCode}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre className="code-block">
        {children}
      </pre>
    </div>
  );
}

function MarkdownTable({
  children,
  ...props
}) {
  return (
    <div className="markdown-table-wrap">
      <table {...props}>
        {children}
      </table>
    </div>
  );
}

export function MarkdownMessage({ children }) {
  const content = citationMarkdown(children);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={(url) => {
        if (
          typeof url === "string" &&
          url.startsWith("codarox-cite:///")
        ) {
          return url;
        }

        return defaultUrlTransform(url);
      }}
      components={{
        a: ({ href, children }) => (
          <CitationLink href={href}>
            {children}
          </CitationLink>
        ),

        table: ({
          children,
          ...props
        }) => (
          <MarkdownTable {...props}>
            {children}
          </MarkdownTable>
        ),

        pre: ({ children }) => (
          <CodeBlock>
            {children}
          </CodeBlock>
        ),

        code: ({
          className,
          children,
          ...props
        }) => {
          const inline =
            !className &&
            !String(children).includes("\n");

          if (inline) {
            return (
              <code
                className="inline-code"
                {...props}
              >
                {children}
              </code>
            );
          }

          return (
            <code
              className={className}
              {...props}
            >
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
