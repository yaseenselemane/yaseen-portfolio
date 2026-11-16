// Builds the page body from content.ts. Runs in Node at build time, so the HTML works with JavaScript off.
import * as c from './content';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ext = (l: c.Link, cls = '') =>
  `<a class="${cls}" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}<span class="arrow" aria-hidden="true">↗</span></a>`;

const trace = (n: number, host: string) =>
  `<div class="trace" data-node><span class="n">${n}</span><span class="host">${esc(host)}</span><span class="lead" aria-hidden="true"></span><span class="t" data-t></span></div>`;

const hop = (n: number, id: string, host: string, label: string, title: string, body: string, cls = '') =>
  `<section class="hop ${cls}" id="${id}" data-hop="${n}" aria-labelledby="h-${id}">
  <div class="wrap">
    ${trace(n, host)}
    ${label ? `<p class="eyebrow" data-reveal>${esc(label)}</p>` : ''}
    <h2 id="h-${id}" data-reveal>${esc(title)}</h2>
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
    <h1 data-reveal>${esc(h.headline)}</h1>
    <p class="sub" data-reveal>${esc(h.sub)}</p>
    <p class="status" data-reveal><span class="dot" aria-hidden="true"></span>${esc(h.status)}</p>
  </div>
</header>`;
}

function origin() {
  const o = c.origin;
  return hop(1, 'origin', o.host, '', o.label, `
    <p class="lede" data-reveal>${esc(o.body)}</p>
    <blockquote class="pull" data-reveal><p>“${esc(o.quote)}”</p></blockquote>`);
}

function field() {
  const f = c.field;
  return hop(2, 'field-work', f.host, '', f.label, `
    <p class="org" data-reveal><span class="role">${esc(f.role)}</span>${esc(f.org)}</p>
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
    <p class="links" data-reveal>${k.links.map((l) => ext(l, 'link')).join('')}</p>`);
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
    </div>`, 'side-r flagship');
}

function tierOne() {
  const t = c.tierOne;
  return hop(5, 'tier-one', t.host, t.label, t.name, `
    <div class="split">
      <figure class="game" data-reveal>${img(t.shot)}</figure>
      <div class="split-text">
        <p class="lede" data-reveal>${esc(t.body)}</p>
        <p class="stack" data-reveal><span class="k">stack</span> ${esc(t.stack)}</p>
        <p class="actions" data-reveal>${ext(t.play, 'btn')}${ext(t.repo, 'link')}</p>
      </div>
    </div>`);
}

function builds() {
  const b = c.builds;
  return hop(6, 'builds', b.host, '', b.label, `
    <ul class="rows">${b.items
      .map(
        (i) => `<li data-reveal><span class="name">${esc(i.name)}</span><span class="line">${esc(i.line)}</span><span class="stack">${esc(i.stack)}</span>${i.href ? ext({ label: 'repo', href: i.href }, 'link') : '<span class="nolink"></span>'}</li>`,
      )
      .join('')}</ul>`, 'side-r');
}

function labs() {
  const l = c.labs;
  return hop(7, 'labs', l.host, '', l.label, `
    <div class="pcap" data-reveal>
      <table>
        <caption><span>${esc(l.host)}</span> ${l.rows.length} packets captured</caption>
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
    <p class="summary" data-reveal>Trace complete. 8 hops,<span data-total hidden> <b></b> s,</span> 0% packet loss.</p>
    <p class="reply" data-reveal>${esc(d.reply)}</p>
    <p class="contact" data-reveal>${d.links.map((l) => ext(l, 'big')).join('')}</p>`, 'side-r dest');
}

export function renderPage() {
  return `<a class="skip" href="#destination">Skip to contact links</a>
<div class="page">
  <svg class="route" aria-hidden="true"><path class="track"/><path class="lit"/><g class="nodes"></g><circle class="packet" r="5"/></svg>
  ${hero()}
  <main>
    ${origin()}${field()}${certs()}${workproof()}${tierOne()}${builds()}${labs()}${destination()}
  </main>
</div>
<div class="hud" aria-hidden="true">
  <span><span data-hud-hop>hop 0/8</span> · <span data-hud-t>0.0 s</span> · 0% loss</span>
  <span class="up"><span class="dot"></span>link up</span>
</div>`;
}

export const meta = c.site;
