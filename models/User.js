const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

  /* ================= INFOS DE BASE ================= */
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  phone: {
    type: String
  },

  /* ================= ROLE ================= */
  role: {
    type: String,
    enum: ["agent", "courtier"],
    required: true
  },

  /* ================= INFOS PROFESSIONNELLES (AGENT UNIQUEMENT) ================= */
  registreCommerce: {
    type: String
  },

  ninea: {
    type: String
  },

  adressePhysique: {
    type: String
  },

  documentVerification: {
    type: String // chemin fichier PDF uploadé
  },

  /* ================= STATUT ================= */
  isVerified: {
    type: Boolean,
    default: false
  },

  isPremium: {
    type: Boolean,
    default: false
  },

  /* ================= SYSTEME DE NOTATION ================= */
  rating: {
    type: Number,
    default: 0
  },

  totalReviews: {
    type: Number,
    default: 0
  },

  /* ================= DATE ================= */
  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("User", userSchema);