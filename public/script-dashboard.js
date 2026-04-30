const API = "https://api.kaba.digital";
let selectedFile = null;

/* ================= SAFE FETCH ================= */
async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Réponse non JSON:", text);
      throw new Error("Erreur serveur (réponse invalide)");
    }

    if (!res.ok) {
      throw new Error(data.message || "Erreur API");
    }

    return data;

  } catch (err) {
    console.error(err);
    alert(err.message);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {

  /* ================= USER SAFE ================= */
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch (e) {
    user = null;
  }

  if (user) {
    document.getElementById("agent-name").innerText = user.name;
    document.getElementById("agent-role").innerText = user.role || "Agent";

    document.getElementById("profile-photo").src =
      user.photo
        ? "https://kaba-dev.onrender.com" + user.photo
        : "https://ui-avatars.com/api/?name=Agent&background=000&color=fff";
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

    if (!selectedFile) {
      alert("Choisis une image !");
      return;
    }

    const formData = new FormData();
    formData.append("photo", selectedFile);

    const data = await safeFetch(`${API}/agents/upload-photo`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token
      },
      body: formData
    });

    if (!data) return;

    alert("Photo mise à jour !");

    const url = "https://kaba-dev.onrender.com" + data.photo;

    document.getElementById("profile-photo").src = url;
    document.getElementById("profile-preview").src = url;

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    user.photo = data.photo;
    localStorage.setItem("user", JSON.stringify(user));
  });

  /* ================= BIENS ================= */
  chargerMesBiens();

  document.getElementById("propertyType")
    .addEventListener("change", function () {
      const rooms = document.getElementById("rooms-section");
      rooms.style.display = this.value === "Terrain" ? "none" : "block";
    });

  document.getElementById("add-property-form")
    .addEventListener("submit", ajouterBien);
});

/* ================= AJOUTER BIEN ================= */
async function ajouterBien(e) {
  e.preventDefault();

  const token = localStorage.getItem("token");
  const formData = new FormData(e.target);

  const data = await safeFetch(`${API}/properties`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token
    },
    body: formData
  });

  if (!data) return;

  alert("✅ Bien publié !");
  e.target.reset();
  chargerMesBiens();
}

/* ================= CHARGER BIENS ================= */
async function chargerMesBiens() {

  const container = document.getElementById("my-properties");
  container.innerHTML = "<p>Chargement...</p>";

  const token = localStorage.getItem("token");

  if (!token) {
    container.innerHTML = "<p>Non connecté</p>";
    return;
  }

  const data = await safeFetch(`${API}/properties`, {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  if (!data) {
    container.innerHTML = "<p>Erreur chargement</p>";
    return;
  }

  const biens = data;

  container.innerHTML = "";

  if (!biens.length) {
    container.innerHTML = "<p>Aucun bien</p>";
    return;
  }

  biens.forEach(b => {

    const div = document.createElement("div");
    div.className = "property-card";

    let media = "";

    if (b.videos?.length) {
      media = `<video class="property-video" autoplay muted loop playsinline>
        <source src="${API}${b.videos[0]}" type="video/mp4">
      </video>`;
    } else if (b.images?.length) {
      media = `<img src="${API}${b.images[0]}" class="property-img">`;
    } else {
      media = `<div class="no-media">Aucun média</div>`;
    }

    div.innerHTML = `
      <div class="media-container">${media}</div>
      <div class="property-info">
        <h3>${b.title || ""}</h3>
        <p>${b.city || ""} - ${b.neighborhood || ""}</p>
        <p>${Number(b.price || 0).toLocaleString()} FCFA</p>

        <button onclick="supprimerBien('${b._id}')">🗑 Supprimer</button>
      </div>
    `;

    container.appendChild(div);
  });
}

/* ================= SUPPRIMER ================= */
async function supprimerBien(id) {

  if (!confirm("Supprimer ?")) return;

  const token = localStorage.getItem("token");

  const data = await safeFetch(`${API}/properties/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + token
    }
  });

  if (data) chargerMesBiens();
}

/* ================= LOGOUT ================= */
document.getElementById("logout-btn")
  ?.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
  });