#!/usr/bin/env python3
"""
Build the combined Vyra Herbals founder / owner PDF.

Combines:
  1. Cover page
  2. IMPROVEMENTS_AND_COMPARISON.md
  3. README.md
  4. SYSTEM_LITERACY.md
  5. Back-cover with VJ credit + contact

Renders via markdown -> HTML -> WeasyPrint -> PDF.
"""

import os
import re
import sys
from datetime import date

import markdown
from weasyprint import HTML, CSS

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "docs")
OUT_PDF = os.path.join(OUT_DIR, "Vyra-Herbals-Improvements-Report.pdf")

MD_FILES = [
    ("IMPROVEMENTS & COMPARISON REPORT", "IMPROVEMENTS_AND_COMPARISON.md"),
    ("README — REPOSITORY OVERVIEW", "README.md"),
    ("SYSTEM LITERACY — TECHNICAL PRIMER", "SYSTEM_LITERACY.md"),
]

MD_EXT = [
    "extra",           # tables, fenced code, def lists, etc.
    "sane_lists",
    "toc",
    "codehilite",
    "admonition",
]

def read_md(rel_path: str) -> str:
    with open(os.path.join(ROOT, rel_path), "r", encoding="utf-8") as fh:
        return fh.read()

def md_to_html(md_text: str) -> str:
    return markdown.markdown(md_text, extensions=MD_EXT)

def cover_html() -> str:
    return f"""
<section class="cover">
  <div class="cover-inner">
    <div class="cover-brand">VYRA HERBALS</div>
    <h1 class="cover-title">Website Improvements &amp;<br/>Comparison Report</h1>
    <p class="cover-sub">
      A founder-friendly walkthrough of what was fixed on the Vyra Herbals
      website, why it matters for organic traffic and sales, and what still
      needs to be done.
    </p>

    <div class="cover-meta">
      <div><span class="k">Prepared</span><span class="v">{date.today().strftime("%B %Y")}</span></div>
      <div><span class="k">Website</span><span class="v">vyraherbals.com</span></div>
      <div><span class="k">Codebase</span><span class="v">github.com/Kbs-sol/vyra-herbals-web</span></div>
      <div><span class="k">Deployment</span><span class="v">Vercel · India edge</span></div>
    </div>

    <div class="cover-toc">
      <div class="toc-title">Contents</div>
      <ol>
        <li>Improvements &amp; Comparison Report — the fixes, the reasoning, and the business outcomes</li>
        <li>README — high-level repository overview and admin-panel map</li>
        <li>System Literacy — the technical primer for developers</li>
      </ol>
    </div>

    <div class="cover-note">
      Built &amp; shipped by
      <a href="mailto:vijayprasadvvp@gmail.com?subject=Found%20you%20via%20vyraherbals.com&amp;body=Hi%20VJ%2C%20I%20saw%20your%20credit%20on%20https%3A%2F%2Fvyraherbals.com%20%2F%20its%20GitHub%20repo%20and%20wanted%20to%20get%20in%20touch."><b>VJ</b></a>
      &mdash; reach out at vijayprasadvvp@gmail.com if any change here needs a follow-up.
    </div>
  </div>
</section>
"""

def section_divider(title: str, index: int) -> str:
    return f"""
<section class="divider">
  <div class="divider-inner">
    <div class="divider-num">Part {index}</div>
    <div class="divider-title">{title}</div>
  </div>
</section>
"""

