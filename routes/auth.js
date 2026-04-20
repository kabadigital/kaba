const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Agent = require("../models/Agent");

const router = express.Router();

const SECRET = "kaba_secret_key";

// ================= INSCRIPTION =================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, whatsapp, phone } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const agent = new Agent({
      name,
      email,
      password: hashedPassword,
      role,
      whatsapp,
      phone
    });

    await agent.save();

    res.json({ message: "Inscription réussie" });
  } catch (err) {
    res.status(400).json({ message: "Erreur inscription" });
  }
});

// ================= CONNEXION =================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const agent = await Agent.findOne({ email });
    if (!agent) return res.status(400).json({ message: "Utilisateur non trouvé" });

    const validPassword = await bcrypt.compare(password, agent.password);
    if (!validPassword) return res.status(400).json({ message: "Mot de passe incorrect" });

    const token = jwt.sign({ id: agent._id }, SECRET);

    res.json({
      token,
      agent: {
        id: agent._id,
        name: agent.name,
        role: agent.role,
        whatsapp: agent.whatsapp,
        phone: agent.phone
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;