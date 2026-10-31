import { useSyncExternalStore } from "react";

/**
 * Where the sun is over Pokhara - the place the profile covers show - at a
 * given wall-clock time. The time is read as the viewer's own clock but
 * worked out as if it were Nepal time, so noon on their clock is always
 * the middle of the day on the cover and midnight the middle of the night,
 * while sunrise and sunset still move with the seasons.
 */

const LAT = 28.21;
const LON = 83.99;
/** Nepal Time, UTC+5:45. */
const TZ_HOURS = 5.75;

const RAD = Math.PI / 180;

export interface SunPosition {
  /** Degrees above the horizon (negative when it has set). */
  elevation: number;
  /** Degrees from solar noon: negative in the morning, positive after. */
  hourAngle: number;
}

/** The NOAA solar position formulas, good to well under a degree. */
export function sunAt(date: Date): SunPosition {
  const start = new Date(date.getFullYear(), 0, 1);
  const day = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  const minutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  const g = ((2 * Math.PI) / 365) * (day + (minutes / 60 - 12) / 24);

  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);

  const solarMinutes = minutes + eqTime + 4 * LON - 60 * TZ_HOURS;
  let hourAngle = solarMinutes / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;
  if (hourAngle > 180) hourAngle -= 360;

  const cosZenith =
    Math.sin(LAT * RAD) * Math.sin(decl) + Math.cos(LAT * RAD) * Math.cos(decl) * Math.cos(hourAngle * RAD);
  const elevation = 90 - Math.acos(Math.min(1, Math.max(-1, cosZenith))) / RAD;
  return { elevation, hourAngle };
}

/**
 * The time now, changing on the minute. Every cover on the page shares the
 * one timer, which runs only while something is watching it.
 */
let now = new Date();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function tick() {
  now = new Date();
  listeners.forEach((l) => l());
  timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
}

function onVisible() {
  if (document.visibilityState === "visible") {
    clearTimeout(timer);
    tick();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    tick();
    document.addEventListener("visibilitychange", onVisible);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}

export function useMinute(): Date {
  return useSyncExternalStore(subscribe, () => now);
}
