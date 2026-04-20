const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property"
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agent"
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agent"
  },
  message: String
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);