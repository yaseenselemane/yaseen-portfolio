// Builds the page body from content.ts. Runs in Node at build time, so the HTML works with JavaScript off.
import * as c from './content.ts';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ext = (l: c.Link, cls = '', cursor = '') =>
  `<a class="${cls}" href="${esc(l.href)}" target="_blank" rel="noopener"${cursor ? ` data-cursor="${cursor}"` : ''}>${esc(l.label)}<span class="arrow" aria-hidden="true">↗</span></a>`;

const cvButton = () =>
  `<a class="btn cv" href="${c.cv.href}" download data-cursor="CV">${esc(c.cv.label)}<span class="arrow" aria-hidden="true">↓</span></a>`;

const trace = (n: number, host: string) =>
  `<div class="trace" data-node><span class="n">${n}</span><span class="host">${esc(host)}</span><span class="lead" aria-hidden="true"></span><span class="t" data-t></span></div>`;

const hop = (n: number, id: string, host: string, label: string, title: string, body: string, cls = '') =>
  `<section class="hop ${cls}" id="${id}" data-hop="${n}" data-name="${esc(host)}" aria-labelledby="h-${id}">
  <span class="numeral" aria-hidden="true">0${n}</span>
  <div class="wrap">
    ${trace(n, host)}
    ${label ? `<p class="eyebrow" data-reveal>${esc(label)}</p>` : ''}
    <h2 id="h-${id}" data-decode>${esc(title)}</h2>
    ${body}
  </div>
</section>`;

const img = (s: { src: string; w: number; h: number; alt: string }) =>
  `<img src="${s.src}" width="${s.w}" height="${s.h}" alt="${esc(s.alt)}" loading="lazy" decoding="async">`;

function hero() {
  const h = c.hero;
  return `<header class="hero">
  <div class="wrap">
    <p class="prompt" data-origin>${esc(h.prompt)}</p>
    <h1 data-decode>${esc(h.headline)}</h1>
    <p class="sub" data-reveal>${esc(h.sub)}</p>
    <p class="status" data-reveal><span class="dot" aria-hidden="true"></span>${esc(h.status)}</p>
    <section class="tldr" aria-labelledby="tldr-h" data-reveal>
      <h2 id="tldr-h" class="tldr-h">// in 30 seconds</h2>
      <dl>${h.summary.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      <p class="tldr-cta">${cvButton()}</p>
    </section>
  </div>
</header>`;
}

function origin() {
  const o = c.origin;
  return hop(1, 'origin', o.host, '', o.label, `
    <p class="lede" data-reveal>${esc(o.body)}</p>
    <blockquote class="pull" data-reveal><p>“${esc(o.quote)}”</p></blockquote>`);
}

// Hop 2 diagram: the real design from cctv-network-lab (VLANs and roles only, no addresses).
function devlandDiagram() {
  const box = (x: number, y: number, w: number, label: string, cls = '') =>
    `<g class="dv-box ${cls}"><rect x="${x}" y="${y}" width="${w}" height="26" rx="3"/><text x="${x + w / 2}" y="${y + 17}" text-anchor="middle">${label}</text></g>`;
  const grp = (x: number, y: number, w: number, h: number, label: string, low = false) =>
    `<g class="dv-grp"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/><text x="${x + 8}" y="${low ? y + h - 8 : y + 16}">${label}</text></g>`;
  return `<figure class="devland">
    <svg viewBox="0 0 340 384" role="img" aria-labelledby="dv-t">
      <title id="dv-t">Network diagram: cameras and the NVR on VLAN 20, staff on VLAN 10, security on VLAN 30, all through switch SW1 to router R1, where ACLs block staff from the cameras and let security reach only the NVR.</title>
      ${grp(6, 200, 166, 178, 'VLAN 20 · CCTV', true)}${grp(184, 200, 150, 82, 'VLAN 10 · STAFF')}${grp(184, 296, 150, 82, 'VLAN 30 · SECURITY')}
      <g class="dv-lines">
        <path d="M170,48 V120"/>
        <path d="M140,154 L76,245"/><path d="M140,154 L76,295"/><path d="M140,154 L76,345"/><path d="M155,154 L136,282"/>
        <path d="M190,154 L265,232"/><path d="M215,137 H326 V339 H310"/>
      </g>
      ${box(125, 22, 90, 'R1 · ACLs', 'r1')}${box(125, 120, 90, 'SW1')}
      ${box(18, 232, 58, 'CAM1')}${box(18, 282, 58, 'CAM2')}${box(18, 332, 58, 'CAM3')}${box(106, 282, 58, 'NVR', 'nvr')}
      ${box(220, 232, 90, 'Staff PC')}${box(220, 326, 90, 'Security PC')}
      <text class="dv-tag deny" x="222" y="40">DENY</text>
      <text class="dv-tag allow" x="135" y="327" text-anchor="middle">PERMIT</text>
      <path class="dv-path" id="dv-staff" d="M265,232 L190,154 L170,137 L170,50"/>
      <path class="dv-path" id="dv-sec" d="M310,339 H326 V137 H215 L170,137 L170,50 L170,137 L155,154 L136,282"/>
      <circle class="dv-pkt staff" r="5"/><circle class="dv-pkt sec" r="5"/>
    </svg>
    <figcaption>Staff traffic to the cameras is denied at R1. The security PC reaches only the NVR.</figcaption>
  </figure>`;
}

