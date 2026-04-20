const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({

  title: String,
  city: String,
  neighborhood: String,

  type: {
    type: String,
    enum: ["Vente", "Location"],
    required: true
  },

  propertyType: {
    type: String,
    enum: ["Maison", "Appartement", "Studio", "Chambre", "Commerce", "Terrain"],
    required: true
  },

  surface: {
    type: Number,
    required: true
  },

  bedrooms: Number,
  bathrooms: Number,

  price: {
    type: Number,
    required: true
  },

  images: [String],

  // 🔥 MULTI VIDEOS
  videos: [String],

  // 🔥 PREMIUM BADGE
  isPremium: {
    type: Boolean,
    default: false
  },

  // 🔥 COMPTEUR VUES
  views: {
    type: Number,
    default: 0
  },

  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agent"
  }

}, { timestamps: true });

module.exports = mongoose.model("Property", propertySchema);