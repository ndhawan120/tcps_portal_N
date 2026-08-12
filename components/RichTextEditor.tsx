"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inlineMarkdown(value: string) {
  let text = escapeHtml(value);
  const links: string[] = [];
  text = text.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, (_, alt, url) => {
    const token = `@@IMAGE${links.length}@@`;
    links.push(`<img src="${url}" alt="${alt}" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0" />`);
    return token;
  });
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  text = text.replace(/~~([^~]+)~~/g, "<s>$1</s>");
  text = text.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  text = text.replace(/_([^_\n]+)_/g, "<em>$1</em>");
  links.forEach((html, index) => {
    text = text.replace(`@@IMAGE${index}@@`, html);
  });
  return text;
}

function markdownToHtml(markdown: string) {
  const normalized = markdown.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return "";

  const lines = normalized.split("\n");
  const output: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${inlineMarkdown(paragraph.join(" ").trim())}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (listType) {
      output.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(6, heading[1].length);
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const quote = trimmed.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeList();
      output.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const nextType = unordered ? "ul" : "ol";
      if (listType !== nextType) {
        closeList();
        listType = nextType;
        output.push(`<${listType}>`);
      }
      output.push(`<li>${inlineMarkdown((unordered ?? ordered)![1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();
  return output.join("");
}

function looksLikeMarkdown(text: string) {
  return /(^|\n)\s{0,3}#{1,6}\s+|(^|\n)\s*[-*+]\s+|(^|\n)\s*\d+[.)]\s+|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)]+\)/m.test(text);
}

function previewHtml(html: string) {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  const allowed = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "S", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "A", "IMG"]);

  doc.body.querySelectorAll("*").forEach((el) => {
    if (!allowed.has(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
      return;
    }

    Array.from(el.attributes).forEach((attr) => {
      if (el.tagName === "A" && attr.name === "href" && /^https?:\/\//i.test(attr.value)) return;
      if (el.tagName === "IMG" && ["src", "alt", "width", "height", "style"].includes(attr.name)) return;
      el.removeAttribute(attr.name);
    });

    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }

    if (el.tagName === "IMG") {
      const src = el.getAttribute("src") || "";
      if (!src.startsWith("https://") && !src.startsWith("http://") && !src.startsWith("data:image/")) el.remove();
    }
  });

  return doc.body.innerHTML;
}

export default function RichTextEditor({ value, onChange, placeholder = "Write your update..." }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showHtml, setShowHtml] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value || "";
  }, [value]);

  const sync = () => onChange(editorRef.current?.innerHTML ?? "");

  const command = (name: string, valueArg?: string) => {
    editorRef.current?.focus();
    document.execCommand(name, false, valueArg);
    sync();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const plain = event.clipboardData.getData("text/plain");
    const html = event.clipboardData.getData("text/html");

    // Keep genuinely rich website content when the clipboard supplies HTML.
    // If the clipboard only supplies Markdown/plain text, convert it to HTML.
    if (html && !looksLikeMarkdown(plain)) return;

    if (!plain) return;
    event.preventDefault();
    const converted = markdownToHtml(plain);
    document.execCommand("insertHTML", false, converted);
    sync();
  };

  const addLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    const safeUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    command("createLink", safeUrl);
  };

  const addImageUrl = () => {
    const url = window.prompt("Enter image URL");
    if (!url || !/^https?:\/\//i.test(url)) return;
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, `<img src="${url.replace(/\"/g, "&quot;")}" alt="Announcement image" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0" />`);
    sync();
  };

  const insertImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) {
      window.alert("Please choose an image smaller than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      editorRef.current?.focus();
      document.execCommand("insertHTML", false, `<img src="${String(reader.result).replace(/\"/g, "&quot;")}" alt="Announcement image" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0" />`);
      sync();
    };
    reader.readAsDataURL(file);
  };

  const button = (label: string, action: () => void, icon: string, extra = "") => (
    <button type="button" title={label} aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={action} className={`inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md border border-outline-variant bg-background px-2 text-xs font-semibold text-on-surface shadow-sm transition hover:bg-surface-container hover:border-primary/40 active:translate-y-px ${extra}`}>
      <span className="text-sm leading-none">{icon}</span><span className="hidden xl:inline">{label}</span>
    </button>
  );

  const divider = <span className="mx-0.5 h-6 w-px bg-outline-variant" />;
  const renderedPreview = previewHtml(value);

  return (
    <div className="rounded-lg border border-outline-variant overflow-hidden bg-background shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-outline-variant bg-surface-container p-2">
        {button("Bold", () => command("bold"), "B", "font-bold")}
        {button("Italic", () => command("italic"), "I", "italic")}
        {button("Underline", () => command("underline"), "U", "underline")}
        {button("Strikethrough", () => command("strikeThrough"), "S", "line-through")}
        {divider}
        <select title="Text style" defaultValue="p" onChange={(e) => command("formatBlock", e.target.value)} className="h-8 rounded-md border border-outline-variant bg-background px-2 text-xs font-semibold text-on-surface shadow-sm hover:bg-surface-container">
          <option value="p">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="h4">Heading 4</option><option value="blockquote">Quote</option>
        </select>
        <select title="Font size" defaultValue="3" onChange={(e) => command("fontSize", e.target.value)} className="h-8 rounded-md border border-outline-variant bg-background px-2 text-xs font-semibold text-on-surface shadow-sm hover:bg-surface-container">
          <option value="2">Small</option><option value="3">Normal</option><option value="4">Large</option><option value="5">Extra large</option>
        </select>
        {divider}
        {button("Bulleted list", () => command("insertUnorderedList"), "•")}
        {button("Numbered list", () => command("insertOrderedList"), "1.")}
        {button("Decrease indent", () => command("outdent"), "←")}
        {button("Increase indent", () => command("indent"), "→")}
        {divider}
        {button("Align left", () => command("justifyLeft"), "≡")}{button("Center", () => command("justifyCenter"), "≡")}{button("Align right", () => command("justifyRight"), "≡")}
        {divider}
        {button("Add link", addLink, "🔗")}{button("Image URL", addImageUrl, "🖼")}{button("Upload image", () => imageInputRef.current?.click(), "⬆")}
        {divider}
        {button("Undo", () => command("undo"), "↶")}{button("Redo", () => command("redo"), "↷")}{button("Clear formatting", () => command("removeFormat"), "Tx")}
        {button(showPreview ? "Hide preview" : "Live preview", () => setShowPreview((v) => !v), showPreview ? "◀" : "▶", "ml-auto")}
        {button(showHtml ? "Visual editor" : "HTML", () => setShowHtml((v) => !v), "<>")}
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) insertImageFile(file); e.currentTarget.value = ""; }} />

      <div className={showPreview ? "grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-outline-variant" : "block"}>
        <div>
          <div className="px-3 py-2 border-b border-outline-variant bg-surface-container/40 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">Editor</div>
          {showHtml ? <textarea value={value} onChange={(e) => onChange(e.target.value)} className="w-full min-h-52 max-h-[500px] p-4 text-xs font-mono bg-background outline-none resize-y" aria-label="HTML editor" /> : <div ref={editorRef} contentEditable suppressContentEditableWarning data-placeholder={placeholder} onInput={sync} onPaste={handlePaste} className="min-h-52 max-h-[500px] overflow-y-auto px-4 py-3 text-sm outline-none prose prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-on-surface-variant [&_img]:max-w-full [&_img]:h-auto [&_a]:text-primary [&_blockquote]:border-l-4 [&_blockquote]:pl-3" />}
        </div>

        {showPreview && <div className="bg-background">
          <div className="flex items-center justify-between px-3 py-2 border-b border-outline-variant bg-surface-container/40"><span className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">Live preview</span><span className="text-[10px] text-on-surface-variant">Updates as you type</span></div>
          <div className="min-h-52 max-h-[500px] overflow-y-auto px-4 py-3 prose prose-sm max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-2 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-3 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-3" dangerouslySetInnerHTML={{ __html: renderedPreview || `<p class="text-on-surface-variant">${placeholder}</p>` }} />
        </div>}
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-2 text-[11px] text-on-surface-variant border-t border-outline-variant bg-surface-container/40"><span>Rich formatting, Markdown paste, links, lists, headings and images.</span><span>Live preview • Image limit: 2 MB</span></div>
    </div>
  );
}
