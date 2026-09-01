// Full-sky chart on a <canvas>: stereographic projection of the hemisphere
// above the horizon, zenith at center, North up, East to the LEFT — the
// planisphere convention, correct when you hold the screen overhead.
import { STARS, CONSTELLATIONS } from "./data.js";
import { lst } from "./astro.js";
import { layoutLabels, labelFont, LABEL_PX } from "./labels.js";

const DEG = Math.PI / 180;

export const PALETTES = {
  normal: {
    sky: "#0d1224",
    horizonRing: "#3d4a6b",
    grid: "rgba(90,105,150,0.25)",
    cardinal: "#8fa0c9",
    star: "#f2f4ff",
    starName: "#c9d3f2",
    constellation: "rgba(110,140,205,0.55)",
    constellationName: "rgba(150,170,220,0.75)",
    moonDisk: "#e8e4d8",
    moonDark: "#3a3f52",
    planet: "#ffd9a0",
    planetName: "#ffcf8a",
    edgeFade: "#070a15",
    caption: "#dbe2f4",
  },
  night: {
    sky: "#0a0000",
    horizonRing: "#5c1010",
    grid: "rgba(140,20,20,0.30)",
    cardinal: "#d65050",
    star: "#ff6b6b",
    starName: "#d65050",
    constellation: "rgba(160,40,40,0.55)",
    constellationName: "#d65050",
    moonDisk: "#d05050",
    moonDark: "#300808",
    planet: "#ff8a5c",
    planetName: "#e07040",
    edgeFade: "#050000",
    caption: "#ff6b6b",
  },
};

// Extra draw alpha per label kind (the contrast test composites it).
// Labels are drawn opaque; kept as a table so a future fade is checked.
export const LABEL_ALPHA = {};

// alt/az (deg) -> unit-disk x,y. Returns null below the clip altitude.
function project(alt, az, clipAlt = -0.5) {
  if (alt < clipAlt) return null;
  const z = (90 - Math.max(alt, clipAlt)) * DEG;
  const r = Math.tan(z / 2) / Math.tan(Math.PI / 4);
  return { x: -r * Math.sin(az * DEG), y: -r * Math.cos(az * DEG) };
}

// Projects RA/Dec (deg) at one instant and place onto the canvas disc
// centred at cx,cy with radius R; null below the horizon.
export function projector({ jd, lat, lon, cx, cy, R }) {
  const localSidereal = lst(jd, lon);
  return (ra, dec) => {
    const H = localSidereal - ra;
    const sinAlt = Math.sin(lat * DEG) * Math.sin(dec * DEG) +
      Math.cos(lat * DEG) * Math.cos(dec * DEG) * Math.cos(H * DEG);
    const alt = Math.asin(sinAlt) / DEG;
    const az = (Math.atan2(
      Math.sin(H * DEG),
      Math.cos(H * DEG) * Math.sin(lat * DEG) - Math.tan(dec * DEG) * Math.cos(lat * DEG)
    ) / DEG + 180 + 360) % 360;
    const p = project(alt, az);
    return p ? { x: cx + p.x * R, y: cy + p.y * R, alt } : null;
  };
}

// Every label the chart would like to draw, ranked. Planets and the Moon
// always win; then the first-magnitude stars (what a family actually sees
// first); then the prominent constellations; then the other named stars,
// brightest first; then the second-rank constellations. layoutLabels() drops whatever
// would collide.
export function labelCandidates({ toXY, bodies, scale, dpr }) {
  const out = [];
  const lift = (px) => px * scale * dpr;
  for (const b of bodies) {
    const pt = toXY(b.ra, b.dec);
    if (!pt) continue;
    out.push({ text: b.name, kind: "body", x: pt.x, y: pt.y - lift(b.kind === "moon" ? 10 : 7),
      tier: "major", scale, dpr, priority: 100, always: true });
  }
  for (const con of CONSTELLATIONS) {
    if (con.rank > 2) continue;
    const pt = toXY(con.label[0], con.label[1]);
    if (pt && pt.alt > 12) {
      out.push({ text: con.name, kind: "constellation", x: pt.x, y: pt.y,
        tier: "minor", scale, dpr, priority: con.rank === 1 ? 40 : 20 });
    }
  }
  for (const s of STARS) {
    if (!s[3]) continue;
    const pt = toXY(s[0], s[1]);
    if (pt && pt.alt > 5) {
      // Above the star if there is room, else below it.
      out.push({ text: s[3], kind: "star", x: pt.x, y: pt.y - lift(6),
        alts: [{ x: pt.x, y: pt.y + lift(6 + LABEL_PX.minor) }],
        tier: "minor", scale, dpr, priority: s[2] < 1 ? 45 - s[2] : 30 - s[2] });
    }
  }
  return out;
}

