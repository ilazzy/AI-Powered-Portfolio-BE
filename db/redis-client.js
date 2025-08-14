import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

let redisClient;

const connectRedis = async () => {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on("error", (err) => {
      console.error("Redis Error:", err);
    });

    await redisClient.connect();
    console.log("✅ Connected to Redis");
  }

  return redisClient;
};

export default connectRedis;
