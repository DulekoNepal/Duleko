// Runs after `vite build`. The app is a single-page app, so every URL used
// to get the same index.html - one title, one description, a canonical
// pointing at the home page, and an empty <div id="root">. This writes a copy
// per public page (served by Vercel's cleanUrls: /about -> about.html) with:
//   - its own title, description, keywords, canonical and social tags
//   - JSON-LD: the organization and its founder, the site, the app, the
//     page itself and its breadcrumb
//   - the page's text as plain HTML inside #root, for crawlers and link
//     previews that don't run JS (React replaces it on first render)
// and generates sitemap.xml (with the team photos as image entries) into
// dist and public/, so the committed copy always matches what's deployed.
// Bump a page's "lastmod" in seo-pages.json when its content changes.
//
// Titles/descriptions: src/lib/seo-pages.json. Everything else: seo-content.mjs.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { breadcrumbNames, content, features, organization, skills, team } from "./seo-content.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = `${root}dist`;
const { origin, pages } = JSON.parse(readFileSync(`${root}src/lib/seo-pages.json`, "utf8"));
const template = readFileSync(`${dist}/index.html`, "utf8");

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const abs = (path) => `${origin}${path}`;

// Team photos are bundled by Vite with hashed names - find them in dist.
const assets = readdirSync(`${dist}/assets`);
function assetUrl(base) {
  const file = assets.find((f) => f.startsWith(`${base}-`) && /\.(png|jpe?g|webp)$/.test(f));
  if (!file) throw new Error(`seo-build: no bundled image for "${base}"`);
  return abs(`/assets/${file}`);
}
for (const m of team) {
  m.imageUrl = assetUrl(m.image);
  m.pagePath = `/about/${m.slug}`;
}
const founderAt = (path) => team.find((m) => m.pagePath === path);

const builder = team.find((m) => m.id === organization.builtBy);
const founderOf = team.find((m) => m.id === organization.founder);
const ORG_ID = `${origin}/#organization`;
const SITE_ID = `${origin}/#website`;
const APP_ID = `${origin}/#app`;
const personId = (m) => `${abs(m.pagePath)}#person`;
const LOGO = abs("/favicon.png");
const OG_IMAGE = abs("/og-image.png");

// ---------------------------------------------------------------- JSON-LD

function personLd(m) {
  return {
    "@type": "Person",
    "@id": personId(m),
    name: m.name,
    jobTitle: m.jobTitle,
    description: m.bio[0],
    image: m.imageUrl,
    url: m.url ?? abs(m.pagePath),
    mainEntityOfPage: abs(m.pagePath),
    sameAs: [...m.sameAs, abs(m.pagePath), abs(m.profilePath)],
    worksFor: { "@id": ORG_ID },
    homeLocation: { "@type": "Place", name: m.homeLocation },
    nationality: { "@type": "Country", name: "Nepal" },
    knowsAbout: m.knowsAbout,
    ...(m.affiliation.length && {
      affiliation: m.affiliation.map((name) => ({ "@type": "Organization", name })),
    }),
    ...(m.alumniOf.length && {
      alumniOf: m.alumniOf.map((name) => ({ "@type": "CollegeOrUniversity", name })),
    }),
  };
}

const organizationLd = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: organization.name,
  alternateName: organization.alternateName,
  url: abs("/"),
  logo: { "@type": "ImageObject", url: LOGO, width: 512, height: 512 },
  image: OG_IMAGE,
  description: organization.description,
  slogan: organization.slogan,
  email: organization.email,
  foundingLocation: { "@type": "Place", name: organization.foundingLocation },
  areaServed: { "@type": "Country", name: organization.areaServed },
  knowsLanguage: ["en", "ne"],
  founder: { "@id": personId(founderOf) },
  employee: team.map((m) => ({ "@id": personId(m) })),
  numberOfEmployees: { "@type": "QuantitativeValue", value: team.length },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: organization.email,
    areaServed: "NP",
    availableLanguage: organization.languages,
  },
  knowsAbout: ["Local skills marketplace", "Skilled workers in Nepal", "Local jobs", "Skill training"],
};

const websiteLd = {
  "@type": "WebSite",
  "@id": SITE_ID,
  name: organization.name,
  alternateName: organization.alternateName,
  url: abs("/"),
  description: organization.description,
  inLanguage: ["en", "ne"],
  publisher: { "@id": ORG_ID },
  creator: { "@id": personId(builder) },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${origin}/search?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

const appLd = {
  "@type": "WebApplication",
  "@id": APP_ID,
  name: organization.name,
  url: abs("/"),
  description: organization.description,
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Local services marketplace",
  operatingSystem: "Web, Android",
  browserRequirements: "Requires JavaScript",
  inLanguage: ["en", "ne"],
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "NPR" },
  featureList: features,
  screenshot: OG_IMAGE,
  image: LOGO,
  publisher: { "@id": ORG_ID },
  author: { "@id": ORG_ID },
  creator: { "@id": personId(builder) },
  countriesSupported: "NP",
};

