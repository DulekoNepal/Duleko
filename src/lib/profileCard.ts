import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapPin } from "lucide-react";
import QRCode from "qrcode";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { skillIconFor } from "@/components/duleko/SkillIcon";
import { profileUrl } from "@/lib/share";
import { initials, locationShort } from "@/lib/utils";
import type { Profile, UserSkillDetail } from "@/lib/types";
import dulekoMark from "@/assets/duleko-mark.png";

// Duleko Green (brand-700 in styles.css) - the app's own official colour,
// used as the one accent here (underlines, avatar ring, QR frame,
// "duleko.com"), the same way it's the one accent everywhere else in the
// app. Headings and body text stay neutral ink/slate, same as the rest
// of the UI - green is for emphasis, not for paragraphs of it.
const BRAND = "#15803d";
const BRAND_LIGHT = "#dcfce7"; // avatar-fallback background
const BRAND_DARK = "#166534"; // avatar-fallback initials
const INK = "#0f172a"; // slate-900, headings/name
const BODY_TEXT = "#334155"; // slate-700, paragraph text
const MUTED = "#64748b"; // slate-500, captions
const HAIRLINE = "#e2e8f0"; // slate-200

const W = 1600;
const H = 1000;
const PAD = 72;
const MAX_SKILLS = 4;

/** Loads an <img> as a promise, tolerant of a failed/blocked fetch. */
function loadImage(src: string, crossOrigin?: "anonymous"): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Any lucide icon, rasterised to a small data-URI SVG image for drawing
 * on canvas. createElement, not calling Icon(props) directly - lucide
 * icons are forwardRef components under the hood, not plain functions,
 * so only going through React's own element creation renders them
 * correctly.
 */
async function loadLucideIconImage(
  Icon: React.ComponentType<Record<string, unknown>>,
  color: string,
): Promise<HTMLImageElement | null> {
  const markup = renderToStaticMarkup(createElement(Icon, { color, strokeWidth: 1.75, width: 48, height: 48 }));
  const svg = markup.startsWith("<svg")
    ? markup
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">${markup}</svg>`;
  return loadImage(`data:image/svg+xml;base64,${btoa(svg)}`);
}

/** A skill's own icon, rasterised the same way. The one hand-drawn skill
 * icon (auto rickshaw) only declares className/strokeWidth and ignores
 * the rest, which is a fine fallback (default size/colour) for that
 * one case. */
function loadSkillIconImage(skillId: string, color: string): Promise<HTMLImageElement | null> {
  return loadLucideIconImage(skillIconFor(skillId) as React.ComponentType<Record<string, unknown>>, color);
}

/** English only. A custom, free-typed skill already is; a catalogue skill uses its English name. */
function skillLabel(skill: UserSkillDetail): string {
  return skill.custom_label ?? skill.name_en;
}

