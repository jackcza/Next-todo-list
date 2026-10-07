// Regenerates the app icons: node scripts/generate-icons.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { createElement } from "react";
import { ImageResponse } from "next/og.js";

const CHECK = "M150 268 L220 338 L362 180";

/** `bleed` fills the whole square (for maskable / Apple icons, which the OS crops itself). */
function svg({ bleed }) {
  const shape = bleed
    ? `<rect width="512" height="512" fill="url(#g)"/>`
    : `<rect width="512" height="512" rx="112" fill="url(#g)"/>`;
  const check = `<path d="${CHECK}" fill="none" stroke="#fff" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"${
    bleed ? ` transform="translate(51.2 51.2) scale(0.8)"` : ""
  }/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs>${shape}${check}</svg>`;
}

async function png(path, size, options) {
  const src = `data:image/svg+xml;base64,${Buffer.from(svg(options)).toString("base64")}`;
  const image = new ImageResponse(createElement("img", { src, width: size, height: size }), {
    width: size,
    height: size,
  });
  await writeFile(path, Buffer.from(await image.arrayBuffer()));
  console.log(`wrote ${path}`);
}

await mkdir("public/icons", { recursive: true });
await writeFile("app/icon.svg", svg({ bleed: false }));
await png("public/icons/icon-192.png", 192, { bleed: false });
await png("public/icons/icon-512.png", 512, { bleed: false });
await png("public/icons/icon-maskable-512.png", 512, { bleed: true });
await png("app/apple-icon.png", 180, { bleed: true });
