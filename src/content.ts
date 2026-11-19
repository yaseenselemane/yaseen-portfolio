// All copy and links for the page. Rendered to static HTML at build time (see vite.config.ts).

export type Link = { label: string; href: string };

export const site = {
  title: 'Yaseen Selemani · Traceroute',
  description:
    'Yaseen Selemani: final-year BSc IT, networking and cybersecurity, Soweto, Johannesburg. Azure Network Engineer Associate (AZ-700). Open to graduate and internship roles as a network engineer or cybersecurity specialist.',
};

export const hero = {
  prompt: '$ traceroute yaseen-selemani',
  headline: 'I build networks. Then I build what runs on them.',
  sub: 'Yaseen Selemani. Final-year BSc IT, networking and cybersecurity. Soweto, Johannesburg.',
  status: 'Open to graduate and internship roles: network engineer, cybersecurity specialist',
  // The recruiter's 30-second read: only facts already stated elsewhere on the page.
  summary: [
    ['who', 'Final-year BSc IT, networking and cybersecurity, Richfield'],
    ['certs', 'Azure Network Engineer Associate (AZ‑700) · Cisco Network Security'],
    ['award', 'WorkProof: 2nd place, Credify System Thinking Challenge 2026'],
    ['field', 'IT Technician (WIL), Devland Cash & Carry: IP cameras, Ubiquiti, VLANs'],
    ['target', 'Network engineer or cybersecurity specialist · graduate / internship · Soweto, Johannesburg'],
  ],
};

export const cv = { label: 'Download CV (PDF)', href: '/Yaseen_Selemani_CV.pdf' };

export const origin = {
  host: 'soweto.jhb.za',
  label: 'Origin',
  body: 'Final-year BSc IT student at Richfield Graduate Institute of Technology. Focus: enterprise network design, VLAN segmentation and network security.',
  quote: 'I learn by measuring my own network and publishing what I find.',
};

export const field = {
  host: 'devland.site',
  label: 'Field work',
  role: 'IT Technician (WIL placement)',
  org: 'Devland Cash & Carry',
  points: [
    'Installed and configured IP surveillance cameras across a live retail site',
    'Deployed and configured Ubiquiti networking equipment',
    'Assisted with VLAN configuration and structured cabling',
    'Troubleshot faults on a production network in daily use by staff',
  ],
  link: {
    label: 'Rebuilt and secured as a lab, with the three faults I found',
    href: 'https://github.com/yaseenselemane/cctv-network-lab',
  },
};

export const certs = {
  host: 'checkpoint',
  label: 'Certifications',
  items: [
    { name: 'Microsoft Certified: Azure Network Engineer Associate (AZ‑700)', issuer: 'Microsoft', date: 'Sep 2026' },
    { name: 'Network Security (intermediate, exam passed)', issuer: 'Cisco', date: 'Jul 2026' },
    { name: 'Introduction to Cybersecurity', issuer: 'Cisco', date: 'Jan 2026' },
    { name: 'Learning path: Mitigate threats using Microsoft Defender XDR', issuer: 'Microsoft Learn', date: 'Jun 2026' },
  ],
  links: [
    { label: 'Verify on Credly', href: 'https://www.credly.com/users/yaseen-selemane/badges' },
    { label: 'Microsoft Learn', href: 'https://learn.microsoft.com/en-us/users/yaseenselemani-0686/' },
  ] as Link[],
};

export const workproof = {
  host: 'workproof',
  label: 'Flagship',
  name: 'WorkProof',
  award: '2nd place, Credify System Thinking Challenge 2026',
  awardNote: '100+ applicants',
  tagline: 'Proof you can do the job, not just a CV.',
  does: ['Job-ad X-ray', 'Work-sample kits', 'A live candidate link', 'Blind scoring', 'A decision receipt'],
  stack: 'React, TypeScript, Supabase',
  links: [
    { label: 'Live demo', href: 'https://workproof-gray.vercel.app' },
    { label: 'Showcase', href: 'https://github.com/yaseenselemane/workproof-showcase' },
  ] as Link[],
  video: { src: '/media/workproof-demo.mp4', poster: '/media/workproof-poster.webp', w: 960, h: 540 },
  shots: [
    { src: '/media/wp-ad-xray.webp', w: 1440, h: 810, caption: 'Job-ad X-ray', alt: 'WorkProof ad X-ray: each requirement in a sample job ad marked as a proxy, a trainable tool or a real task' },
    { src: '/media/wp-phone-answers.webp', w: 600, h: 1300, caption: 'Candidate answers on a phone', alt: 'WorkProof work sample on a candidate’s phone: errors found in a ledger and a note to the owner, with the timer running' },
    { src: '/media/wp-blind-scoring.webp', w: 1440, h: 810, caption: 'Blind scoring', alt: 'WorkProof blind scoring: a candidate’s answers scored against a four-level sheet, name hidden until everyone is scored' },
    { src: '/media/wp-decision-receipt.webp', w: 1440, h: 810, caption: 'Decision receipt', alt: 'WorkProof decision receipt listing each score, the decision and the result email' },
  ],
};