function drawCircleClip(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Greedy word-wrap, capped to a number of lines with an ellipsis on the last one if cut short. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (ctx.measureText(attempt).width <= maxWidth || !current) {
      current = attempt;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);

  const remaining = words.slice(lines.join(" ").split(/\s+/).length).join(" ");
  if (remaining && lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

/**
 * Draws one person's real profile - photo, name, real skills, real "about"
 * text, the actual Duleko mark, and a QR code that opens their live
 * profile - onto an offscreen canvas, then returns it as a downloadable
 * PNG blob. Nothing here is a screenshot of the page: every element is
 * drawn fresh, so it stays crisp and correct regardless of screen size.
 *
 * The QR code is the only way this card actually opens the profile - the
 * printed text next to it is the fixed "duleko.com" brand text, never
 * the person's specific link, so the card can be handed to anyone
 * without printing a working URL that could be typed in by someone it
 * wasn't meant for.
 */
export async function renderProfileCard(profile: Profile, skills: UserSkillDetail[]): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const splitX = 1060;

  // ---- Left column: the person ----------------------------------------
  const avatarR = 108;
  const avatarCx = PAD + avatarR;
  const avatarCy = PAD + avatarR + 6;

  const avatarImg = profile.avatar_url ? await loadImage(profile.avatar_url, "anonymous") : null;
  ctx.save();
  drawCircleClip(ctx, avatarCx, avatarCy, avatarR);
  if (avatarImg) {
    // Cover-fit into the circle, same behaviour as the app's own Avatar.
    const scale = Math.max((avatarR * 2) / avatarImg.width, (avatarR * 2) / avatarImg.height);
    const dw = avatarImg.width * scale;
    const dh = avatarImg.height * scale;
    ctx.drawImage(avatarImg, avatarCx - dw / 2, avatarCy - dh / 2, dw, dh);
  } else {
    ctx.fillStyle = BRAND_LIGHT;
    ctx.fillRect(avatarCx - avatarR, avatarCy - avatarR, avatarR * 2, avatarR * 2);
    ctx.fillStyle = BRAND_DARK;
    ctx.font = "700 72px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials(profile.full_name), avatarCx, avatarCy + 4);
  }
  ctx.restore();
  ctx.strokeStyle = BRAND;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
  ctx.stroke();

  const nameX = avatarCx + avatarR + 48;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.font = "700 56px system-ui, sans-serif";
  ctx.fillText(profile.full_name, nameX, avatarCy - 4, splitX - nameX - PAD);
  ctx.strokeStyle = BRAND;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(nameX, avatarCy + 26);
  ctx.lineTo(nameX + 100, avatarCy + 26);
  ctx.stroke();

  // Where they are, the same "locality, district" format used everywhere
  // else in the app - a person's structured location, not their live GPS
  // position (that's the separate, opt-in "share my location" feature).
  const place = locationShort(profile, "en");
  if (place) {
    const pinIcon = await loadLucideIconImage(MapPin, MUTED);
    const pinY = avatarCy + 26 + 42;
    let lx = nameX;
    if (pinIcon) {
      ctx.drawImage(pinIcon, lx, pinY - 22, 24, 24);
      lx += 32;
    }
    ctx.fillStyle = MUTED;
    ctx.font = "400 26px system-ui, sans-serif";
    ctx.fillText(place, lx, pinY, splitX - lx - PAD);
  }

  let y = avatarCy + avatarR + (place ? 112 : 70);

  if (skills.length > 0) {
    ctx.fillStyle = INK;
    ctx.font = "700 32px system-ui, sans-serif";
    ctx.fillText("Can be hired as", PAD, y);
    y += 26;

    const chips = skills.slice(0, MAX_SKILLS);
    const chipIcons = await Promise.all(chips.map((s) => loadSkillIconImage(s.id, INK)));
    ctx.font = "600 26px system-ui, sans-serif";
    let cx = PAD;
    let cy = y + 20;
    const chipH = 60;
    const rightEdge = splitX - PAD;
    for (let i = 0; i < chips.length; i++) {
      const label = skillLabel(chips[i]);
      const textW = ctx.measureText(label).width;
      const iconGap = 14;
      const chipW = 28 + 34 + iconGap + textW + 28;
      if (cx + chipW > rightEdge && cx > PAD) {
        cx = PAD;
        cy += chipH + 16;
      }
      ctx.strokeStyle = HAIRLINE;
      ctx.fillStyle = "#ffffff";
      ctx.lineWidth = 2;
      roundRect(ctx, cx, cy, chipW, chipH, chipH / 2);
      ctx.fill();
      ctx.stroke();
      const icon = chipIcons[i];
      if (icon) ctx.drawImage(icon, cx + 22, cy + (chipH - 30) / 2, 30, 30);
      ctx.fillStyle = INK;
      ctx.textBaseline = "middle";
      ctx.fillText(label, cx + 22 + 34 + iconGap, cy + chipH / 2 + 1);
      ctx.textBaseline = "alphabetic";
      cx += chipW + 16;
    }
    y = cy + chipH + 56;
  }

  const about = (profile.about ?? "").trim();
  if (about) {
    ctx.fillStyle = INK;
    ctx.font = "700 32px system-ui, sans-serif";
    ctx.fillText("About Me", PAD, y);
    ctx.strokeStyle = BRAND;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(PAD, y + 16);
    ctx.lineTo(PAD + 70, y + 16);
    ctx.stroke();
    y += 56;

    ctx.fillStyle = BODY_TEXT;
    ctx.font = "400 26px system-ui, sans-serif";
    const maxLines = Math.max(2, Math.floor((H - PAD - y) / 40));
    const lines = wrapText(ctx, about, splitX - PAD * 2, Math.min(6, maxLines));
    for (const line of lines) {
      ctx.fillText(line, PAD, y);
      y += 40;
    }
  }

  // ---- Divider -----------------------------------------------------------
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(splitX, PAD);
  ctx.lineTo(splitX, H - PAD);
  ctx.stroke();

  // ---- Right column: Duleko + QR -----------------------------------------
  const rightCx = splitX + (W - splitX) / 2;
  const logoImg = await loadImage(dulekoMark);
  const logoSize = 110;
  if (logoImg) ctx.drawImage(logoImg, rightCx - logoSize / 2, PAD, logoSize, logoSize);

  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = "700 44px system-ui, sans-serif";
  ctx.fillText("Duleko", rightCx, PAD + logoSize + 54);

  ctx.fillStyle = BRAND;
  ctx.font = "700 24px system-ui, sans-serif";
  ctx.fillText("Your Skills. Our Community.", rightCx, PAD + logoSize + 92);

  const qrSize = 320;
  // Encodes the real, specific profile link - this is the only place the
  // actual link exists on the card. Nothing nearby prints it as text.
  const qrDataUrl = await QRCode.toDataURL(profileUrl(profile.public_slug), {
    margin: 0,
    width: qrSize,
    color: { dark: INK, light: "#ffffff" },
  });
  const qrImg = await loadImage(qrDataUrl);
  const qrY = PAD + logoSize + 130;
  const framePad = 20;
  ctx.strokeStyle = BRAND;
  ctx.lineWidth = 4;
  roundRect(ctx, rightCx - qrSize / 2 - framePad, qrY - framePad, qrSize + framePad * 2, qrSize + framePad * 2, 24);
  ctx.stroke();
  if (qrImg) ctx.drawImage(qrImg, rightCx - qrSize / 2, qrY, qrSize, qrSize);

  const contactY = qrY + qrSize + framePad + 56;
  ctx.fillStyle = MUTED;
  ctx.font = "400 24px system-ui, sans-serif";
  ctx.fillText("Contact me at", rightCx, contactY);
  ctx.fillStyle = BRAND;
  ctx.font = "700 32px system-ui, sans-serif";
  // Fixed brand text, not a real link - never this person's specific
  // profile URL as plain, typeable text. Scanning the QR above is the
  // one way this card actually opens it.
  ctx.fillText("duleko.com", rightCx, contactY + 42);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not render the card"))), "image/png");
  });
}

