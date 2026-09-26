// Runs after `vite build`. The app is a single-page app, so every URL used
// to get the same index.html - one title, one description, and a canonical
// pointing at the home page. This writes a copy per public page with its own
// head tags (served by Vercel's cleanUrls: /about -> about.html) and
// generates sitemap.xml from the same list in src/lib/seo-pages.json.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const { origin, pages } = JSON.parse(readFileSync(`${root}src/lib/seo-pages.json`, "utf8"));
const template = readFileSync(`${root}dist/index.html`, "utf8");

const escape = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function withMeta(html, path, { title, description }) {
  const url = `${origin}${path}`;
  const replacements = [
    [/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`],
    [/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`],
    [/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${escape(description)}$2`],
    [/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`],
    [/(<meta property="og:title" content=")[^"]*(")/, `$1${escape(title)}$2`],
    [/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${escape(description)}$2`],
    [/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escape(title)}$2`],
    [/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${escape(description)}$2`],
  ];
  for (const [pattern, value] of replacements) {
    if (!pattern.test(html)) throw new Error(`seo-build: ${pattern} not found in index.html`);
    html = html.replace(pattern, value);
  }
  return html;
}

let written = 0;
for (const [path, meta] of Object.entries(pages)) {
  const file = path === "/" ? "index.html" : `${path.slice(1)}.html`;
  writeFileSync(`${root}dist/${file}`, withMeta(template, path, meta));
  written++;
}

const today = new Date().toISOString().slice(0, 10);
const urls = Object.entries(pages)
  .map(
    ([path, { changefreq, priority }]) => `  <url>
    <loc>${origin}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
  )
  .join("\n");
writeFileSync(
  `${root}dist/sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
);

console.log(`seo-build: ${written} pages + sitemap.xml (${origin})`);
