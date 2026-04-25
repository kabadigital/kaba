const API = "https://api.kaba.digital";

document.addEventListener("DOMContentLoaded", () => {

  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  chargerMesBiens();

  // Masquer chambres si Terrain
  document.getElementById("propertyType")
    .addEventListener("change", function () {
      const rooms = document.getElementById("rooms-section");
      rooms.style.display =
        this.value === "Terrain" ? "none" : "block";
    });

  // Submit form
  document.getElementById("add-property-form")
    .addEventListener("submit", ajouterBien);

});


/* ================= AJOUTER BIEN ================= */
async function ajouterBien(e) {
  e.preventDefault();

  const token = localStorage.getItem("token");
  const formData = new FormData(e.target);

  try {
    const res = await fetch(`${API}/properties`, {
      method: "POST",
      headers: {
  "Authorization": `Bearer ${token}`
}
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      alert("✅ Bien publié avec succès !");
      e.target.reset();
      chargerMesBiens();
    } else {
      alert(data.message || "Erreur publication");
    }

  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}


/* ================= CHARGER MES BIENS ================= */
async function chargerMesBiens() {

  const container = document.getElementById("my-properties");
  container.innerHTML = "<p>Chargement...</p>";

  const token = localStorage.getItem("token");

  if (!token) {
    container.innerHTML = "<p>Non connecté</p>";
    return;
  }

  try {

    const res = await fetch(`${API}/properties`, {
      headers: {
        "Authorization": `Bearer ${token}` // 🔥 IMPORTANT
      }
    });

    const data = await res.json();

    console.log("DATA:", data);

    if (!res.ok) {
      container.innerHTML = `<p>${data.message || "Erreur API"}</p>`;
      return;
    }

    // 🔥 backend filtre déjà
    const biens = data;

    container.innerHTML = "";

    if (!biens || biens.length === 0) {
      container.innerHTML = "<p>Aucun bien publié.</p>";
      return;
    }

    biens.forEach(b => {

      const div = document.createElement("div");
      div.className = "property-card";

      /* MEDIA */
      let media = "";

      if (b.videos && b.videos.length > 0) {
        media = `
          <video class="property-video" muted loop autoplay playsinline>
            <source src="${API}${b.videos[0]}" type="video/mp4">
          </video>
        `;
      } else if (b.images && b.images.length > 0) {
        media = `<img src="${API}${b.images[0]}" class="property-img">`;
      } else {
        media = `<div class="no-media">Aucun média</div>`;
      }

      /* HTML */
      div.innerHTML = `
        <div class="media-container">${media}</div>

        <div class="property-info">
          <div class="badge-type">${b.propertyType || ""}</div>

          <h3>${b.title || ""}</h3>

          <p>📍 ${b.city || ""} - ${b.neighborhood || ""}</p>

          <p class="price">
            ${Number(b.price || 0).toLocaleString()} FCFA
          </p>

          <button class="delete-btn" onclick="supprimerBien('${b._id}')">
            🗑 Supprimer
          </button>
        </div>
      `;

      container.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Erreur chargement des biens</p>";
  }
}


/* ================= SUPPRIMER BIEN ================= */
async function supprimerBien(id) {

  if (!confirm("Supprimer ce bien ?")) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API}/properties/${id}`, {
      method: "DELETE",
      headers: { "Authorization": token }
    });

    if (res.ok) {
      chargerMesBiens();
    } else {
      alert("Erreur suppression");
    }

  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}


/* ================= LOGOUT ================= */
document.getElementById("logout-btn")
  ?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });