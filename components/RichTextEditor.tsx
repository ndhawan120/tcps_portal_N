"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function RichTextEditor({ value, onChange, placeholder = "Write your update..." }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const command = (name: string, valueArg?: string) => {
    editorRef.current?.focus();
    document.execCommand(name, false, valueArg);
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const addLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    const safeUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    command("createLink", safeUrl);
  };

  return (
    <div className="rounded-md border border-outline-variant overflow-hidden bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b border-outline-variant bg-surface-container px-2 py-1.5">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => command("bold")} className="px-2 py-1 rounded text-sm font-bold hover:bg-surface-container-lowest">B</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => command("italic")} className="px-2 py-1 rounded text-sm italic hover:bg-surface-container-lowest">I</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => command("underline")} className="px-2 py-1 rounded text-sm underline hover:bg-surface-container-lowest">U</button>
        <span className="mx-1 h-5 w-px bg-outline-variant" />
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => command("formatBlock", "h3")} className="px-2 py-1 rounded text-xs font-semibold hover:bg-surface-container-lowest">H</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => command("insertUnorderedList")} className="px-2 py-1 rounded text-sm hover:bg-surface-container-lowest">• List</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => command("insertOrderedList")} className="px-2 py-1 rounded text-sm hover:bg-surface-container-lowest">1. List</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={addLink} className="px-2 py-1 rounded text-sm hover:bg-surface-container-lowest">Link</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => command("removeFormat")} className="px-2 py-1 rounded text-xs hover:bg-surface-container-lowest">Clear</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="min-h-32 max-h-80 overflow-y-auto px-3 py-2 text-sm outline-none prose prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-on-surface-variant"
      />
    </div>
  );
}
