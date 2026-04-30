const API = "https://api.kaba.digital";
let selectedFile = null;

document.addEventListener("DOMContentLoaded", () => {

  /* ================= USER ================= */
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch (e) {
    user = null;
  }

  const defaultAvatar = "https://ui-avatars.com/api/?name=Agent&background=000&color=fff";

  if (user) {
    document.getElementById("agent-name").innerText = user.name || "";
    document.getElementById("agent-role").innerText = user.role || "Agent";

    document.getElementById("profile-photo").src =
      user.photo ? "https://kaba-dev.onrender.com" + user.photo : defaultAvatar;
  }

  /* ================= TOKEN ================= */
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  /* ================= PREVIEW PHOTO ================= */
  const profileInput = document.getElementById("profileInput");
  const preview = document.getElementById("profile-preview");

  profileInput?.addEventListener("change", (e) => {
    selectedFile = e.target.files[0];
    if (selectedFile) {
      preview.src = URL.createObjectURL(selectedFile);
    }
  });

  /* ================= SAVE PHOTO ================= */
  document.getElementById("save-profile-btn")?.addEventListener("click", async () => {

    if (!selectedFile) {
      return alert("Choisis une image !");
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

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Réponse non JSON:", text);
        return alert("Erreur serveur (API incorrecte)");
      }

      if (!res.ok) {
        return alert(data.message || "Erreur upload");
      }

      const url = "https://kaba-dev.onrender.com" + data.photo;

      document.getElementById("profile-photo").src = url;
      document.getElementById("profile-preview").src = url;

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      user.photo = data.photo;
      localStorage.setItem("user", JSON.stringify(user));

      alert("Photo mise à jour !");

    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      alert("Erreur réseau serveur");
    }

  });

  /* ================= BIENS ================= */
  chargerMesBiens();

  document.getElementById("propertyType")?.addEventListener("change", function () {
    const rooms = document.getElementById("rooms-section");
    if (rooms) rooms.style.display = this.value === "Terrain" ? "none" : "block";
  });

  document.getElementById("add-property-form")?.addEventListener("submit", ajouterBien);

});


/* ================= AJOUT BIEN ================= */
async function ajouterBien(e) {
  e.preventDefault();

  const token = localStorage.getItem("token");
  const formData = new FormData(e.target);

  try {
    const res = await fetch(`${API}/properties`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      return alert(data.message || "Erreur publication");
    }

    alert("Bien publié !");
    e.target.reset();
    chargerMesBiens();

  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}


/* ================= CHARGER BIENS ================= */
async function chargerMesBiens() {

  const container = document.getElementById("my-properties");
  container.innerHTML = "Chargement...";

  const token = localStorage.getItem("token");

  if (!token) {
    container.innerHTML = "Non connecté";
    return;
  }

  try {
    const res = await fetch(`${API}/properties`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = data.message || "Erreur API";
      return;
    }

    if (!data || data.length === 0) {
      container.innerHTML = "Aucun bien";
      return;
    }

    container.innerHTML = "";

    data.forEach(b => {

      const div = document.createElement("div");
      div.className = "property-card";

      let media = "";

      if (b.videos?.length) {
        media = `<video autoplay muted loop playsinline>
          <source src="${API}${b.videos[0]}" type="video/mp4">
        </video>`;
      } else if (b.images?.length) {
        media = `<img src="${API}${b.images[0]}">`;
      } else {
        media = `<div>Aucun média</div>`;
      }

      div.innerHTML = `
        <div class="media">${media}</div>
        <h3>${b.title || ""}</h3>
        <p>${b.city || ""} - ${b.neighborhood || ""}</p>
        <p>${Number(b.price || 0).toLocaleString()} FCFA</p>

        <button onclick="supprimerBien('${b._id}')">Supprimer</button>
      `;

      container.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = "Erreur chargement";
  }
}


/* ================= SUPPRIMER ================= */
async function supprimerBien(id) {

  if (!confirm("Supprimer ce bien ?")) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API}/properties/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
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
document.getElementById("logout-btn")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
});