/** Triggers a real file download of the rendered card - a plain <a download>, same as any file save. */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result is "data:image/png;base64,AAAA..." - Filesystem wants
      // the raw base64 payload, not the data URL wrapper.
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the rendered card"));
    reader.readAsDataURL(blob);
  });
}

export type SaveCardResult = "downloaded" | "shared" | "cancelled";

/**
 * Saves the rendered card. The web's `<a download>` trick has no real
 * equivalent inside an Android WebView - blob-URL downloads there are
 * silently dropped, since there's no browser download manager to catch
 * them. Natively the file is written to disk via the Filesystem plugin and
 * handed to the OS share sheet instead, so "Save to Photos", "Save to
 * Files", or sending it straight to WhatsApp all fall out of the same
 * native picker someone already knows how to use.
 */
export async function saveProfileCard(blob: Blob, filename: string): Promise<SaveCardResult> {
  if (!Capacitor.isNativePlatform()) {
    downloadBlob(blob, filename);
    return "downloaded";
  }

  const base64 = await blobToBase64(blob);
  const written = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });

  try {
    await Share.share({ url: written.uri, title: filename });
    return "shared";
  } catch (err) {
    // Dismissing the share sheet is a normal outcome, not a failure.
    if (err instanceof Error && err.name === "AbortError") return "cancelled";
    throw err;
  }
}
