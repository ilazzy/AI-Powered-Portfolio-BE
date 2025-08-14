import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_CLUSTER_URI}/?retryWrites=true&w=majority&appName=${process.env.MONGODB_CLUSTER_NAME}`;

const client = new MongoClient(uri);
let db;

const connect = async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db("portfolio");
    console.log("✅ Connected to MongoDB");
  }
  return db;
};


export { client };
export default connect;
