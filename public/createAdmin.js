const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

mongoose.connect("MONGO_URI=mongodb://kabauserpro:mouhamed90@ac-hzn0byr-shard-00-00.pa1y1ut.mongodb.net:27017,ac-hzn0byr-shard-00-01.pa1y1ut.mongodb.net:27017,ac-hzn0byr-shard-00-02.pa1y1ut.mongodb.net:27017/kaba?ssl=true&replicaSet=atlas-138rz7-shard-0&authSource=admin&retryWrites=true&w=majority");

const Agent = require("./models/Agent"); // adapte chemin

async function run(){
  const hash = await bcrypt.hash("admin123", 10);

  await Agent.create({
    name: "Admin",
    email: "admin@kaba.digital",
    password: hash,
    role: "admin"
  });

  console.log("Admin créé");
  process.exit();
}

run();