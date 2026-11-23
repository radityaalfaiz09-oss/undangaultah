const CONFIG = {
  judulAcara: "Sweet Seventeen",
  umur: "17",
  namaTokoh: "Nama Kamu",
  tanggalAcara: "2026-12-20T16:00:00+07:00",
  durasiJam: 4,
  tempat: "Nama Tempat Acara",
  alamat: "Jl. Contoh No. 1, Jakarta",
  mapsLink: "https://maps.app.goo.gl/B6wFDgmtAkaKdPq18",
  mapsEmbed: "https://www.google.com/maps?q=-6.2633241,106.6660765&output=embed",
  rekening: [
    { label: "Transfer Bank BCA", nilai: "1234567890", keterangan: "a.n. Nama Kamu" },
    { label: "Alamat Kado", nilai: "Jl. Contoh No. 1, Jakarta", keterangan: "Penerima: Nama Kamu" },
  ],
  storageKey: "ucapan-ultah-v1",
};

const $ = (sel) => document.querySelector(sel);
const eventDate = new Date(CONFIG.tanggalAcara);

function fillStaticData() {
  document.querySelectorAll("[data-bind]").forEach((el) => {
    el.textContent = CONFIG[el.dataset.bind] ?? "";
  });
  $("#tglText").textContent = new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta",
  }).format(eventDate);
  $("#jamText").textContent =
    new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })
      .format(eventDate).replace(".", ":") + " WIB — selesai";
  $("#mapFrame").src = CONFIG.mapsEmbed;
  $("#btnMaps").href = CONFIG.mapsLink;
}

/* =========================================================
   2. NAMA TAMU DINAMIS dari parameter URL (?to=Nama+Tamu)
   ========================================================= */
function setGuestName() {
  const params = new URLSearchParams(window.location.search);
  const to = (params.get("to") || "").trim();
  if (to) {
    $("#guestName").textContent = to;          // textContent → aman dari XSS
    $("#inNama").value = to;                   // sekalian isi form RSVP
  }
}

/* =========================================================
   3. BUKA UNDANGAN + MUSIK
   ========================================================= */
const audio = $("#bgm");
const musicBtn = $("#musicToggle");
const musicIcon = $("#musicIcon");

function setMusicUI(playing) {
  musicBtn.classList.toggle("playing", playing);
  musicIcon.textContent = playing ? "🎵" : "🔇";
}

async function playMusic() {
  try {
    await audio.play();
    setMusicUI(true);
  } catch (err) {
    setMusicUI(false); // file belum ada / diblokir browser
  }
}

function openInvitation() {
  const cover = $("#cover");
  cover.classList.add("open");                  // animasi cover naik
  document.body.classList.remove("locked");     // buka kunci scroll
  musicBtn.classList.remove("hidden");          // munculkan tombol musik
  playMusic();                                  // diputar dari klik user → lolos autoplay policy
  window.scrollTo(0, 0);
  setTimeout(() => { cover.style.display = "none"; }, 1300);
  observeReveal();
}

$("#btnOpen").addEventListener("click", openInvitation);

musicBtn.addEventListener("click", () => {
  if (audio.paused) playMusic();
  else { audio.pause(); setMusicUI(false); }
});

/* =========================================================
   4. COUNTDOWN REAL-TIME
   ========================================================= */
function pad(n) { return String(n).padStart(2, "0"); }

function updateCountdown() {
  const diff = eventDate - new Date();
  if (diff <= 0) {
    $("#countdown").classList.add("hidden");
    $("#cdDone").classList.remove("hidden");
    return false;
  }
  const s = Math.floor(diff / 1000);
  $("#cdDays").textContent = pad(Math.floor(s / 86400));
  $("#cdHours").textContent = pad(Math.floor((s % 86400) / 3600));
  $("#cdMinutes").textContent = pad(Math.floor((s % 3600) / 60));
  $("#cdSeconds").textContent = pad(s % 60);
  return true;
}

function startCountdown() {
  if (!updateCountdown()) return;
  const timer = setInterval(() => { if (!updateCountdown()) clearInterval(timer); }, 1000);
}

/* =========================================================
   5. SIMPAN KE KALENDER (Google Calendar + .ics)
   ========================================================= */
function toCalDate(d) {
  return d.toISOString().replace(/[-:]|\.\d{3}/g, ""); // 20261220T090000Z
}
const endDate = new Date(eventDate.getTime() + CONFIG.durasiJam * 3600 * 1000);
const eventTitle = `${CONFIG.judulAcara} ${CONFIG.namaTokoh}`;
const eventLocation = `${CONFIG.tempat}, ${CONFIG.alamat}`;