def back_cover_html() -> str:
    return """
<section class="cover back-cover">
  <div class="cover-inner">
    <div class="cover-brand">VYRA HERBALS</div>
    <h1 class="cover-title">End of report</h1>
    <p class="cover-sub">
      Every fix in this report is already live in the production codebase. The
      operational to-do list in Section 8 of the Improvements &amp; Comparison
      Report shows what remains — mostly dashboard toggles and content work,
      no further code changes required for the core wiring.
    </p>
    <div class="cover-toc" style="margin-top:60px;">
      <div class="toc-title">Contact</div>
      <p style="margin-top:12px;line-height:1.6;">
        This iteration was built and shipped by
        <a href="mailto:vijayprasadvvp@gmail.com?subject=Found%20you%20via%20vyraherbals.com&amp;body=Hi%20VJ%2C%20I%20saw%20your%20credit%20on%20https%3A%2F%2Fvyraherbals.com%20%2F%20its%20GitHub%20repo%20and%20wanted%20to%20get%20in%20touch."><b>VJ</b></a>.<br/>
        For extensions, bug fixes, or the next iteration &mdash;
        <a href="mailto:vijayprasadvvp@gmail.com?subject=Found%20you%20via%20vyraherbals.com">vijayprasadvvp@gmail.com</a>.<br/>
        (The mailto pre-fills a subject line with the site name so the origin of the referral is visible.)
      </p>
    </div>
  </div>
</section>
"""

def strip_first_h1(html: str) -> str:
    """Remove the first <h1> from a markdown-rendered doc since the section
    divider already announces it — avoids duplicate titles on the printed
    page."""
    return re.sub(r"<h1[^>]*>.*?</h1>", "", html, count=1, flags=re.DOTALL)

def build_html() -> str:
    parts = [cover_html()]
    for i, (title, rel) in enumerate(MD_FILES, start=1):
        parts.append(section_divider(title, i))
        html = md_to_html(read_md(rel))
        parts.append(f'<article class="doc">{strip_first_h1(html)}</article>')
    parts.append(back_cover_html())
    body = "\n".join(parts)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Vyra Herbals — Improvements Report</title>
</head>
<body>
{body}
</body>
</html>"""

CSS_TEXT = """
@page {
  size: A4;
  margin: 22mm 18mm 22mm 18mm;
  @top-left {
    content: "Vyra Herbals — Improvements Report";
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif;
    font-size: 8.5pt;
    color: #94a3b8;
  }
  @top-right {
    content: "vyraherbals.com";
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif;
    font-size: 8.5pt;
    color: #94a3b8;
  }
  @bottom-center {
    content: counter(page) " / " counter(pages);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif;
    font-size: 8.5pt;
    color: #94a3b8;
  }
}
@page cover {
  margin: 0;
  @top-left  { content: ""; }
  @top-right { content: ""; }
  @bottom-center { content: ""; }
}

html, body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif;
  font-size: 10.5pt;
  line-height: 1.55;
  color: #0f172a;
  background: #ffffff;
}

