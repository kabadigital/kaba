const API = "https://kaba-dev.onrender.com";
let selectedFile = null;

document.addEventListener("DOMContentLoaded", () => {

  /* ================= USER SAFE ================= */
  /* ================= USER SAFE (ROBUSTE) ================= */
let user = null;

try {
  const stored = localStorage.getItem("user");

  if (stored && stored !== "undefined") {
    user = JSON.parse(stored);
  }

} catch (e) {
  user = null;
}

if (user) {
  document.getElementById("agent-name").innerText = user.name || "Utilisateur";
  document.getElementById("agent-role").innerText = user.role || "Agent";

  document.getElementById("profile-photo").src =
    user.photo && user.photo.startsWith("http")
      ? user.photo
      : "https://ui-avatars.com/api/?name=Agent&background=000&color=fff";
} else {
  console.log("❌ Aucun user valide dans localStorage");
}
  }

  /* ================= AUTH ================= */
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  /* ================= PREVIEW PHOTO ================= */
  const profileInput = document.getElementById("profileInput");
  const preview = document.getElementById("profile-preview");

  if (profileInput && preview) {
    profileInput.addEventListener("change", (e) => {
      selectedFile = e.target.files[0];

      if (selectedFile) {
        preview.src = URL.createObjectURL(selectedFile);
      }
    });
  }

  /* ================= SAVE PROFILE ================= */
  document.getElementById("save-profile-btn")?.addEventListener("click", async () => {

  const token = localStorage.getItem("token");

  if (!token) {
    alert("Non connecté");
    return;
  }

  if (!selectedFile) {
    alert("Choisis une image !");
    return;
  }

  const formData = new FormData();
  formData.append("photo", selectedFile);

  try {

    const res = await fetch(`${API}/agents/upload-photo`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
});

let data;

try {
  data = await res.json();
} catch {
  console.error("❌ Réponse non JSON");
  alert("Erreur serveur");
  return;
}

console.log("UPLOAD RESPONSE:", data);

if (res.ok) {

  alert("Photo mise à jour !");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  user.photo = data.photo;
  localStorage.setItem("user", JSON.stringify(user));

  document.getElementById("profile-photo").src = data.photo;
  document.getElementById("profile-preview").src = data.photo;

} else {
  alert(data.message || "Erreur upload");
}

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    alert("Erreur serveur");
  }

});

  /* ================= BIENS ================= */
  chargerMesBiens();

  document.getElementById("propertyType")
    .addEventListener("change", function () {
      const rooms = document.getElementById("rooms-section");
      rooms.style.display =
        this.value === "Terrain" ? "none" : "block";
    });

  document.getElementById("add-property-form")
    .addEventListener("submit", ajouterBien);

    if (document.getElementById("notifications")) {
  addNotification("👋 Dashboard prêt");
}

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
      },
      body: formData
    });

    let data;

try {
  data = await res.json();
} catch {
  console.error("Réponse invalide");
  alert("Erreur serveur");
  return;
}

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
        Authorization: "Bearer " + token
      }
    });

    let data;

try {
  data = await res.json();
} catch {
  console.error("Réponse invalide");
  alert("Erreur serveur");
  return;
}

    console.log("DATA:", data);

    if (!res.ok) {
      container.innerHTML = `<p>${data.message || "Erreur API"}</p>`;
      return;
    }

    const biens = data;

    container.innerHTML = "";

    if (!biens || biens.length === 0) {
      container.innerHTML = "<p>Aucun bien publié.</p>";
      return;
    }

    biens.forEach(b => {

      const div = document.createElement("div");
      div.className = "property-card";

      let media = "";

      if (b.videos && b.videos.length > 0) {

  const video = b.videos[0];
  const videoUrl = video.startsWith("http") ? video : API + video;

  media = `<video class="property-video" muted loop autoplay playsinline>
    <source src="${videoUrl}" type="video/mp4">
  </video>`;

      } else if (b.images && b.images.length > 0) {
        const img = b.images[0];

const img = b.images[0];
media = `<img src="${img.startsWith("http") ? img : API + img}" class="property-img">`;
      } else {
        media = `<div class="no-media">Aucun média</div>`;
      }

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
      headers: {
        "Authorization": `Bearer ${token}`
      }
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

  // ================= NOTIFICATIONS (LIVE FRONT SIMPLE) =================

function addNotification(msg) {
  const container = document.getElementById("notifications");

  if (!container) return;

  const div = document.createElement("div");
  div.className = "notif";
  div.innerText = msg;

  container.prepend(div);
}

