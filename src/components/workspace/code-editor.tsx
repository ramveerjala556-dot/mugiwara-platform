"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center gap-2 text-xs text-parchment/50">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading editor…
    </div>
  ),
});

const MONACO_LANGUAGE: Record<string, string> = {
  html: "html",
  css: "css",
  javascript: "javascript",
  json: "json",
  markdown: "markdown",
  plaintext: "plaintext",
};

/**
 * Code editor. Uses Monaco when it loads; falls back to a plain textarea if the
 * editor cannot be fetched, so editing always works.
 */
export function CodeEditor({
  value,
  language,
  path,
  onChange,
  className,
}: {
  value: string;
  language: string;
  path: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  const [monacoFailed, setMonacoFailed] = useState(false);

  useEffect(() => {
    setMonacoFailed(false);
  }, [path]);

  if (monacoFailed) {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        aria-label={`Edit ${path}`}
        className={cn(
          "h-full w-full resize-none bg-[#0b1220] p-4 font-mono text-[12.5px] leading-relaxed text-parchment focus:outline-none",
          className,
        )}
      />
    );
  }

  return (
    <div className={cn("h-full", className)}>
      <Monaco
        height="100%"
        path={path}
        language={MONACO_LANGUAGE[language] ?? "plaintext"}
        value={value}
        onChange={(next) => onChange(next ?? "")}
        onValidate={() => undefined}
        loading={
          <div className="flex h-full items-center justify-center gap-2 text-xs text-parchment/50">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading editor…
          </div>
        }
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 2,
          automaticLayout: true,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          renderLineHighlight: "line",
          padding: { top: 12 },
        }}
        onMount={(_editor, monaco) => {
          try {
            monaco.editor.defineTheme("mugiwara", {
              base: "vs-dark",
              inherit: true,
              rules: [],
              colors: {
                "editor.background": "#0b1220",
                "editor.lineHighlightBackground": "#141d31",
                "editorLineNumber.foreground": "#41506b",
              },
            });
            monaco.editor.setTheme("mugiwara");
          } catch {
            /* theme is cosmetic — ignore */
          }
        }}
      />
    </div>
  );
}
