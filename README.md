# Traceroute: Yaseen Selemani's portfolio

**Live: [yaseen-selemani.pages.dev](https://yaseen-selemani.pages.dev)**

The visitor is a packet. Scrolling routes it hop by hop from Soweto to "destination reached", through my field work, certifications, projects and lab write-ups.

![Hero: a dotted Earth with a pulsing beacon over Soweto](public/og.png)

## What's in it

- **Hero globe:** Three.js dotted Earth built from Natural Earth land data, with a Soweto beacon, great-circle arcs and a camera dive into Soweto on the first scroll. Loaded as a separate chunk only when motion is on and WebGL works.
- **Network field:** hand-written Canvas 2D node cloud with perspective depth, scroll-speed warp, pointer interaction and a `YASEEN` particle finale. Halves its own node count if frames run slow.
- **Scenes per hop:** a Devland ACL diagram where a staff packet is denied and a security packet reaches the NVR; a certification "checkpoint" that stamps each cert `PERMIT`; the WorkProof demo playing inside the title letters; a draggable patch cable for Tier One; a Wireshark-style labs table with a live hex dump.
- **HUD:** real elapsed time since you started scrolling, hop count, a mini-map, and motion and sound toggles. Sound is synthesised with the Web Audio API and is off until you turn it on.

## Built to degrade well

- **Reduced motion** (the OS setting) is respected: a static, fully readable page, with a button to opt in to the full experience.
- **JavaScript off:** all content is rendered to HTML at build time from `src/content.ts`, so everything still reads.
- **No WebGL:** the globe is skipped and the 2D field takes the hero.
- Measured on an Intel UHD 620 laptop: globe and field hold 60 fps.

## Stack

Vite + TypeScript, no framework. Plain CSS. GSAP (ScrollTrigger, SplitText, ScrambleText, DrawSVG, MotionPath, Draggable), Lenis and Three.js. Hosted on Cloudflare Pages.

## Run it

```bash
npm install
npm run dev        # local dev server
npm run build      # geo self-check, type check, production build into dist/
npm run landmask   # rebuild public/land-mask.png from Natural Earth (world-atlas)
```

All copy and links live in [`src/content.ts`](src/content.ts).