export const tierOne = {
  host: 'tier-one',
  label: 'Playable',
  name: 'Tier One',
  body: 'Browser game about network admin and cyber defence: cable a rack, configure routers with Cisco IOS-style commands, work the ticket queue, stop hackers.',
  stack: 'Plain JavaScript',
  play: { label: 'Play it', href: 'https://tier-one.pages.dev' },
  repo: { label: 'Repo', href: 'https://github.com/yaseenselemane/tier-one-network-ops' },
  shot: { src: '/media/tier-one.webp', w: 1440, h: 900, alt: 'Tier One: Network Operations in the browser, an isometric office floor with a server room, desks waiting to be cabled and the day-one lesson open' },
};

export const builds = {
  host: 'builds',
  label: 'Other routes',
  items: [
    { name: 'vantage', line: 'Home network monitor: live per-device traffic and WiFi signal from the router, real mesh map', stack: 'Node.js, SQLite', href: 'https://github.com/yaseenselemane/vantage' },
    { name: 'CampusCheck', line: "Bluetooth-verified attendance, so it can't be marked off campus", stack: 'React Native, Supabase', href: 'https://github.com/yaseenselemane/campuscheck-showcase' },
    { name: 'Smart Pantry Manager', line: "Recipe suggestions strictly from what's already in your pantry, to cut food waste", stack: 'Java, Android', href: 'https://github.com/yaseenselemane/SmartPantryManager' },
    { name: 'CashFlow Coach', line: "Team project; I work on the web app. Tracks a small business's cash position and sends a daily brief", stack: 'TypeScript' },
    { name: 'VOID//SEC', line: 'Offline ethical-hacking study platform for Windows', stack: 'Electron' },
  ] as { name: string; line: string; stack: string; href?: string }[],
};

export const labs = {
  host: 'labs.pcap',
  label: 'Field notes',
  base: 'https://github.com/yaseenselemane/',
  rows: [
    { proto: 'ICMP', source: 'ping-and-traceroute', info: 'TTL, traceroute and CGNAT, MTU, jitter and loss on my own 5G network' },
    { proto: 'TCP', source: 'nmap-field-notes', info: 'Host discovery, port states, service versions, OS detection, what to fix' },
    { proto: '802.11', source: 'wifi-survey', info: 'Home mesh measured from both ends: dBm, bands, channels, WPA3, the 18 dB up/down gap' },
    { proto: 'ARP/DNS', source: 'wireshark-packet-lab', info: 'Real captures: ARP, DNS, DHCP renewal, the TCP handshake, what HTTPS hides' },
    { proto: '802.1Q', source: 'cisco-packet-tracer-labs', info: 'Five labs on one office network: VLANs, router-on-a-stick, DHCP + NAT, ACLs, port security' },
    { proto: 'ACL', source: 'cctv-network-lab', info: 'Camera VLAN, ACLs, port security, and three faults I found' },
    { proto: 'IPv4', source: 'subnet-calculator', info: 'Subnet calculator (CLI + GUI) with tests, including /31 and /32 edge cases' },
  ],
};

export const destination = {
  host: 'yaseen-selemani',
  label: 'Destination reached',
  reply: 'Reply from yaseen: open to graduate and internship roles as a network engineer or cybersecurity specialist.',
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/yaseen-selemane-b9201734a' },
    { label: 'GitHub', href: 'https://github.com/yaseenselemane' },
  ] as Link[],
};
