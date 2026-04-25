process.on("uncaughtException", err => {
  console.error("🔥 Uncaught Exception:", err);
});

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const path = require("path");
const PORT = process.env.PORT || 3000;

/* ============================= ROUTE HEALTH CHECK ============================= */
app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

/* DOSSIER UPLOADS */
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir));
app.use(express.static(path.join(__dirname, "public")));

/* ============================= CONNEXION MONGODB ============================= */

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000
})
.then(() => {
  console.log("✅ MongoDB connecté");

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });

})
.catch(err => {
  console.error("❌ MongoDB error :", err);
});

/* ============================= CONFIGURATION MULTER ============================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const clean = file.originalname.replace(/\s/g, "_");
    cb(null, Date.now() + "-" + clean);
  }
});
const upload = multer({ storage });

/* ============================= UPLOAD CLOUDINARY ============================= */

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier envoyé" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
  folder: "kaba",
  resource_type: "auto" // 🔥 IMPORTANT pour les vidéos
});

    // suppression du fichier local après upload
    if (req.file.path) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      url: result.secure_url,
      type: result.resource_type
    });

  } catch (err) {
    console.error("Upload error:", err);

    res.status(500).json({
      message: "Erreur upload Cloudinary",
      error: err.message
    });
  }
});

/* ============================= MODELE AGENT ============================= */
const agentSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  whatsapp: String,
  phone: String,
  photo: String,
  role: { type: String, enum: ["agent", "courtier"], default: "agent" },
  isBanned: { type: Boolean, default: false }, // ✅ virgule
  isCertified: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 }
});
agentSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password);
};
const Agent = mongoose.model("Agent", agentSchema);

/* ============================= MODELE PROPERTY ============================= */
const propertySchema = new mongoose.Schema({
  title: String,
  city: String,
  neighborhood: String,
  type: { type: String, enum: ["Vente", "Location"], required: true },
  propertyType: { type: String, enum: ["Maison","Appartement","Studio","Chambre","Commerce","Terrain"], required: true },
  surface: Number,
  bedrooms: Number,
  bathrooms: Number,
  price: Number,
  images: [String],
  videos: [String],
  isPremium: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent" },
  createdAt: { type: Date, default: Date.now }
});
const Property = mongoose.model("Property", propertySchema);

/* ============================= MODELE MESSAGE ============================= */
const messageSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent" },
  content: String,
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", messageSchema);

/* ============================= MIDDLEWARE AUTH ============================= */
const auth = (req, res, next) => {

  const header = req.headers["authorization"];

  if (!header) {
    return res.status(401).json({ message: "Token manquant" });
  }

  // 🔥 EXTRACTION DU TOKEN
  const token = header.startsWith("Bearer ")
    ? header.split(" ")[1]
    : header;

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.agentId = decoded.id;
    req.role = decoded.role;

    next();

  } catch {
    res.status(401).json({ message: "Token invalide" });
  }
};

