"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function previewHtml(html: string) {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  const allowed = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "S", "UL", "OL", "LI", "H2", "H3", "H4", "BLOCKQUOTE", "A", "IMG"]);

  doc.body.querySelectorAll("*").forEach((el) => {
    if (!allowed.has(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
      return;
    }

    Array.from(el.attributes).forEach((attr) => {
      if (el.tagName === "A" && attr.name === "href" && /^https?:\/\//i.test(attr.value)) return;
      if (el.tagName === "IMG" && ["src", "alt", "width", "height"].includes(attr.name)) return;
      el.removeAttribute(attr.name);
    });

    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }

    if (el.tagName === "IMG") {
      const src = el.getAttribute("src") || "";
      if (!src.startsWith("https://") && !src.startsWith("http://") && !src.startsWith("data:image/")) {
        el.remove();
      }
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

  const addLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    const safeUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    command("createLink", safeUrl);
  };

  const addImageUrl = () => {
    const url = window.prompt("Enter image URL");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      window.alert("Please enter a valid http:// or https:// image URL.");
      return;
    }
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, `<img src="${url.replace(/"/g, "&quot;")}" alt="Announcement image" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0" />`);
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
      document.execCommand("insertHTML", false, `<img src="${String(reader.result).replace(/"/g, "&quot;")}" alt="Announcement image" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0" />`);
      sync();
    };
    reader.readAsDataURL(file);
  };

  const button = (label: string, action: () => void, icon: string, extra = "") => (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
      className={`inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md border border-outline-variant bg-background px-2 text-xs font-semibold text-on-surface shadow-sm transition hover:bg-surface-container hover:border-primary/40 active:translate-y-px ${extra}`}
    >
      <span className="text-sm leading-none">{icon}</span>
      <span className="hidden xl:inline">{label}</span>
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
          <option value="p">Paragraph</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="blockquote">Quote</option>
        </select>
        <select title="Font size" defaultValue="3" onChange={(e) => command("fontSize", e.target.value)} className="h-8 rounded-md border border-outline-variant bg-background px-2 text-xs font-semibold text-on-surface shadow-sm hover:bg-surface-container">
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">Extra large</option>
        </select>
        {divider}
        {button("Bulleted list", () => command("insertUnorderedList"), "•")}
        {button("Numbered list", () => command("insertOrderedList"), "1.")}
        {button("Decrease indent", () => command("outdent"), "←")}
        {button("Increase indent", () => command("indent"), "→")}
        {divider}
        {button("Align left", () => command("justifyLeft"), "≡")}
        {button("Center", () => command("justifyCenter"), "≡")}
        {button("Align right", () => command("justifyRight"), "≡")}
        {divider}
        {button("Add link", addLink, "🔗")}
        {button("Image URL", addImageUrl, "🖼")}
        {button("Upload image", () => imageInputRef.current?.click(), "⬆")}
        {divider}
        {button("Undo", () => command("undo"), "↶")}
        {button("Redo", () => command("redo"), "↷")}
        {button("Clear formatting", () => command("removeFormat"), "Tx")}
        {button(showPreview ? "Hide preview" : "Live preview", () => setShowPreview((v) => !v), showPreview ? "◀" : "▶", "ml-auto")}
        {button(showHtml ? "Visual editor" : "HTML", () => setShowHtml((v) => !v), "<>")}
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) insertImageFile(file); e.currentTarget.value = ""; }} />

      <div className={showPreview ? "grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-outline-variant" : "block"}>
        <div>
          <div className="px-3 py-2 border-b border-outline-variant bg-surface-container/40 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
            Editor
          </div>
          {showHtml ? (
            <textarea value={value} onChange={(e) => onChange(e.target.value)} className="w-full min-h-52 max-h-[500px] p-4 text-xs font-mono bg-background outline-none resize-y" aria-label="HTML editor" />
          ) : (
            <div ref={editorRef} contentEditable suppressContentEditableWarning data-placeholder={placeholder} onInput={sync} className="min-h-52 max-h-[500px] overflow-y-auto px-4 py-3 text-sm outline-none prose prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-on-surface-variant [&_img]:max-w-full [&_img]:h-auto [&_a]:text-primary [&_blockquote]:border-l-4 [&_blockquote]:pl-3" />
          )}
        </div>

        {showPreview && (
          <div className="bg-background">
            <div className="flex items-center justify-between px-3 py-2 border-b border-outline-variant bg-surface-container/40">
              <span className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">Live preview</span>
              <span className="text-[10px] text-on-surface-variant">Updates as you type</span>
            </div>
            <div className="min-h-52 max-h-[500px] overflow-y-auto px-4 py-3 prose prose-sm max-w-none [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-3 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-3" dangerouslySetInnerHTML={{ __html: renderedPreview || `<p class=\"text-on-surface-variant\">${placeholder}</p>` }} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-2 text-[11px] text-on-surface-variant border-t border-outline-variant bg-surface-container/40">
        <span>Rich formatting, links, lists, headings and images.</span>
        <span>Live preview • Image limit: 2 MB</span>
      </div>
    </div>
  );
}