function field() {
  const f = c.field;
  return hop(2, 'field-work', f.host, '', f.label, `
    <p class="org" data-reveal><span class="role">${esc(f.role)}</span>${esc(f.org)}</p>
    ${devlandDiagram()}
    <ul class="points">${f.points.map((p) => `<li data-reveal>${esc(p)}</li>`).join('')}</ul>
    <p class="more" data-reveal>${ext(f.link, 'link')}</p>`, 'side-r');
}

function certs() {
  const k = c.certs;
  return hop(3, 'certifications', k.host, '', k.label, `
    <p class="acl-head" data-reveal aria-hidden="true">ip access-list extended CHECKPOINT</p>
    <ol class="acl">${k.items
      .map(
        (i, n) => `<li data-reveal><span class="seq" aria-hidden="true">${(n + 1) * 10}</span><span class="permit">permit</span><span class="cert"><span class="name">${esc(i.name)}</span><span class="meta">${esc(i.issuer)} · ${esc(i.date)}</span></span></li>`,
      )
      .join('')}</ol>
    <p class="links" data-reveal>${k.links.map((l) => ext(l, 'link', 'VERIFY')).join('')}</p>`);
}

function workproof() {
  const w = c.workproof;
  const [xray, phone, blind, receipt] = w.shots;
  const fig = (s: typeof xray, cls: string, n: number) =>
    `<figure class="${cls}" data-reveal>${img(s)}<figcaption><span class="fig">fig. ${n}</span> ${esc(s.caption)}</figcaption></figure>`;
  return hop(4, 'workproof', w.host, w.label, w.name, `
    <p class="award" data-reveal><span class="place">${esc(w.award)}</span><span class="note">${esc(w.awardNote)}</span></p>
    <p class="tagline" data-reveal>${esc(w.tagline)}</p>
    <ol class="pipeline" aria-label="What it does">${w.does.map((d, i) => `<li data-reveal><span class="step">0${i + 1}</span>${esc(d)}</li>`).join('')}</ol>
    <p class="stack" data-reveal><span class="k">stack</span> ${esc(w.stack)}</p>
    <p class="actions" data-reveal>${ext(w.links[0], 'btn')}${ext(w.links[1], 'link')}</p>
    <figure class="demo" data-reveal>
      <video data-autoplay muted playsinline loop controls preload="none" width="${w.video.w}" height="${w.video.h}" poster="${w.video.poster}" aria-label="WorkProof demo video, no sound">
        <source src="${w.video.src}" type="video/mp4">
      </video>
      <figcaption><span class="fig">fig. 1</span> Demo, muted</figcaption>
    </figure>
    <div class="shots">
      ${fig(xray, 'xray', 2)}${fig(phone, 'phone', 3)}${fig(blind, 'blind', 4)}${fig(receipt, 'receipt', 5)}
    </div>`, 'flagship');
}