function pageLd(path, meta) {
  const url = abs(path);
  const founder = founderAt(path);
  const type = founder
    ? "ProfilePage"
    : path === "/about"
      ? "AboutPage"
      : path === "/search"
        ? "SearchResultsPage"
        : "WebPage";
  const image = founder
    ? { "@type": "ImageObject", url: founder.imageUrl, width: founder.imageSize[0], height: founder.imageSize[1] }
    : { "@type": "ImageObject", url: OG_IMAGE, width: 1200, height: 630 };
  const graph = [
    organizationLd,
    websiteLd,
    {
      "@type": type,
      "@id": `${url}#webpage`,
      url,
      name: meta.title,
      description: meta.description,
      inLanguage: "en",
      isPartOf: { "@id": SITE_ID },
      about: { "@id": founder ? personId(founder) : ORG_ID },
      publisher: { "@id": ORG_ID },
      primaryImageOfPage: image,
      ...(path !== "/" && { breadcrumb: { "@id": `${url}#breadcrumb` } }),
      ...(path === "/about" && { mainEntity: { "@id": ORG_ID } }),
      ...(founder && { mainEntity: { "@id": personId(founder) } }),
    },
  ];
  if (path !== "/") {
    const trail = founder ? ["/about", path] : [path];
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [["/", "Home"], ...trail.map((p) => [p, breadcrumbNames[p]])].map(([p, name], i) => ({
        "@type": "ListItem",
        position: i + 1,
        name,
        item: abs(p),
      })),
    });
  }
  // The team's full profiles wherever the page shows them.
  if (founder || content[path]?.blocks.some((b) => b.team) || path === "/about") graph.push(...team.map(personLd));
  else graph.push(personLd(builder));
  if (path === "/") graph.push(appLd);
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2).replace(/</g, "\\u003c");
}

// ---------------------------------------------------------- crawlable body

