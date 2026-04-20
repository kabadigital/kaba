const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const auth = require("../middleware/auth");

// Envoyer message
router.post("/", auth, async (req, res) => {
  try {
    const { propertyId, message } = req.body;

    const newMessage = new Message({
      propertyId,
      senderId: req.agent.id,
      receiverId: req.body.receiverId,
      message
    });

    await newMessage.save();
    res.json({ message: "Message envoyé" });

  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Voir messages d’un bien
router.get("/:propertyId", auth, async (req, res) => {
  const messages = await Message.find({
    propertyId: req.params.propertyId
  }).populate("senderId receiverId");

  res.json(messages);
});

module.exports = router;