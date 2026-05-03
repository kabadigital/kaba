const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// 🔥 Mets ton MongoDB Atlas ici
mongoose.connect("mongodb://kabauserpro:mouhamed90@ac-hzn0byr-shard-00-00.pa1y1ut.mongodb.net:27017,ac-hzn0byr-shard-00-01.pa1y1ut.mongodb.net:27017,ac-hzn0byr-shard-00-02.pa1y1ut.mongodb.net:27017/kaba?ssl=true&replicaSet=atlas-138rz7-shard-0&authSource=admin&retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  tls: true
});

// petit modèle Agent (simplifié pour le script)
const agentSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String
});

const Agent = mongoose.model("Agent", agentSchema);

async function run() {
  try {
    const hash = await bcrypt.hash("admin123", 10);

    await Agent.create({
      name: "Admin",
      email: "admin@kaba.digital",
      password: hash,
      role: "admin"
    });

    console.log("✅ Admin créé avec succès");
    process.exit();

  } catch (err) {
    console.error(err);
  }
}

run();