/* ---------- Cover ---------- */
section.cover {
  page: cover;
  page-break-after: always;
  height: 100vh;
  min-height: 297mm;
  color: #ffffff;
  background:
    radial-gradient(1200px 800px at 100% 0%, rgba(255,255,255,0.08), rgba(0,0,0,0)),
    radial-gradient(900px 700px at 0% 100%, rgba(255,255,255,0.06), rgba(0,0,0,0)),
    linear-gradient(140deg, #0f4436 0%, #1a6b45 40%, #2d7a3a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
section.cover .cover-inner {
  padding: 48mm 22mm;
  max-width: 170mm;
}
.cover-brand {
  font-size: 11pt;
  letter-spacing: 6px;
  color: #a7f3d0;
  margin-bottom: 30mm;
  font-weight: 600;
}
.cover-title {
  font-size: 32pt;
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: -0.5pt;
  color: #ffffff;
  margin: 0 0 10mm 0;
}
.cover-sub {
  font-size: 12pt;
  line-height: 1.6;
  color: #d1fae5;
  max-width: 140mm;
  margin: 0 0 24mm 0;
}
.cover-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6mm 12mm;
  margin-bottom: 20mm;
}
.cover-meta > div {
  display: flex;
  flex-direction: column;
  gap: 1mm;
}
.cover-meta .k {
  font-size: 8pt;
  letter-spacing: 2px;
  color: #6ee7b7;
  text-transform: uppercase;
}
.cover-meta .v {
  font-size: 11pt;
  color: #ffffff;
}
.cover-toc {
  border-top: 1px solid rgba(255,255,255,0.15);
  padding-top: 8mm;
  color: #d1fae5;
}
.toc-title {
  font-size: 9pt;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #6ee7b7;
  margin-bottom: 4mm;
}
.cover-toc ol {
  padding-left: 5mm;
  margin: 0;
}
.cover-toc li {
  padding: 2mm 0;
  line-height: 1.4;
  color: #ecfdf5;
  font-size: 10.5pt;
}
.cover-note {
  margin-top: 14mm;
  color: #a7f3d0;
  font-size: 9.5pt;
}
.cover-note a {
  color: #ffffff;
  text-decoration: none;
  border-bottom: 1px solid rgba(255,255,255,0.4);
}
section.back-cover {
  background:
    radial-gradient(1200px 800px at 0% 0%, rgba(255,255,255,0.06), rgba(0,0,0,0)),
    linear-gradient(140deg, #0f172a 0%, #1e293b 60%, #0f4436 100%);
}

/* ---------- Part divider ---------- */
section.divider {
  page-break-before: always;
  page-break-after: always;
  height: 260mm;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 20mm 2mm;
}
section.divider .divider-inner {
  border-left: 6px solid #10b981;
  padding: 6mm 0 6mm 10mm;
}
.divider-num {
  font-size: 10pt;
  letter-spacing: 5px;
  color: #10b981;
  margin-bottom: 4mm;
  text-transform: uppercase;
}
.divider-title {
  font-size: 24pt;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
  letter-spacing: -0.3pt;
  max-width: 150mm;
}

/* ---------- Article ---------- */
article.doc {
  page-break-before: always;
}
article.doc h1,
article.doc h2,
article.doc h3,
article.doc h4 {
  color: #0f172a;
  font-weight: 700;
  line-height: 1.25;
  page-break-after: avoid;
}
article.doc h1 { font-size: 18pt; margin: 6mm 0 4mm; }
article.doc h2 {
  font-size: 14pt;
  margin: 8mm 0 3mm;
  padding-bottom: 2mm;
  border-bottom: 1px solid #e5e7eb;
}
article.doc h3 { font-size: 12pt; margin: 6mm 0 2mm; color: #059669; }
article.doc h4 { font-size: 10.5pt; margin: 4mm 0 1mm; color: #334155; }
article.doc p { margin: 2mm 0; }
article.doc ul, article.doc ol { margin: 2mm 0 2mm 8mm; padding: 0; }
article.doc li { margin: 1mm 0; }
article.doc blockquote {
  margin: 3mm 0;
  padding: 3mm 5mm;
  background: #f0fdf4;
  border-left: 3px solid #10b981;
  color: #065f46;
  font-size: 10pt;
}
article.doc code {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 9pt;
  background: #f1f5f9;
  color: #0f172a;
  padding: 0.5mm 1.5mm;
  border-radius: 2mm;
}
article.doc pre {
  background: #0f172a;
  color: #e2e8f0;
  padding: 4mm 5mm;
  border-radius: 3mm;
  font-size: 8.5pt;
  line-height: 1.4;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  page-break-inside: avoid;
}
article.doc pre code {
  background: transparent;
  color: inherit;
  padding: 0;
}
article.doc a {
  color: #059669;
  text-decoration: none;
  word-wrap: break-word;
}
article.doc a:hover { text-decoration: underline; }

/* Tables */
article.doc table {
  width: 100%;
  border-collapse: collapse;
  margin: 4mm 0;
  font-size: 9pt;
  page-break-inside: avoid;
}
article.doc th, article.doc td {
  padding: 2.5mm 3mm;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: top;
}
article.doc th {
  background: #f8fafc;
  color: #334155;
  font-weight: 600;
  border-bottom: 2px solid #cbd5e1;
}
article.doc tr:nth-child(even) td { background: #fafafa; }

/* Horizontal rule */
article.doc hr {
  border: 0;
  border-top: 1px solid #e5e7eb;
  margin: 6mm 0;
}
"""

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    html_str = build_html()
    HTML(string=html_str, base_url=ROOT).write_pdf(
        OUT_PDF,
        stylesheets=[CSS(string=CSS_TEXT)],
    )
    size = os.path.getsize(OUT_PDF) / 1024
    print(f"PDF written: {OUT_PDF} ({size:.1f} KB)")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[build_pdf] ERROR: {e}", file=sys.stderr)
        raise
