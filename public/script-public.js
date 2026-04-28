const API =
  location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://api.kaba.digital";

let tousLesBiens = [];

let page = 1;
const limit = 12;

let uploadedMedia = []; // stockage temporaire

async function uploadToCloudinary() {

  const files = document.getElementById("mediaFiles").files;
  const status = document.getElementById("uploadStatus");

  if (!files.length) {
    alert("Sélectionne des fichiers !");
    return;
  }

  uploadedMedia = [];
  status.innerHTML = "⏳ Upload en cours...";

  for (let file of files) {

  // 👇 ICI TU AJOUTES LA VALIDATION
  if (!file.type.startsWith("image") && !file.type.startsWith("video")) {
    console.warn("Fichier ignoré :", file.name);
    continue;
  }

  const formData = new FormData();
  formData.append("file", file);

    try {

      const res = await fetch(`${API}/upload`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!data.url) {
        console.error("Erreur upload backend :", data);
        continue;
      }

      uploadedMedia.push({
        url: data.url,
        type: data.type
      });

    } catch (err) {
      console.error("Upload error:", err);
    }
  }

  status.innerHTML = `✅ Upload terminé (${uploadedMedia.length} fichiers)`;
}

document.addEventListener("DOMContentLoaded", () => {
  chargerBiens(true);
});

/* ================= CHARGER BIENS ================= */

async function chargerBiens(reset = false) {
  try {

    const btn = document.getElementById("load-more-btn");

    if (reset) {
      page = 1;
      tousLesBiens = [];
      document.getElementById("all-properties").innerHTML = "";
      btn.style.display = "block"; // 🔥 toujours visible au début
    }

    const res = await fetch(`${API}/public/properties?page=${page}&limit=${limit}`);
    const biens = await res.json();

    // 🔥 sécurité (évite ton erreur "filter is not a function")
    if (!Array.isArray(biens)) {
      console.error("Réponse API invalide :", biens);
      return;
    }

    // 🔥 ajouter sans supprimer anciens
    tousLesBiens = [...tousLesBiens, ...biens];

    filtrerParOnglet();

    // 🔥 cacher seulement si vraiment plus rien
    if (biens.length === 0) {
      btn.style.display = "none";
    } else {
      btn.style.display = "block";
    }

  } catch (err) {
    console.error(err);

    document.getElementById("all-properties").innerHTML =
      "<p style='text-align:center'>Impossible de charger les biens.</p>";
  }
}

/* ================= AFFICHAGE BIENS ================= */