function setupCalendar() {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", eventTitle);
  url.searchParams.set("dates", `${toCalDate(eventDate)}/${toCalDate(endDate)}`);
  url.searchParams.set("details", "Kamu diundang ke acara ulang tahun!");
  url.searchParams.set("location", eventLocation);
  $("#btnGCal").href = url.toString();

  $("#btnICS").addEventListener("click", () => {
    const esc = (t) => t.replace(/[,;]/g, (m) => "\\" + m);
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Undangan Ulang Tahun//ID",
      "BEGIN:VEVENT",
      `UID:${Date.now()}@undangan`,
      `DTSTAMP:${toCalDate(new Date())}`,
      `DTSTART:${toCalDate(eventDate)}`,
      `DTEND:${toCalDate(endDate)}`,
      `SUMMARY:${esc(eventTitle)}`,
      `LOCATION:${esc(eventLocation)}`,
      "DESCRIPTION:Kamu diundang ke acara ulang tahun!",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "undangan-ulang-tahun.ics";
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("File kalender diunduh ✅");
  });
}

/* =========================================================
   6. AMPLOP DIGITAL + COPY TO CLIPBOARD + TOAST
   ========================================================= */
let toastTimer;
function showToast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fallback untuk browser lama / non-HTTPS
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  showToast("Berhasil disalin ✅");
}

function renderGifts() {
  const wrap = $("#giftList");
  CONFIG.rekening.forEach((r) => {
    const card = document.createElement("div");
    card.className = "reveal gift-card";

    const label = document.createElement("p");
    label.className = "label";
    label.textContent = r.label;

    const nilai = document.createElement("p");
    nilai.className = "gift-value";
    nilai.textContent = r.nilai;

    const ket = document.createElement("p");
    ket.className = "gift-note";
    ket.textContent = r.keterangan;

    const btn = document.createElement("button");
    btn.className = "btn-outline";
    btn.textContent = "📋 Salin";
    btn.addEventListener("click", () => copyText(r.nilai));

    card.append(label, nilai, ket, btn);
    wrap.appendChild(card);
  });
}

/* =========================================================
   7. SCROLL ANIMATION (IntersectionObserver)
   ========================================================= */
let revealObserver;
function observeReveal() {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("show"); revealObserver.unobserve(e.target); }
      }),
      { threshold: 0.15 }
    );
  }
  document.querySelectorAll(".reveal:not(.show)").forEach((el) => revealObserver.observe(el));
}

/* =========================================================
   8. RSVP & BUKU TAMU (localStorage)
   ========================================================= */
function loadMessages() {
  try { return JSON.parse(localStorage.getItem(CONFIG.storageKey)) || []; }
  catch { return []; }
}
function saveMessages(list) {
  try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(list)); } catch { /* storage penuh/diblokir */ }
}

function renderGuestbook() {
  const list = loadMessages();
  const ul = $("#guestbook");
  ul.innerHTML = "";
  $("#guestCount").textContent = list.length;

  if (!list.length) {
    const li = document.createElement("li");
    li.className = "guest-empty";
    li.textContent = "Belum ada ucapan. Jadilah yang pertama! 🎈";
    ul.appendChild(li);
    return;
  }

  list.forEach((m) => {
    const li = document.createElement("li");
    li.className = "guest-item";

    const head = document.createElement("div");
    head.className = "guest-head";

    const nama = document.createElement("p");
    nama.className = "guest-nama";
    nama.textContent = m.nama;

    const badge = document.createElement("span");
    badge.className = "badge " + (m.status === "Hadir" ? "badge-hadir" : "badge-tidak");
    badge.textContent = m.status;
    head.append(nama, badge);

    const teks = document.createElement("p");
    teks.className = "guest-text";
    teks.textContent = m.ucapan;

    const waktu = document.createElement("p");
    waktu.className = "guest-time";
    waktu.textContent = new Date(m.waktu).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

    li.append(head, teks, waktu);
    ul.appendChild(li);
  });
}

function setupForm() {
  $("#rsvpForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const nama = $("#inNama").value.trim();
    const status = $("#inStatus").value;
    const ucapan = $("#inUcapan").value.trim();
    const err = $("#formError");

    if (!nama || !ucapan) {
      err.textContent = "Nama dan ucapan wajib diisi ya.";
      err.classList.remove("hidden");
      return;
    }
    err.classList.add("hidden");

    const list = loadMessages();
    list.unshift({ nama, status, ucapan, waktu: Date.now() }); // terbaru di atas
    saveMessages(list);
    renderGuestbook();

    $("#inUcapan").value = "";
    showToast("Ucapan terkirim, terima kasih! 💛");
  });
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  fillStaticData();
  setGuestName();
  setupCalendar();
  renderGifts();
  renderGuestbook();
  setupForm();
  startCountdown();
  setMusicUI(false);
});