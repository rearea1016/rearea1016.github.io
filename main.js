// Language toggle, periodic-table tiles, and the latest research notes.

const ELEMENTS = [
  { s: 'Ea', en: 'EunAh', ko: '은아', g: 'me', to: '#top' },
  { s: 'Nw', en: 'Now', ko: '요즘', g: 'now', to: '#now' },
  { s: 'Nt', en: 'Notes', ko: '노트', g: 'study', to: '#notes' },
  { s: 'Rs', en: 'Research', ko: '연구', g: 'study', to: '#research' },
  { s: 'Mz', en: 'MONZI', ko: 'MONZI', g: 'build', to: '#monzi' },
  { s: 'Ns', en: 'NSIR', ko: 'NSIR', g: 'build', to: '#nsir' },
  { s: 'In', en: 'Insiders', ko: '인사이더스', g: 'build', to: '#insiders' },
  { s: 'Ss', en: 'SnapScale', ko: '스냅스케일', g: 'build', to: '#snapscale' },
  { s: 'Zw', en: 'Zero-waste', ko: '제로웨이스트', g: 'build', to: '#zerowaste' },
  { s: 'Ku', en: 'Korea Univ.', ko: '고려대', g: 'school', to: '#ku' },
  { s: 'Sg', en: 'Singapore', ko: '싱가포르', g: 'school', to: '#singapore' },
  { s: 'Hi', en: 'Say hi', ko: '연락', g: 'me', to: '#hi' },
];

// ---- language ----
function getLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'ko' || q === 'en') return q;
  try { return localStorage.getItem('lang') || 'en'; } catch { return 'en'; }
}
function setLang(lang) {
  document.documentElement.lang = lang;
  try { localStorage.setItem('lang', lang); } catch {}
}
setLang(getLang());
document.getElementById('lang').addEventListener('click', () => {
  setLang(document.documentElement.lang === 'ko' ? 'en' : 'ko');
});

// ---- periodic table ----
const table = document.getElementById('ptable');
ELEMENTS.forEach((e, i) => {
  const a = document.createElement('a');
  a.className = `el g-${e.g}`;
  a.href = e.to;
  a.innerHTML = `<span class="no">${i + 1}</span><span class="s">${e.s}</span><span class="n"><span class="en">${e.en}</span><span class="ko">${e.ko}</span></span>`;
  a.addEventListener('click', () => {
    const target = document.querySelector(e.to);
    const card = target && (target.classList.contains('card') ? target : target.querySelector('.card, .now-list, .note-cards'));
    if (card) { card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash'); }
  });
  table.appendChild(a);
});

// ---- latest notes ----
const cards = document.getElementById('noteCards');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const linkedinCard = `<a class="note-card linkedin" href="https://www.linkedin.com/in/eunah-roh-a8421236a/recent-activity/all/" target="_blank" rel="noreferrer">
  <span class="date">2026.06 · LinkedIn</span>
  <b><span class="en">DOE SBIR field notes</span><span class="ko">미국 에너지부 SBIR 리서치</span></b>
  <span class="sum"><span class="en">Where the U.S. Department of Energy put its 2024–25 SBIR Phase I awards, sorted by hand.</span><span class="ko">미국 에너지부가 2024–25 SBIR 1단계 지원금을 어디에 줬는지 직접 분류해 본 글.</span></span>
</a>`;

fetch('notes/notes.json')
  .then(r => (r.ok ? r.json() : []))
  .catch(() => [])
  .then(entries => {
    const latest = entries.slice().sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 3);
    cards.innerHTML = latest.map(e => `<a class="note-card" href="notes/${encodeURIComponent(e.slug)}/">
      <span class="date">${new Date(e.publishedAt).toISOString().slice(0, 10).replace(/-/g, '.')}</span>
      <b><span class="en">${esc(e.titleEn || e.title)}</span><span class="ko">${esc(e.titleKo || e.title)}</span></b>
      <span class="sum"><span class="en">${esc(e.summaryEn || e.summary)}</span><span class="ko">${esc(e.summaryKo || e.summary)}</span></span>
    </a>`).join('') + linkedinCard;
  });