function afficherBiens(biens, append = false) {

  const container = document.getElementById("all-properties");

  const baseURL = "https://api.kaba.digital";

  // 🔥 IMPORTANT
  if (!append) {
    container.innerHTML = "";
  }

  if (!biens.length) {
    container.innerHTML =
      "<p style='text-align:center;font-size:18px;'>Aucun bien trouvé.</p>";
    return;
  }

  const now = new Date();

  biens.forEach(b => {

    console.log("BIEN 👉", b);
console.log("AGENT 👉", b.agentId);

    const agentPhoto =
  b.agentId?.photo
    ? (b.agentId.photo.startsWith("http")
        ? b.agentId.photo
        : `${API}${b.agentId.photo}`)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(b.agentId?.name || "Agent")}&background=000&color=fff`;

    const div = document.createElement("div");
    div.className = "property-card reveal";

    /* INCREMENTER VUES AU CLIC */
    div.onclick = () => ajouterVue(b._id);

    const createdDate = new Date(b.createdAt || Date.now());
    const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24);

    const isNew = diffDays <= 7;

    const newBadge = isNew
      ? `<span class="badge-new">NOUVEAU</span>`
      : "";

    /* ================= MEDIA ================= */

    let slides = [];

    // fusion + suppression doublons
    const medias = [...(b.videos || []), ...(b.images || [])]
  .map(m => {
    if (!m) return null;
    if (m.startsWith("http")) return m;
    return encodeURI(m);
  })
  .filter(Boolean);

// 👇 IMPORTANT : on crée uniqueMedias ici
const uniqueMedias = [...new Set(medias)];

uniqueMedias.forEach(media => {

  const fullUrl = media.startsWith("http")
    ? media
    : `${API}${media}`;

  if (media.includes(".mp4") || media.includes(".webm")) {
    slides.push(`
      <video class="property-video" autoplay muted loop playsinline>
        <source src="${fullUrl}" type="video/mp4">
      </video>
    `);
  } else {
    slides.push(`
      <img src="${fullUrl}" class="property-img">
    `);
  }

});

    const media = `
    <div class="media-container">

      <div class="media-slider">

        ${slides.map((s,i)=>`
          <div class="slide ${i===0 ? "active" : ""}">
            ${s}
          </div>
        `).join("")}

      </div>

      <button class="slide-btn prev">‹</button>
      <button class="slide-btn next">›</button>

      <div class="media-overlay"></div>

      <div class="media-top">
        <span class="badge-type ${b.propertyType}">${b.propertyType || ""}</span>
        ${newBadge}
      </div>

      <div class="price-overlay">
        ${formatPrice(b.price)} FCFA
      </div>

    </div>
    `;

    const agentName = b.agentId?.name || "Agent";
    const agentPhone = b.agentId?.phone || "";
    const agentWhatsapp = b.agentId?.whatsapp || "";

    const whatsappBtn = agentWhatsapp
      ? `<button class="whatsapp"
           onclick="window.open('https://wa.me/${agentWhatsapp}','_blank')">
           💬 WhatsApp
         </button>`
      : "";

    div.innerHTML = `

      ${media}

      <div class="property-body">

        <h3>${b.title || ""}</h3>

        <p class="location">
          📍 ${b.city || ""} - ${b.neighborhood || ""}
        </p>

        <p class="type">
          📌 ${b.type || ""}
        </p>

        <p class="views">
          👁 ${b.views || 0} vues
        </p>
        <p class="time">
  🕒 ${timeAgo(b.createdAt)}
</p>

        ${
          b.propertyType === "Terrain"
            ? `<p class="surface">📐 ${b.surface || 0} m²</p>`
            : `<p class="details">🛏️ ${b.bedrooms || 0} | 🚿 ${b.bathrooms || 0}</p>`
        }

        <div class="agent-box">

  <div class="agent-text">
    <span>👤 ${agentName}</span><br>
    <span>📞 ${agentPhone}</span>
  </div>

  <img src="${agentPhoto}" class="agent-avatar">

</div>
</div>

        <div class="contact-actions">
          ${whatsappBtn}
        </div>

      </div>
    `;

    container.appendChild(div);

  });

  /* 🔥 LANCER ANIMATION */
  initReveal();
}

/* ================= SLIDER ================= */

document.addEventListener("click", function(e){

  if(e.target.classList.contains("next")){
    e.stopPropagation();
    const container = e.target.parentElement;
    slide(container,1);
  }

  if(e.target.classList.contains("prev")){
    e.stopPropagation();
    const container = e.target.parentElement;
    slide(container,-1);
  }

});

function slide(container,dir){

  const slides = container.querySelectorAll(".slide");

  let index = 0;

  slides.forEach((s,i)=>{
    if(s.classList.contains("active")){
      index = i;
      s.classList.remove("active");
    }
  });

  index += dir;

  if(index < 0) index = slides.length-1;
  if(index >= slides.length) index = 0;

  slides[index].classList.add("active");
}

/* ================= AJOUTER VUE ================= */

async function ajouterVue(id){
  try{
    await fetch(`${API}/properties/${id}/view`,{
      method:"PUT"
    });
  }catch(e){
    console.error(e);
  }
}

/* ================= RECHERCHE ================= */

function filtrerBiens(){

  const city = document.getElementById("search-city").value.toLowerCase();
  const type = document.getElementById("search-type").value;
  const propertyType = document.getElementById("search-propertyType").value;
  const maxPrice = document.getElementById("search-price").value;

  const resultats = tousLesBiens.filter(b=>{

    const matchCity = city ? b.city?.toLowerCase().includes(city) : true;
    const matchType = type ? b.type === type : true;
    const matchPropertyType = propertyType ? b.propertyType === propertyType : true;
    const matchPrice = maxPrice ? Number(b.price) <= Number(maxPrice) : true;

    return matchCity && matchType && matchPropertyType && matchPrice;
  });

  afficherBiens(resultats);
}

/* ================= FORMAT PRIX ================= */

function formatPrice(price){
  if(!price) return "0";
  return Number(price).toLocaleString("fr-FR");
}

/* ================= ANIMATION SCROLL ================= */

function initReveal(){

  const elements = document.querySelectorAll(".reveal");

  const observer = new IntersectionObserver(entries => {

    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add("active");
      }
    });

  }, { threshold: 0.2 });

  elements.forEach(el => observer.observe(el));
}
/* ================= ONGLET BIENS / TERRAINS ================= */

let ongletActuel = "biens";

function changerOnglet(type, e) {
  ongletActuel = type;

  document.querySelectorAll(".tab").forEach(btn => btn.classList.remove("active"));
  e.target.classList.add("active");

  filtrerParOnglet();
}

function filtrerParOnglet() {
  let resultats;

  if (ongletActuel === "terrains") {
    resultats = tousLesBiens.filter(b => b.propertyType === "Terrain");
  } else {
    resultats = tousLesBiens.filter(b => b.propertyType !== "Terrain");
  }

  afficherBiens(resultats);
}
function timeAgo(date) {
  const now = new Date();
  const diff = (now - new Date(date)) / 1000; // secondes

  if (diff < 60) return "il y a quelques secondes";

  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} heure${hours > 1 ? "s" : ""}`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} jour${days > 1 ? "s" : ""}`;

  const weeks = Math.floor(days / 7);
  return `il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`;
}document.getElementById("load-more-btn")
  ?.addEventListener("click", () => {
    page++;
    chargerBiens(); // 🔥 ajoute sans supprimer les anciens
  });
