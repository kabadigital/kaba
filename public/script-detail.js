document.addEventListener("DOMContentLoaded", () => {
  chargerDetail();
  chargerMessages();
});

let currentIndex = 0;
let totalSlides = 0;
let autoSlide;

async function chargerDetail() {

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const res = await fetch("http://localhost:3000/properties/" + id);
  const b = await res.json();

  buildSlider(b);

  /* BADGES */
  const badgeContainer = document.getElementById("badges-container");
  let badges = "";

  if (b.agentId?.isCertified) {
    badges += `<span class="badge verified">🛡️ Agent Certifié</span>`;
  }

  if (b.agentId?.rating >= 4.5) {
    badges += `<span class="badge top">🥇 Top Agent</span>`;
  }

  if (b.isPremium) {
    badges += `<span class="badge premium">💎 Bien Premium</span>`;
  }

  badgeContainer.innerHTML = badges;

  /* INFOS */
  document.getElementById("title").innerText = b.title;
  document.getElementById("location").innerText =
    "📍 " + b.city + " - " + b.neighborhood;

  document.getElementById("surface").innerText =
    "📏 " + (b.surface || 0) + " m²";

  document.getElementById("rooms").innerText =
    b.propertyType !== "Terrain"
      ? `🛏️ ${b.bedrooms || 0} | 🚿 ${b.bathrooms || 0}`
      : "";

  document.getElementById("price").innerText =
    Number(b.price).toLocaleString() + " FCFA";

  /* VUES */
  const viewRes = await fetch(
    "http://localhost:3000/properties/" + id + "/view",
    { method: "PUT" }
  );

  const viewData = await viewRes.json();
  document.getElementById("views-count").innerText =
    viewData.views || 0;
}

/* ================= SLIDER MIX IMAGE + VIDEO ================= */

function buildSlider(property) {

  const track = document.getElementById("media-track");
  const dotsContainer = document.getElementById("media-dots");

  track.innerHTML = "";
  dotsContainer.innerHTML = "";

  let medias = [];

  if (property.images) {
    property.images.forEach(i => {
      medias.push({ type: "image", src: i });
    });
  }

  if (property.videos) {
    property.videos.forEach(v => {
      medias.push({ type: "video", src: v });
    });
  }

  if (property.video) { // compat ancien format
    medias.push({ type: "video", src: property.video });
  }

  totalSlides = medias.length;

  medias.forEach((m, index) => {

    let element = "";

    if (m.type === "video") {
      element = `
        <video class="slide-media" controls>
          <source src="http://localhost:3000${m.src}" type="video/mp4">
        </video>
      `;
    } else {
      element = `
        <img class="slide-media" src="http://localhost:3000${m.src}">
      `;
    }

    track.innerHTML += `<div class="slide">${element}</div>`;

    dotsContainer.innerHTML += `
      <span class="dot ${index === 0 ? "active" : ""}"
            onclick="goToSlide(${index})"></span>
    `;
  });

  startAutoSlide();
}

function nextSlide() {
  currentIndex = (currentIndex + 1) % totalSlides;
  updateSlider();
}

function prevSlide() {
  currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
  updateSlider();
}

function goToSlide(index) {
  currentIndex = index;
  updateSlider();
}

function updateSlider() {
  const track = document.getElementById("media-track");
  track.style.transform = `translateX(-${currentIndex * 100}%)`;

  document.querySelectorAll(".dot").forEach((d, i) => {
    d.classList.toggle("active", i === currentIndex);
  });
}

function startAutoSlide() {
  autoSlide = setInterval(nextSlide, 5000);
}

/* ================= MESSAGERIE ================= */

async function sendMessage() {

  const content = document.getElementById("message-content").value.trim();
  const token = localStorage.getItem("token");

  if (!token || !content) return;

  const params = new URLSearchParams(window.location.search);
  const propertyId = params.get("id");

  await fetch("http://localhost:3000/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({ propertyId, content })
  });

  document.getElementById("message-content").value = "";
  chargerMessages();
}

async function chargerMessages() {

  const token = localStorage.getItem("token");
  if (!token) return;

  const params = new URLSearchParams(window.location.search);
  const propertyId = params.get("id");

  const res = await fetch(
    "http://localhost:3000/messages/" + propertyId,
    { headers: { "Authorization": token } }
  );

  const messages = await res.json();
  const container = document.getElementById("messages");
  container.innerHTML = "";

  messages.forEach(m => {
    container.innerHTML += `
      <div class="message-item">
        <strong>${m.senderId?.name || "Utilisateur"}</strong>
        <p>${m.content}</p>
      </div>
    `;
  });
}