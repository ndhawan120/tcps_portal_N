"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function RichTextEditor({ value, onChange, placeholder = "Write your update..." }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showHtml, setShowHtml] = useState(false);

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

  const toolbarButton = (label: string, action: () => void, extra = "") => (
    <button type="button" title={label} aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={action} className={`px-2 py-1 rounded text-sm hover:bg-surface-container-lowest ${extra}`}>
      {label}
    </button>
  );

  return (
    <div className="rounded-md border border-outline-variant overflow-hidden bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b border-outline-variant bg-surface-container px-2 py-2">
        {toolbarButton("Bold", () => command("bold"), "font-bold")}
        {toolbarButton("Italic", () => command("italic"), "italic")}
        {toolbarButton("Underline", () => command("underline"), "underline")}
        {toolbarButton("Strikethrough", () => command("strikeThrough"), "line-through")}
        <span className="mx-1 h-5 w-px bg-outline-variant" />
        <select title="Text style" defaultValue="p" onChange={(e) => command("formatBlock", e.target.value)} className="text-xs border border-outline-variant rounded px-2 py-1 bg-background">
          <option value="p">Paragraph</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="blockquote">Quote</option>
        </select>
        <select title="Font size" defaultValue="3" onChange={(e) => command("fontSize", e.target.value)} className="text-xs border border-outline-variant rounded px-2 py-1 bg-background">
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">Extra large</option>
        </select>
        <span className="mx-1 h-5 w-px bg-outline-variant" />
        {toolbarButton("Bulleted list", () => command("insertUnorderedList"))}
        {toolbarButton("Numbered list", () => command("insertOrderedList"))}
        {toolbarButton("Decrease indent", () => command("outdent"))}
        {toolbarButton("Increase indent", () => command("indent"))}
        <span className="mx-1 h-5 w-px bg-outline-variant" />
        {toolbarButton("Align left", () => command("justifyLeft"))}
        {toolbarButton("Center", () => command("justifyCenter"))}
        {toolbarButton("Align right", () => command("justifyRight"))}
        <span className="mx-1 h-5 w-px bg-outline-variant" />
        {toolbarButton("Add link", addLink)}
        {toolbarButton("Add image URL", addImageUrl)}
        {toolbarButton("Upload image", () => imageInputRef.current?.click())}
        {toolbarButton("Undo", () => command("undo"))}
        {toolbarButton("Redo", () => command("redo"))}
        {toolbarButton("Clear formatting", () => command("removeFormat"), "text-xs")}
        {toolbarButton(showHtml ? "Visual editor" : "HTML", () => setShowHtml((v) => !v), "text-xs")}
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) insertImageFile(file); e.currentTarget.value = ""; }} />

      {showHtml ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} className="w-full min-h-48 p-3 text-xs font-mono bg-background outline-none" aria-label="HTML editor" />
      ) : (
        <div ref={editorRef} contentEditable suppressContentEditableWarning data-placeholder={placeholder} onInput={sync} className="min-h-48 max-h-[500px] overflow-y-auto px-4 py-3 text-sm outline-none prose prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-on-surface-variant [&_img]:max-w-full [&_img]:h-auto [&_a]:text-primary [&_blockquote]:border-l-4 [&_blockquote]:pl-3" />
      )}
      <div className="px-3 py-1.5 text-[11px] text-on-surface-variant border-t border-outline-variant">
        You can format text, add links, upload images, insert image URLs, lists, headings, quotes and alignment. Uploaded images are embedded in the announcement.
      </div>
    </div>
  );
}