function founderHtml(id) {
  const m = team.find((t) => t.id === id);
  const others = team.filter((t) => t.id !== id);
  const education = [...m.alumniOf, ...m.affiliation];
  return `<p><strong>${esc(m.jobTitle)}, Duleko</strong></p>
<img src="${m.imageUrl}" alt="${esc(m.name)}, ${esc(m.jobTitle)} of Duleko" width="240" loading="lazy">
<blockquote>"${esc(m.quote)}"</blockquote>
${m.bio.map((p) => `<p>${esc(p)}</p>`).join("\n")}
<h2>Focus areas</h2>
<ul>${m.knowsAbout.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>
${education.length ? `<h2>Education and work</h2><ul>${education.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
<p>${siteLinks(m)}</p>
<h2>The rest of the team</h2>
<p>Duleko was founded by ${esc(founderOf.name)}.</p>
<ul>${others.map((o) => `<li><a href="${o.pagePath}">${esc(o.name)}</a> - ${esc(o.jobTitle)}</li>`).join("")}</ul>
<p><a href="/about">About Duleko and the team</a></p>`;
}

const navLinks = Object.keys(pages)
  .filter((path) => !founderAt(path))
  .map((path) => [path, path === "/" ? "Home" : breadcrumbNames[path]]);

const siteLinks = (m) =>
  `<a href="${m.profilePath}">${esc(m.name)} on Duleko</a>${
    m.url ? ` · <a href="${m.url}" rel="me">${esc(m.url.replace(/^https?:\/\//, ""))}</a>` : ""
  }`;

function teamHtml() {
  return team
    .map(
      (m) => `<article id="${m.id}">
<img src="${m.imageUrl}" alt="${esc(m.name)}, ${esc(m.jobTitle)} of Duleko" width="120" loading="lazy">
<h3>${esc(m.name)}</h3>
<p><strong>${esc(m.jobTitle)}</strong></p>
<blockquote>"${esc(m.quote)}"</blockquote>
${m.bio.map((p) => `<p>${esc(p)}</p>`).join("\n")}
<p>Focus areas: ${esc(m.knowsAbout.slice(0, 3).join(", "))}.</p>
<p><a href="${m.pagePath}">Read ${esc(m.name.split(" ")[0])}'s full profile</a> · ${siteLinks(m)}</p>
</article>`,
    )
    .join("\n");
}

function blockHtml(b) {
  if (b.p) return `<p>${esc(b.p)}</p>`;
  if (b.h2) return `<h2>${esc(b.h2)}</h2>`;
  if (b.quote) return `<blockquote>${esc(b.quote)}</blockquote>`;
  if (b.ul) return `<ul>${b.ul.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  if (b.features) return `<ul>${features.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  if (b.skills)
    return Object.entries(skills)
      .map(([group, list]) => `<h3>${esc(group)}</h3><ul>${list.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`)
      .join("\n");
  if (b.team) return teamHtml();
  if (b.founder) return founderHtml(b.founder);
  throw new Error(`seo-build: unknown block ${JSON.stringify(b)}`);
}

function bodyHtml(path) {
  const page = content[path];
  if (!page) throw new Error(`seo-build: no content for ${path}`);
  return `<div id="seo-static">
<style>#seo-static{font-family:"Noto Sans",system-ui,sans-serif;max-width:48rem;margin:0 auto;padding:1.25rem 1rem 3rem;color:#0f172a;line-height:1.6}#seo-static a{color:#15803d}#seo-static nav a{margin-right:.75rem;display:inline-block}#seo-static img{border-radius:1rem;height:auto}#seo-static blockquote{margin:1rem 0;padding-left:1rem;border-left:3px solid #15803d;font-style:italic}html.native #seo-static{display:none}</style>
<header><a href="/"><strong>Duleko</strong></a> - ${esc(organization.tagline)} <span lang="ne">${esc(organization.nepaliTagline)}</span>
<nav aria-label="Website">${navLinks.map(([p, n]) => `<a href="${p}">${esc(n)}</a>`).join("")}</nav></header>
<main>
<h1>${esc(page.h1)}</h1>
${page.blocks.map(blockHtml).join("\n")}
</main>
<footer>
<p>Duleko - ${esc(organization.tagline)} Founded by ${esc(founderOf.name)}. Built by <a href="${builder.url}">${esc(builder.name)}</a>.</p>
<p>Contact: <a href="mailto:${organization.email}">${organization.email}</a> · Nepal · Made in Nepal, for Nepal.</p>
</footer>
</div>`;
}

// ------------------------------------------------------------------ pages

function setMeta(html, pattern, value) {
  if (!pattern.test(html)) throw new Error(`seo-build: ${pattern} not found in index.html`);
  return html.replace(pattern, value);
}

function render(path, meta) {
  const url = abs(path);
  let html = template;
  html = setMeta(html, /<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`);
  html = setMeta(html, /(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  html = setMeta(html, /(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${esc(meta.description)}$2`);
  html = setMeta(html, /(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);
  html = setMeta(html, /(<meta property="og:title" content=")[^"]*(")/, `$1${esc(meta.title)}$2`);
  html = setMeta(html, /(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${esc(meta.description)}$2`);
  html = setMeta(html, /(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(meta.title)}$2`);
  html = setMeta(html, /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${esc(meta.description)}$2`);
  const founder = founderAt(path);
  if (founder) {
    const alt = esc(`${founder.name}, ${founder.jobTitle} of Duleko`);
    html = setMeta(html, /(<meta property="og:image" content=")[^"]*(")/, `$1${founder.imageUrl}$2`);
    html = setMeta(html, /(<meta property="og:image:width" content=")[^"]*(")/, `$1${founder.imageSize[0]}$2`);
    html = setMeta(html, /(<meta property="og:image:height" content=")[^"]*(")/, `$1${founder.imageSize[1]}$2`);
    html = setMeta(html, /(<meta property="og:image:alt" content=")[^"]*(")/, `$1${alt}$2`);
    html = setMeta(html, /(<meta name="twitter:image" content=")[^"]*(")/, `$1${founder.imageUrl}$2`);
    html = setMeta(html, /(<meta name="twitter:image:alt" content=")[^"]*(")/, `$1${alt}$2`);
    html = setMeta(html, /(<meta property="og:type" content=")[^"]*(")/, `$1profile$2`);
  }
  html = setMeta(
    html,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n${pageLd(path, meta)}\n    </script>`,
  );
  html = setMeta(html, /<div id="root"><\/div>/, `<div id="root">${bodyHtml(path)}</div>`);
  return html;
}

for (const [path, meta] of Object.entries(pages)) {
  const file = path === "/" ? "index.html" : `${path.slice(1)}.html`;
  mkdirSync(dirname(`${dist}/${file}`), { recursive: true });
  writeFileSync(`${dist}/${file}`, render(path, meta));
}

// ---------------------------------------------------------------- sitemap

const urls = Object.entries(pages)
  .map(([path, { changefreq, priority, lastmod }]) => {
    const founder = founderAt(path);
    const images =
      path === "/about" || founder
        ? (founder ? [founder] : team)
            .map(
              (m) => `
    <image:image>
      <image:loc>${m.imageUrl}</image:loc>
    </image:image>`,
            )
            .join("")
        : `
    <image:image>
      <image:loc>${OG_IMAGE}</image:loc>
    </image:image>`;
    return `  <url>
    <loc>${abs(path)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${images}
  </url>`;
  })
  .join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`;
writeFileSync(`${dist}/sitemap.xml`, sitemap);
writeFileSync(`${root}public/sitemap.xml`, sitemap);

console.log(`seo-build: ${Object.keys(pages).length} pages + sitemap.xml (${origin})`);