export class SkyMap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  // bodies: [{name, ra, dec, kind: "planet"|"moon", moonFraction?}]
  // scale: the reader's text size (labels.js textScale), so labels grow
  // with the rest of the page. caption: null at now, or two lines naming
  // the shown moment (time-mode.js), drawn inside the chart itself.
  draw({ jd, lat, lon, mode = "normal", bodies = [], scale = 1, caption = null }) {
    const c = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssSize = c.clientWidth;
    if (cssSize === 0) return; // hidden or not laid out yet
    if (c.width !== cssSize * dpr) {
      c.width = cssSize * dpr;
      c.height = cssSize * dpr;
    }
    const ctx = this.ctx;
    const P = PALETTES[mode];
    const W = c.width;
    // Sky radius, leaving room outside the disc for the cardinal letters.
    const R = W / 2 - (LABEL_PX.major * scale + 2) * dpr;
    const cx = W / 2, cy = W / 2;
    const toXY = projector({ jd, lat, lon, cx, cy, R });

    ctx.clearRect(0, 0, W, W);

    // The shown time, top-left, when it is not now. Its box is reserved so
    // no star name is laid over it.
    const reserved = [];
    const captionLines = [];
    if (caption) {
      const pad = 4 * dpr;
      let y = pad;
      caption.forEach((text, i) => {
        const font = labelFont(i === 0 ? "minor" : "major", scale, dpr);
        const size = LABEL_PX[i === 0 ? "minor" : "major"] * scale * dpr;
        ctx.font = font;
        y += size * 1.15;
        captionLines.push({ text, font, y });
        reserved.push({ x0: 0, y0: y - size * 1.15, x1: pad * 2 + ctx.measureText(text).width, y1: y + size * 0.3 });
      });
    }

    // Sky disk.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
    grad.addColorStop(0, P.sky);
    grad.addColorStop(1, P.edgeFade);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.clip();

    // Altitude circles at 30 and 60 degrees.
    ctx.strokeStyle = P.grid;
    ctx.lineWidth = dpr;
    for (const alt of [30, 60]) {
      const r = (Math.tan(((90 - alt) * DEG) / 2) / Math.tan(Math.PI / 4)) * R;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Constellation lines.
    ctx.strokeStyle = P.constellation;
    ctx.lineWidth = dpr;
    for (const con of CONSTELLATIONS) {
      for (const seg of con.lines) {
        let prev = null;
        for (const [ra, dec] of seg) {
          const pt = toXY(ra, dec);
          if (prev && pt) {
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
          }
          prev = pt;
        }
      }
    }

    // Stars, brightest first (data is pre-sorted by magnitude).
    for (const s of STARS) {
      const pt = toXY(s[0], s[1]);
      if (!pt) continue;
      const mag = s[2];
      const size = Math.max(0.6, 3.2 - mag * 0.55) * dpr;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
      ctx.fillStyle = P.star;
      ctx.globalAlpha = mag <= 1 ? 1 : Math.max(0.35, 1 - (mag - 1) * 0.14);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Planets and the moon.
    for (const b of bodies) {
      const pt = toXY(b.ra, b.dec);
      if (!pt) continue;
      if (b.kind === "moon") {
        const r = 7 * dpr;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fillStyle = P.moonDisk;
        ctx.fill();
        // Phase hint: shade the un-lit fraction from one side.
        const f = b.moonFraction ?? 1;
        if (f < 0.97) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
          ctx.fillStyle = P.moonDark;
          ctx.globalAlpha = 1 - f;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      } else {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.4 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = P.planet;
        ctx.fill();
      }
    }

    // Labels last, so no star or disc paints over a name; collisions dropped.
    const labels = layoutLabels(
      labelCandidates({ toXY, bodies, scale, dpr }),
      (text, font) => { ctx.font = font; return ctx.measureText(text).width; },
      reserved,
    );
    ctx.textAlign = "center";
    ctx.globalAlpha = 1;
    const labelColour = { body: P.planetName, constellation: P.constellationName, star: P.starName };
    for (const l of labels) {
      ctx.font = l.font;
      ctx.fillStyle = labelColour[l.kind];
      ctx.fillText(l.text, l.x, l.y);
    }
    ctx.restore();

    // Horizon ring + cardinal points (E left: you are looking UP). A shown
    // time other than now dashes the ring in the caption colour: a shape,
    // not only a hue, marks the chart as not-now.
    ctx.strokeStyle = caption ? P.caption : P.horizonRing;
    ctx.lineWidth = 2 * dpr;
    ctx.setLineDash(caption ? [6 * dpr, 5 * dpr] : []);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = P.cardinal;
    ctx.font = labelFont("major", scale, dpr);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const off = (LABEL_PX.major * scale / 2 + 1) * dpr;
    ctx.fillText("N", cx, cy - R - off);
    ctx.fillText("S", cx, cy + R + off);
    ctx.fillText("E", cx - R - off, cy);
    ctx.fillText("W", cx + R + off, cy);
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = P.caption;
    ctx.textAlign = "left";
    for (const l of captionLines) {
      ctx.font = l.font;
      ctx.fillText(l.text, 4 * dpr, l.y);
    }
  }
}