/* ============================= ROUTE INSCRIPTION ============================= */
app.post("/agents/register", upload.single("photo"), async (req, res) => {
  try {
    const hashed = await bcrypt.hash(req.body.password, 10);
    const agent = await Agent.create({
      name: req.body.name,
      email: req.body.email,
      password: hashed,
      whatsapp: req.body.whatsapp,
      phone: req.body.phone,
      photo: req.file ? "/uploads/" + req.file.filename : "",
      role: req.body.role
    });
    res.json({ success: true, message: "Utilisateur créé", agent });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/* ============================= ROUTE LOGIN ============================= */
app.post("/login", async (req, res) => {
  try {
    const agent = await Agent.findOne({ email: req.body.email });
    if (!agent) return res.status(400).json({ message: "Email inconnu" });

if(agent.isBanned){
  return res.status(403).json({ message: "⛔ Compte banni" });
}

    const valid = await agent.comparePassword(req.body.password);
    if (!valid) return res.status(400).json({ message: "Mot de passe incorrect" });

    const token = jwt.sign({ id: agent._id, role: agent.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({ token, agent: { id: agent._id, name: agent.name, role: agent.role, whatsapp: agent.whatsapp, phone: agent.phone } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/agents", auth, async (req, res) => {

  if(req.role !== "admin"){
    return res.status(403).json({ message: "Accès refusé" });
  }

  const users = await Agent.find().select("-password");
  res.json(users);

});

/* ============================= ROUTE CREER BIEN ============================= */
app.post(
  "/properties",
  auth,
  upload.fields([{ name: "images", maxCount: 10 }, { name: "videos", maxCount: 5 }]),
  async (req, res) => {
    try {
      const images = req.files["images"] ? req.files["images"].map(f => "/uploads/" + f.filename) : [];
      const videos = req.files["videos"] ? req.files["videos"].map(f => "/uploads/" + f.filename) : [];

      const property = await Property.create({
        title: req.body.title,
        city: req.body.city,
        neighborhood: req.body.neighborhood,
        type: req.body.type,
        propertyType: req.body.propertyType,
        bedrooms: req.body.bedrooms,
        bathrooms: req.body.bathrooms,
        surface: req.body.surface,
        price: req.body.price,
        images,
        videos,
        isPremium: req.body.isPremium === "true",
        agentId: req.agentId
      });

      res.json(property);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

/* ============================= ROUTE GET TOUS LES BIENS ============================= */
app.get("/public/properties", async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 35;
    const skip = (page - 1) * limit;

    const biens = await Property.find()
      .populate("agentId", "name phone whatsapp")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(biens);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/properties", auth, async (req, res) => {

  try{

    let biens;

    // 🛠️ ADMIN → voit tout
    if(req.role === "admin"){
      biens = await Property.find().populate("agentId", "name role");
    }

    // 👤 AGENT / COURTIER → voit ses biens
    else{
      biens = await Property.find({ agentId: req.agentId })
        .populate("agentId", "name role");
    }

    res.json(biens);

  }catch(err){
    res.status(500).json({ message: err.message });
  }

});

app.put("/admin/ban/:id", auth, async (req, res) => {

  if(req.role !== "admin"){
    return res.status(403).json({ message: "Accès refusé" });
  }

  try{

    const user = await Agent.findById(req.params.id);

    if(!user){
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    user.isBanned = !user.isBanned; // toggle
    await user.save();

    res.json({ success: true, banned: user.isBanned });

  }catch(err){
    res.status(500).json({ message: err.message });
  }

});

/* ============================= ROUTE GET BIEN PAR ID ============================= */
app.get("/properties/:id", async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate("agentId", "name whatsapp phone role isCertified rating isPremium");

    if (!property) return res.status(404).json({ message: "Bien non trouvé" });

    res.json(property);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================= ROUTE INCREMENTER VUES ============================= */
app.put("/properties/:id/view", async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Bien introuvable" });

    property.views += 1;
    await property.save();

    res.json({ views: property.views });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================= ROUTE MESSAGERIE ============================= */
app.post("/messages", auth, async (req, res) => {
  try {
    const msg = await Message.create({
      propertyId: req.body.propertyId,
      senderId: req.agentId,
      content: req.body.content
    });
    res.json(msg);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get("/messages/:propertyId", async (req, res) => {
  try {
    const messages = await Message.find({ propertyId: req.params.propertyId })
      .populate("senderId", "name");
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================= ROUTE SUPPRIMER BIEN ============================= */
app.delete("/properties/:id", auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Bien non trouvé" });

    const isOwner = property.agentId.toString() === req.agentId;
    const isAdmin = req.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    await property.deleteOne();
    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= ADMIN DATA ================= */

app.get("/admin/data", async (req, res) => {
  try {

    const biens = await Property.find()
      .populate("agentId", "name phone")
      .sort({ createdAt: -1 });

    const agents = await Agent.find();

    res.json({
      biens,
      agents
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
/* ================= MODIFIER BIEN ================= */

app.put("/properties/:id", auth, async (req, res) => {

  try{

    const property = await Property.findById(req.params.id);
    if(!property) return res.status(404).json({ message: "Bien non trouvé" });

    // sécurité
    if(property.agentId.toString() !== req.agentId && req.role !== "courtier"){
      return res.status(403).json({ message: "Non autorisé" });
    }

    // update
    Object.assign(property, req.body);

    await property.save();

    res.json({ success:true, property });

  }catch(err){
    res.status(500).json({ message: err.message });
  }

});
/* ============================= CREATE ADMIN ============================= */
app.post("/admin/create", auth, async (req, res) => {

  try{

    // 🔐 sécurité : seul un admin peut créer un admin
    if(req.role !== "admin"){
      return res.status(403).json({ message: "Accès refusé" });
    }

    const { name, email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const admin = await Agent.create({
      name,
      email,
      password: hashed,
      role: "admin" // 👑 IMPORTANT
    });

    res.json({ success: true, admin });

  }catch(err){
    res.status(400).json({ message: err.message });
  }

});