// One-time backfill: shrinks photos uploaded before the app started
// resizing them on the device (src/lib/image.ts). Those went up at full
// camera size - often 1-4 MB for a face shown at 48px - with no-cache
// headers, which is what made worker lists crawl.
//
// Each oversized avatar, cover and certificate image is resized to the
// same limits the app now uses, re-uploaded as WebP under a new path with
// a one-year cache header, and the row is pointed at it. The original file
// is left in storage untouched, so nothing is lost if a result looks wrong.
//
// Needs the service_role key (it rewrites other members' rows), read from
// the environment only - never commit it:
//
//   SUPABASE_SERVICE_ROLE_KEY=... node --env-file=.env.local scripts/shrink-existing-photos.mjs
//   SUPABASE_SERVICE_ROLE_KEY=... node --env-file=.env.local scripts/shrink-existing-photos.mjs --apply
//
// Without --apply it only reports what it would change.

import sharp from "sharp";

const URL_BASE = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes("--apply");
// Already small enough - re-encoding would gain nothing worth the churn.
const SKIP_UNDER_BYTES = 150 * 1024;
// Same longest-side limits as IMAGE_MAX_SIDE in src/lib/image.ts.
const MAX_SIDE = { avatars: 512, covers: 1600, certificates: 2000 };

if (!URL_BASE || !KEY) {
  console.error("Set VITE_SUPABASE_URL (from .env.local) and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const PUBLIC_PREFIX = `${URL_BASE}/storage/v1/object/public/`;

async function rest(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

/** "…/object/public/avatars/<uid>/avatar-1.jpg" -> { bucket, folder, name } */
function parseStorageUrl(url) {
  if (!url?.startsWith(PUBLIC_PREFIX)) return null;
  const [bucket, ...rest] = decodeURIComponent(url.slice(PUBLIC_PREFIX.length).split("?")[0]).split("/");
  if (!(bucket in MAX_SIDE) || rest.length < 2) return null;
  return { bucket, folder: rest[0], name: rest.at(-1) };
}

/** Returns the new public URL, or null when the photo is fine as it is. */
async function shrink(url, kind) {
  const loc = parseStorageUrl(url);
  if (!loc) return null;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  skip (download ${res.status}): ${url}`);
    return null;
  }
  const original = Buffer.from(await res.arrayBuffer());
  if (original.length < SKIP_UNDER_BYTES) return null;

  const max = MAX_SIDE[loc.bucket];
  const output = await sharp(original)
    .rotate() // honour the camera's EXIF orientation before it's stripped
    .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  if (output.length >= original.length) return null;

  const kb = (n) => `${Math.round(n / 1024)} KB`;
  console.log(`  ${kind}: ${kb(original.length)} -> ${kb(output.length)}  ${loc.folder}/${loc.name}`);
  if (!APPLY) return null;

  const path = `${loc.folder}/${kind}-${Date.now()}.webp`;
  const up = await fetch(`${URL_BASE}/storage/v1/object/${loc.bucket}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "image/webp", "cache-control": "max-age=31536000" },
    body: output,
  });
  if (!up.ok) throw new Error(`upload ${loc.bucket}/${path}: ${up.status} ${await up.text()}`);
  return `${PUBLIC_PREFIX}${loc.bucket}/${path}`;
}

let before = 0;
let changed = 0;

const profiles = await rest("profiles?select=id,avatar_url,cover_url&or=(avatar_url.not.is.null,cover_url.not.is.null)");
console.log(`${profiles.length} profiles with photos${APPLY ? "" : " (dry run - add --apply to write)"}`);
for (const p of profiles) {
  const patch = {};
  for (const [field, kind] of [
    ["avatar_url", "avatar"],
    ["cover_url", "cover"],
  ]) {
    if (!p[field]) continue;
    before++;
    try {
      const next = await shrink(p[field], kind);
      if (next) patch[field] = next;
    } catch (error) {
      console.warn(`  failed ${kind} for ${p.id}: ${error.message}`);
    }
  }
  if (Object.keys(patch).length > 0) {
    await rest(`profiles?id=eq.${p.id}`, { method: "PATCH", body: JSON.stringify(patch) });
    changed += Object.keys(patch).length;
  }
}

const certs = await rest("certificates?select=id,file_url,file_type&file_type=like.image/*");
console.log(`${certs.length} certificate images`);
for (const c of certs) {
  before++;
  try {
    const next = await shrink(c.file_url, "cert");
    if (next) {
      await rest(`certificates?id=eq.${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ file_url: next, file_type: "image/webp" }),
      });
      changed++;
    }
  } catch (error) {
    console.warn(`  failed certificate ${c.id}: ${error.message}`);
  }
}

console.log(APPLY ? `Done: ${changed} of ${before} photos replaced.` : `Dry run: checked ${before} photos.`);
