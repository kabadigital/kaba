const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

mongoose.connect("mongodb://kabauserpro:FLKmcamxt8crnl1b@ac-hzn0byr-shard-00-00.pa1y1ut.mongodb.net:27017,ac-hzn0byr-shard-00-01.pa1y1ut.mongodb.net:27017,ac-hzn0byr-shard-00-02.pa1y1ut.mongodb.net:27017/kaba?ssl=true&replicaSet=atlas-138rz7-shard-0&authSource=admin&retryWrites=true&w=majority");

const agentSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String
});

const Agent = mongoose.model("Agent", agentSchema);

async function run() {
  try {

    const hash = await bcrypt.hash("FLKmcamxt8crnl1b", 10);

    const user = await Agent.findOneAndUpdate(
      { email: "admin@kaba.digital" },
      { password: hash },
      { new: true }
    );

    console.log("✅ Mot de passe changé :", user.email);
    process.exit();

  } catch (err) {
    console.error(err);
  }
}

run();