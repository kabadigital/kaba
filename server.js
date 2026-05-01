
/* ===================== GLOBAL SAFETY ===================== */
process.on("uncaughtException", err => {
  console.error("🔥 Uncaught Exception:", err);
});

process.on("unhandledRejection", err => {
  console.error("🔥 Unhandled Rejection:", err);
});

/* ===================== IMPORTS ===================== */
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cloudinary = require("cloudinary").v2;

/* ===================== APP INIT ===================== */
const app = express();
const PORT = process.env.PORT || 3000;

/* ===================== CLOUDINARY ===================== */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ===================== MIDDLEWARE ===================== */
app.use(cors());
app.use(express.json());

/* ===================== LOCAL UPLOAD (TEMP ONLY) ===================== */
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname.replace(/\s/g, "_"));
  }
});

const upload = multer({ storage });

/* ===================== AUTH MIDDLEWARE ===================== */
const auth = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ message: "Token manquant" });
  }

  const token = header.startsWith("Bearer ")
    ? header.split(" ")[1]
    : header;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.agentId = decoded.id;
    req.role = decoded.role;
    next();
  } catch {
    return res.status(401).json({ message: "Token invalide" });
  }
};

/* ===================== ADMIN MIDDLEWARE ===================== */
const isAdmin = (req, res, next) => {
  if (req.role !== "admin") {
    return res.status(403).json({ message: "Accès refusé admin" });
  }
  next();
};

/* ===================== HEALTH CHECK ===================== */
app.get("/healthz", (req, res) => res.send("OK"));

/* ===================== MONGODB ===================== */
mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log("✅ MongoDB connecté");

  app.listen(PORT, "0.0.0.0", () => {
    console.log("🚀 Server running on", PORT);
  });

})
.catch(err => console.error("❌ MongoDB error:", err));

/* ===================== MODELS ===================== */
const agentSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  photo: String,
  role: { type: String, default: "agent" },
  isBanned: { type: Boolean, default: false }
});

const Agent = mongoose.model("Agent", agentSchema);

const propertySchema = new mongoose.Schema({
  title: String,
  city: String,
  price: Number,
  images: [String],
  videos: [String],
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent" },
  createdAt: { type: Date, default: Date.now }
});

const Property = mongoose.model("Property", propertySchema);

/* ===================== CLOUDINARY UPLOAD ===================== */
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "kaba",
      resource_type: "auto"
    });

    fs.unlinkSync(req.file.path);

    res.json({
      url: result.secure_url,
      type: result.resource_type
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload error" });
  }
});

/* ===================== REGISTER ===================== */
app.post("/agents/register", upload.single("photo"), async (req, res) => {
  try {
    const hashed = await bcrypt.hash(req.body.password, 10);

    let photoUrl = "";

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "agents"
      });
      photoUrl = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    const agent = await Agent.create({
      name: req.body.name,
      email: req.body.email,
      password: hashed,
      photo: photoUrl
    });

    res.json(agent);

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ===================== LOGIN ===================== */
app.post("/login", async (req, res) => {
  try {
    const agent = await Agent.findOne({ email: req.body.email });
    if (!agent) return res.status(400).json({ message: "Email invalide" });

    const ok = await bcrypt.compare(req.body.password, agent.password);
    if (!ok) return res.status(400).json({ message: "Mot de passe incorrect" });

    const token = jwt.sign(
      { id: agent._id, role: agent.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, agent });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===================== UPDATE PHOTO (CLOUDINARY ONLY) ===================== */
app.post("/agents/upload-photo", auth, upload.single("photo"), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "agents"
    });

    fs.unlinkSync(req.file.path);

    await Agent.findByIdAndUpdate(req.agentId, {
      photo: result.secure_url
    });

    res.json({
      photo: result.secure_url
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===================== PROPERTIES ===================== */
app.post("/properties", auth, upload.fields([
  { name: "images", maxCount: 10 },
  { name: "videos", maxCount: 5 }
]), async (req, res) => {
  try {

    const images = req.files?.images?.map(f => "/uploads/" + f.filename) || [];
    const videos = req.files?.videos?.map(f => "/uploads/" + f.filename) || [];

    const property = await Property.create({
      title: req.body.title,
      city: req.body.city,
      price: req.body.price,
      images,
      videos,
      agentId: req.agentId
    });

    res.json(property);

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ===================== GET PROPERTIES ===================== */
app.get("/properties", auth, async (req, res) => {
  const data = await Property.find({ agentId: req.agentId });
  res.json(data);
});

/* ===================== DELETE PROPERTY ===================== */
app.delete("/properties/:id", auth, async (req, res) => {
  await Property.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* ===================== ADMIN ===================== */
app.get("/agents", auth, isAdmin, async (req, res) => {
  const users = await Agent.find().select("-password");
  res.json(users);
});