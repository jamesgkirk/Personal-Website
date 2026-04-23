import { CREDITS } from './credits.js?v=4';

const SPOTIFY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
  + '<path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z'
  + 'm5.519 17.308a.75.75 0 01-1.032.25c-2.828-1.728-6.39-2.118-10.585-1.16a.75.75 0 11'
  + '-.334-1.463c4.59-1.048 8.53-.597 11.7 1.342a.75.75 0 01.251 1.031zm1.473-3.276a.937'
  + '.937 0 01-1.29.308c-3.236-1.99-8.167-2.566-11.99-1.405a.937.937 0 01-.543-1.794c4.37'
  + '-1.325 9.8-.682 13.515 1.6a.937.937 0 01.308 1.29zm.127-3.408c-3.88-2.304-10.28-2.516'
  + '-13.99-1.39a1.125 1.125 0 01-.652-2.152c4.252-1.29 11.32-1.04 15.789 1.608a1.125 1.125'
  + ' 0 01-1.147 1.934z"/></svg>';

// Only allow https://open.spotify.com/* URLs in href attributes
function isSafeSpotifyUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'open.spotify.com';
  } catch { return false; }
}

// Reject artworkSrc values that could break a CSS url() context
function isSafeCssUrl(path) {
  return typeof path === 'string' && !/['"()\\]/.test(path);
}

function makeArtworkEl(artworkSrc, artist, album) {
  if (artworkSrc) {
    const img = document.createElement('img');
    img.src = artworkSrc;
    img.alt = `${artist} \u2014 ${album}`;
    img.width = 600;
    img.height = 600;
    img.loading = 'lazy';
    return img;
  }
  const div = document.createElement('div');
  div.className = 'credit-card__artwork-placeholder';
  div.setAttribute('role', 'img');
  div.setAttribute('aria-label', `${artist} \u2014 ${album} placeholder`);
  return div;
}

// SPOTIFY_SVG is 100% static — no user data interpolated
function makeSpotifyLink(spotifyUrl, forModal) {
  if (!isSafeSpotifyUrl(spotifyUrl)) return null;
  const a = document.createElement('a');
  a.className = forModal ? 'credit-modal__spotify' : 'credit-card__spotify';
  a.href = spotifyUrl;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', 'Listen on Spotify');
  a.innerHTML = SPOTIFY_SVG;
  if (forModal) {
    const span = document.createElement('span');
    span.textContent = 'Listen on Spotify';
    a.appendChild(span);
  }
  return a;
}

// ---- Group credits by artwork (same image = same album) ----
const groups = new Map();
CREDITS.forEach((credit, idx) => {
  const key = credit.artworkSrc || `__solo__${idx}`;
  if (!groups.has(key)) {
    groups.set(key, {
      artist: credit.artist,
      album: credit.album,
      artworkSrc: credit.artworkSrc,
      year: credit.year,
      spotifyUrl: credit.spotifyUrl || null,
      songs: []
    });
  }
  groups.get(key).songs.push({ title: credit.title, role: credit.role });
});

// ---- Render one card per group ----
const grid = document.getElementById('credits-grid');
const VISIBLE_SONGS = 5;
const SONG_LINE_PX = 0.6 * 1.9 * 16; // ~18.24px per song line
let cardIndex = 0;

groups.forEach((group) => {
  const isHintCard = cardIndex < 3;
  const card = document.createElement('article');
  card.className = isHintCard ? 'credit-card flip-hint' : 'credit-card';
  card.setAttribute('role', 'listitem');
  card.style.transitionDelay = `${cardIndex * 40}ms`;
  cardIndex++;

  const roles = [...new Set(group.songs.flatMap(s => s.role.split(', ')))].join(' / ');
  const uniqueTitles = group.songs.filter((s, i, arr) =>
    arr.findIndex(x => x.title === s.title) === i
  );
  const isSingle = uniqueTitles.length === 1;
  const overlayLabel = isSingle ? group.songs[0].title : group.album;

  const scrollDist = Math.max(0, (uniqueTitles.length - VISIBLE_SONGS) * SONG_LINE_PX);
  const scrollDur  = Math.max(3, uniqueTitles.length * 0.9).toFixed(1);

  // -- Artwork wrap --
  const artworkWrap = document.createElement('div');
  artworkWrap.className = 'credit-card__artwork-wrap';

  const artworkEl = makeArtworkEl(group.artworkSrc, group.artist, group.album);

  if (isHintCard) {
    const hintInner = document.createElement('div');
    hintInner.className = 'flip-hint__inner';

    const front = document.createElement('div');
    front.className = 'flip-hint__front';
    front.appendChild(artworkEl);

    const back = document.createElement('div');
    back.className = 'flip-hint__back';
    back.setAttribute('aria-hidden', 'true');

    const backArt = document.createElement('div');
    backArt.className = 'flip-hint__back-art';
    if (group.artworkSrc && isSafeCssUrl(group.artworkSrc)) {
      backArt.style.backgroundImage = `url('${group.artworkSrc}')`;
    }

    const hintText = document.createElement('p');
    hintText.className = 'tap-hint-back__text';
    hintText.textContent = 'Tap for more info';

    back.appendChild(backArt);
    back.appendChild(hintText);
    hintInner.appendChild(front);
    hintInner.appendChild(back);
    artworkWrap.appendChild(hintInner);
  } else {
    artworkWrap.appendChild(artworkEl);
  }

  // -- Overlay --
  const overlay = document.createElement('div');
  overlay.className = 'credit-card__overlay';
  const overlayInner = document.createElement('div');
  overlayInner.className = 'credit-card__overlay-inner';

  const artistP = document.createElement('p');
  artistP.className = 'credit-card__artist';
  artistP.textContent = group.artist;

  const albumP = document.createElement('p');
  albumP.className = 'credit-card__album';
  albumP.textContent = overlayLabel;

  const roleP = document.createElement('p');
  roleP.className = 'credit-card__role';
  roleP.textContent = roles;

  overlayInner.appendChild(artistP);
  overlayInner.appendChild(albumP);
  overlayInner.appendChild(roleP);

  if (!isSingle) {
    const songsWrap = document.createElement('div');
    songsWrap.className = 'credit-card__songs-wrap';
    const ul = document.createElement('ul');
    ul.className = 'credit-card__songs';
    ul.style.setProperty('--song-scroll-dist', `${scrollDist.toFixed(1)}px`);
    ul.style.setProperty('--song-scroll-dur', `${scrollDur}s`);
    uniqueTitles.forEach(s => {
      const li = document.createElement('li');
      li.className = 'credit-card__song';
      li.textContent = s.title;
      ul.appendChild(li);
    });
    songsWrap.appendChild(ul);
    overlayInner.appendChild(songsWrap);
  }

  overlay.appendChild(overlayInner);

  if (group.spotifyUrl) {
    const btn = makeSpotifyLink(group.spotifyUrl, false);
    if (btn) overlay.appendChild(btn);
  }

  artworkWrap.appendChild(overlay);
  card.appendChild(artworkWrap);

  // Click handler: always opens modal (desktop + mobile)
  card.addEventListener('click', (e) => {
    if (e.target.closest('.credit-card__spotify')) return;
    document.body.classList.add('hints-dismissed');
    openModal({
      artist: group.artist,
      album: overlayLabel,
      role: roles,
      artworkSrc: group.artworkSrc,
      spotifyUrl: group.spotifyUrl,
      songs: isSingle ? [] : uniqueTitles
    });
  });

  grid.appendChild(card);
});

// ---- Mobile modal logic ----
const modal = document.getElementById('credit-modal');
const modalArt = document.getElementById('modal-art');
const modalArtist = document.getElementById('modal-artist');
const modalAlbum = document.getElementById('modal-album');
const modalRole = document.getElementById('modal-role');
const modalSpotifyWrap = document.getElementById('modal-spotify-wrap');
const modalSongsWrap = document.getElementById('modal-songs-wrap');
const modalSongs = document.getElementById('modal-songs');

function openModal({ artist, album, role, artworkSrc, spotifyUrl, songs }) {
  modalArt.style.backgroundImage =
    (artworkSrc && isSafeCssUrl(artworkSrc)) ? `url("${artworkSrc}")` : 'none';
  modalArtist.textContent = artist;
  modalAlbum.textContent = album;
  modalRole.textContent = role;

  if (songs && songs.length > 0) {
    // Determine primary role (most common across songs)
    const roleCounts = {};
    songs.forEach(s => { roleCounts[s.role] = (roleCounts[s.role] || 0) + 1; });
    const primaryRole = Object.keys(roleCounts).reduce((a, b) =>
      roleCounts[a] >= roleCounts[b] ? a : b
    );
    const primaryTokens = new Set(primaryRole.split(', '));

    modalSongs.textContent = '';
    songs.forEach(s => {
      const li = document.createElement('li');
      li.className = 'credit-modal__song';
      li.textContent = s.title;
      const extras = s.role.split(', ').filter(t => !primaryTokens.has(t));
      if (extras.length) {
        const badge = document.createElement('span');
        badge.className = 'credit-modal__song-badge';
        badge.textContent = ` \u2014 ${extras.join(', ')}`;
        li.appendChild(badge);
      }
      modalSongs.appendChild(li);
    });

    modalSongsWrap.style.display = 'block';
    modalSongsWrap.scrollTop = 0;
    modalSongsWrap.classList.remove('is-scrolled-end');
    // Double-rAF ensures layout is complete before measuring overflow
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (modalSongsWrap.scrollHeight <= modalSongsWrap.clientHeight + 2) {
        modalSongsWrap.classList.add('is-scrolled-end');
      }
    }));
  } else {
    modalSongs.textContent = '';
    modalSongsWrap.style.display = 'none';
  }

  modalSpotifyWrap.textContent = '';
  if (spotifyUrl) {
    const link = makeSpotifyLink(spotifyUrl, true);
    if (link) modalSpotifyWrap.appendChild(link);
  }

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

modal.addEventListener('click', (e) => {
  if (e.target.closest('[data-modal-close]')) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
});

// Fade out scroll hint when list is fully scrolled
modalSongsWrap.addEventListener('scroll', () => {
  const atEnd =
    modalSongsWrap.scrollHeight - modalSongsWrap.scrollTop <= modalSongsWrap.clientHeight + 2;
  modalSongsWrap.classList.toggle('is-scrolled-end', atEnd);
});

// ---- IntersectionObserver fade-in ----
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.credit-card').forEach((card) => {
  observer.observe(card);
});

// ---- Sticky nav: hide on scroll down, show on scroll up ----
const nav = document.getElementById('site-nav');
let lastY = 0;
let ticking = false;

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (y > lastY && y > 80) {
        nav.classList.add('nav--hidden');
      } else {
        nav.classList.remove('nav--hidden');
      }
      nav.classList.toggle('nav--scrolled', y > 20);
      lastY = y;
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });

// ---- Footer year ----
document.getElementById('footer-year').textContent =
  '\u00A9\u00A0' + new Date().getFullYear();
