/**
 * Build a single self-contained HTML document from a project's files so it can
 * be rendered in an <iframe sandbox>. Stylesheets and scripts are inlined, so
 * the preview works with no build step and no network access.
 */
export function composePreview(
  files: { path: string; content: string }[],
  entry = "index.html",
): string {
  const byPath = new Map(files.map((f) => [f.path, f.content]));
  const html = byPath.get(entry);

  if (!html) {
    return `<!doctype html><html><body style="font-family:system-ui;background:#0b1220;color:#94a3b8;display:grid;place-items:center;height:100vh;margin:0">
      <p>No ${entry} to preview yet.</p></body></html>`;
  }

  let output = html;

  // Inline every stylesheet reference.
  output = output.replace(
    /<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi,
    (match, href: string) => {
      const css = byPath.get(href.replace(/^\.?\//, ""));
      return css ? `<style>\n${css}\n</style>` : match;
    },
  );

  // Inline every local script reference.
  output = output.replace(
    /<script[^>]+src=["']([^"']+\.js)["'][^>]*><\/script>/gi,
    (match, src: string) => {
      const js = byPath.get(src.replace(/^\.?\//, ""));
      return js ? `<script>\n${js}\n</script>` : match;
    },
  );

  return output;
}

/** Files worth showing in the editor, in a sensible order. */
export function sortFiles<T extends { path: string }>(files: T[]): T[] {
  const priority = ["index.html", "styles.css", "app.js", "README.md"];
  return [...files].sort((a, b) => {
    const ai = priority.indexOf(a.path);
    const bi = priority.indexOf(b.path);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.path.localeCompare(b.path);
  });
}
