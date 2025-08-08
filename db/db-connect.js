const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_CLUSTER_URI}/?retryWrites=true&w=majority&appName=${process.env.MONGODB_CLUSTER_NAME}`;

const client = new MongoClient(uri);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db("portfolio");
    console.log("✅ MongoDB connected");
  }
  return db;
}

module.exports = connectDB;
