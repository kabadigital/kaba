const express = require("express");
const Property = require("../models/Property");
const Agent = require("../models/Agent");

const router = express.Router();

/* ================= AJOUTER BIEN ================= */
router.post("/", async (req, res) => {
  try {
    const property = new Property(req.body);
    await property.save();
    res.json(property);
  } catch (err) {
    res.status(400).json({ message: "Erreur ajout bien" });
  }
});

/* ================= AFFICHER TOUS LES BIENS ================= */
router.get("/", async (req, res) => {
  try {
    const properties = await Property.find()
      .populate("agentId", "name whatsapp phone isCertified rating");

    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: "Erreur récupération biens" });
  }
});

/* ================= AFFICHER 1 BIEN (DETAIL) ================= */
router.get("/:id", async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate("agentId", "name whatsapp phone isCertified rating");

    if (!property)
      return res.status(404).json({ message: "Bien introuvable" });

    res.json(property);

  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/* ================= INCREMENTER VUES ================= */
router.put("/:id/view", async (req, res) => {
  try {

    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!property)
      return res.status(404).json({ message: "Bien introuvable" });

    res.json({ views: property.views });

  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;