function tierOne() {
  const t = c.tierOne;
  return hop(5, 'tier-one', t.host, t.label, t.name, `
    <div class="split">
      <figure class="game" data-reveal>${img(t.shot)}</figure>
      <div class="split-text">
        <p class="lede" data-reveal>${esc(t.body)}</p>
        <p class="stack" data-reveal><span class="k">stack</span> ${esc(t.stack)}</p>
        <div class="rack" data-rack hidden>
          <span class="rk-you" data-you>YOU</span>
          <div class="rk-switch"><span class="rk-name">switch</span><span class="rk-ports">${'<i></i>'.repeat(8)}</span></div>
          <svg class="rk-cable" aria-hidden="true"><path/></svg>
          <button type="button" class="rk-plug" data-cursor="DRAG" aria-label="Patch the cable into the switch"></button>
          <p class="rk-status" aria-live="polite">link down · drag or tap the cable</p>
        </div>
        <p class="actions" data-reveal>${ext(t.play, 'btn', 'PLAY')}${ext(t.repo, 'link')}</p>
      </div>
    </div>`);
}

function builds() {
  const b = c.builds;
  return hop(6, 'builds', b.host, '', b.label, `
    <ul class="rows">${b.items
      .map(
        (i) => `<li data-reveal data-repo="${i.href ? esc(i.href.replace('https://', '')) : ''}"><span class="name">${esc(i.name)}</span><span class="line">${esc(i.line)}</span><span class="stack">${esc(i.stack)}</span>${i.href ? ext({ label: 'repo', href: i.href }, 'link') : '<span class="nolink"></span>'}</li>`,
      )
      .join('')}</ul>`);
}

function labs() {
  const l = c.labs;
  return hop(7, 'labs', l.host, '', l.label, `
    <div class="pcap" data-reveal>
      <table>
        <caption><span>${esc(l.host)}</span> <span class="cap-n">${l.rows.length} packets captured</span></caption>
        <thead><tr><th scope="col">No.</th><th scope="col">Protocol</th><th scope="col">Source</th><th scope="col">Info</th></tr></thead>
        <tbody>${l.rows
          .map(
            (r, i) => `<tr><td class="no">${i + 1}</td><td class="proto">${esc(r.proto)}</td><td class="src"><a href="${l.base}${r.source}" target="_blank" rel="noopener">${esc(r.source)}</a></td><td class="info">${esc(r.info)}</td></tr>`,
          )
          .join('')}</tbody>
      </table>
    </div>`);
}

function destination() {
  const d = c.destination;
  return hop(8, 'destination', d.host, '', d.label, `
    <p class="summary" data-dest>Trace complete. 8 hops,<span data-total hidden> <b></b> s,</span> 0% packet loss.</p>
    <p class="reply" data-dest>${esc(d.reply)}</p>
    <p class="contact" data-dest>${d.links.map((l) => ext(l, 'big', 'OPEN')).join('')}${cvButton()}</p>`, 'side-r dest');
}

const HOPS = [
  ['origin', c.origin.host], ['field-work', c.field.host], ['certifications', c.certs.host], ['workproof', c.workproof.host],
  ['tier-one', c.tierOne.host], ['builds', c.builds.host], ['labs', c.labs.host], ['destination', c.destination.host],
];

export function renderPage() {
  return `<a class="skip" href="#destination">Skip to contact links</a>
<div class="preloader" aria-hidden="true"><p><span data-pre-line>resolving yaseen-selemani...</span> <span data-pre-n>0%</span></p><i class="pre-packet"></i></div>
<div class="motion-ask" hidden><p data-ask-text>Your device asked for less motion.</p><button type="button" data-motion="on">Play the full experience</button></div>
<div class="page">
  <svg class="route" aria-hidden="true"><path class="track"/><g class="lit-chunks"></g><g class="nodes"></g><circle class="cue" r="6"/><circle class="halo" r="18"/><circle class="packet" r="5"/></svg>
  ${hero()}
  <main>
    ${origin()}${field()}${certs()}${workproof()}${tierOne()}${builds()}${labs()}${destination()}
  </main>
</div>
<div class="hud">
  <span class="readout" aria-hidden="true"><span data-hud-hop>hop 0/8</span> · <span data-hud-t>0.0 s</span> · 0% loss</span>
  <nav class="minimap" aria-label="Jump to a hop">${HOPS.map((h, i) => `<a href="#${h[0]}" data-name="${i + 1} ${h[1]}" aria-label="Hop ${i + 1}: ${h[1]}"><i></i></a>`).join('')}</nav>
  <span class="up" aria-hidden="true"><span class="dot"></span>link up</span>
  <button type="button" class="motion-toggle" data-sound aria-pressed="false">sound off</button>
  <button type="button" class="motion-toggle" data-motion="off" aria-pressed="true" aria-label="Motion is on. Turn it off">motion on</button>
</div>`;
}

export const meta = c.site;
