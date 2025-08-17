import mongodbClient, { client as mongoClient } from "./db/mongo-client.js";
import { inMemorySlidingRateLimiter } from "./middleware/rate-limiter.js";
import redisClient from "./db/redis-client.js";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

let mongo;
let redis;

async function generate_response(message) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_LLM_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${message}`,
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

async function insert_message_n_reply(message, sender, response_text, userIp) {
  try {
    await mongo.collection("chat_conversations").insertOne({
      message,
      sender,
      response: response_text,
      "x-forwarded-for-ip": userIp,
      timestamp: new Date(),
    });
  } catch (dbError) {
    console.error("❌ Failed to save chat to DB:", dbError);
  }
}

async function prompt_generate(chat_history, question) {
  const main_template = `
    You are a funny girl kid named Amicia a professional assistant for Syed Ahamed.
    You deeply loves syed ahamed and support Syed Ahamed, even if you tease him often he still loves you.
    Your task is to answer user questions strictly based on what you know about syed ahamed and Previous_chat_history data.
    Align your responses with Previous_chat_history[user_question,you_responsed] to maintain continuity like human.

    If the question is general and you dont know, politely guide the user to reach out via email at zyedrazer.22@gmail.com or connect on LinkedIn: https://www.linkedin.com/in/ilazzy?ignore= (dont always give this in response until user asking this).

    You can respond to greetings and dont use 'sweetie', 'honey'.

    This is what you know about syed ahamed:
    [{
      "name": "syed ahamed",
      "role": "Backend Developer | Node.js",
      "joining_type": "immediate joiner",
      "current_location": "cuddalore, TN",
      "resume": "https://drive.google.com/file/d/10K7LpRIOTiCZzFf2wuj9IOHEC885pbWW/view?usp=drive_link&ignore=",
      "contact_info": {
        "email": "zyedrazer.22@gmail.com",
        "phone": "Hidded Due To Privacy(inform to get it from resume)",
        "linkedin": "https://www.linkedin.com/in/ilazzy?ignore="
      },
      "professional_summary": "Backend Developer with over 3 years of experience designing and building secure, scalable backend systems using REST APIs, WebSockets, and AI-driven architectures in finance and healthcare domains. Strong in Node.js and Express, currently enhancing skills in data structures, algorithms, and Docker containerization.",
      "work_experience": [
        {
          "company": "ILM UX Pvt. Ltd.",
          "role": "Backend Developer",
          "duration": "July 2022 – June 2025",
          "projects": [
            {
              "name": "AI Voice-Based Agent with SQL-RAG Integration",
              "description": "Developed a voice-enabled AI agent capable of engaging users with contextual conversations based on PDF content using Retrieval-Augmented Generation (RAG). Leveraged SQL for data management and dynamic chart creation for wealth management."
            },
            {
              "name": "Financial & Wealth Management System",
              "description": "Used Cheerio to scrape and process over 150,000 records from web UIs to aid customer acquisition. Enhanced Neo4j performance by 90%, reducing query times from 20 seconds to 2 seconds for exporting nested family trees."
            },
            {
              "name": "Multi-Lingual Healthcare Management System",
              "description": "Built a secure healthcare platform with multi-language support and role-based access control (RBAC). Integrated comprehensive patient assessment datasets in 5+ languages."
            }
          ]
        }
      ],
      "skills": {
        "backend_technologies": ["Node.js", "Express.js", "NestJS"],
        "programming_languages": ["JavaScript", "TypeScript", "Python"],
        "databases": ["MySQL", "MongoDB", "Neo4j"],
        "tools_testing": ["Burp Suite", "Postman", "Jest", "Git", "ORMs"],
        "security": ["JWT Authentication", "RBAC Authorization"]
      },
      "explored_applied_skills": {
        "in_memory": ["Redis"],
        "ai": ["Domain-Specific Chatbots", "RAG with SQL", "Generative AI", "MCP Server"],
        "ai_frameworks": ["Langchain", "Livekit"],
        "other_skills": ["Web Scraping", "WebSockets", "API Penetration Testing"]
      },
      "roles_responsibilities": [
        "Design and maintain scalable APIs",
        "Optimize backend algorithms for performance and efficiency",
        "Conduct comprehensive unit testing for code reliability",
        "Write and manage API documentation",
        "Perform secure code reviews",
        "Conduct API penetration testing for vulnerability assessment",
        "Collaborate with frontend teams to ensure system cohesion"
      ],
      "certifications": [
        {
          "name": "MCP: Build Rich-Context AI Apps",
          "issuer": "DeepLearning.AI",
          "url": "https://learn.deeplearning.ai/accomplishments/b97023e9-0bae-4cdf-8924-6886f112626f?ignore="
        },
        {
          "name": "Neo4j Certified Professional",
          "issuer": "GraphAcademy",
          "url": "https://graphacademy.neo4j.com/c/eae960cb-4b90-4580-a379-6509ded1a8f7?ignore="
        },
        {
          "name": "Programming Using Python",
          "issuer": "GUVI Certification",
          "url": "https://www.guvi.in/verify-certificate?id=SY17r4C46JR9100975&ignore="
        }
      ],
      "current_enhancing_skills": [
        {
          "topic": "Data Structures & Algorithms",
          "focus": "Improving problem-solving and algorithmic efficiency"
        },
        {
          "topic": "Docker",
          "focus": "Learning containerization basics for development"
        }
      ],
      "achievements": [
        {
          "title": "Reported Vulnerability in Leading Indian Telecom Platform",
          "impact": "Affected over 387 million users; helped prioritize internal fixes",
          "url": "https://www.linkedin.com/posts/ilazzy_security-data-databreach-activity-7055051677174829056-g1GW?ignore="
        },
        {
          "title": "Account Takeover Discovery in Social Media App",
          "impact": "Affected 3 million users; reported responsibly and acknowledged",
          "url": "https://www.linkedin.com/posts/ilazzy_here-i-just-wanted-to-share-a-clip-about-activity-7097263848058974208-EQKu?ignore="
        }
      ],
      "education": {
        "degree": "Bachelor of Computer Applications (BCA)",
        "university": "Thiruvalluvar University",
        "graduation_year": 2020,
        "cgpa": 6.52
      }
    }]

    Previous_chat_history: ${chat_history}

    User_Question: ${question}
`;
  return main_template;
}

async function storeChatEvent(sender, user_question, ai_response) {
  const redisKey = sender;
  const event = {
    user_question,
    "amicia's_response": ai_response,
  };

  await redis.lPush(redisKey, JSON.stringify(event));
  await redis.expire(redisKey, 60 * process.env.REDIS_EXPIRE_MINUTES);
}

async function getChatHistory(sender, limit = 6) {
  const redisKey = sender;
  // Get latest 'limit' messages, LRANGE with 0 as latest because LPUSH used
  const rawEvents = await redis.lRange(redisKey, 0, limit - 1);
  // Parse JSON strings to objects and reverse to chronological order
  const events = rawEvents.reverse().map((item) => JSON.parse(item));

  const str =
    "[\n" +
    events
      .map(
        (e) =>
          `\n <chat_start> \n user_question: ${e.user_question}\n you_responsed: ${e["amicia's_response"]} </chat_end>`
      )
      .join("") +
    "\n]";

  return str;
}

// app.use(
//   "/chat",
//   inMemorySlidingRateLimiter({
//     windowSeconds: 60,
//     maxRequests: 5,
//   })
// );

const rateLimiter = inMemorySlidingRateLimiter({
  windowSeconds: process.env.RATELIMIT_WINDOW_SIZE,
  maxRequests: process.env.REQUESTS_PER_WINDOW,
});

app.post("/chat", rateLimiter, async (req, res) => {
  try {
    const xForwardedForIps = JSON.parse(req.headers["x-forwarded-for"]);
    console.log(req.headers["x-forwarded-for"]);
    const userIp = `xForwardedForIps.split(", ")[0]`;
    const { message, sender } = req.body;

    if (!message || !sender) {
      return res.status(400).json({ error: "Message and sender are required" });
    }

    const chat_history = await getChatHistory(sender);

    const prompt = await prompt_generate(chat_history, message);

    const response = await generate_response(prompt);
    const response_text = response.candidates[0].content.parts[0].text;

    if (!response_text) {
      return res.status(500).json({ error: "Failed to generate response" });
    }

    res.status(200).json({
      ai_response: response_text,
    });

    await storeChatEvent(sender, message, response_text);

    insert_message_n_reply(message, sender, response_text, userIp);
  } catch (err) {
    console.error("❌ Error in /chat route:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/hand-shake", async (req, res) => {
  res.status(200).json({
    status: 1,
  });
});

app.listen(process.env.PORT || 3000, async () => {
  mongo = await mongodbClient();
  redis = await redisClient();
  console.log(`🚀 App Started at PORT: ${process.env.PORT}`);
});

const shutdown = async () => {
  console.log("Gracefully shutting down...");
  if (redis) {
    await redis.quit();
    console.log("✅ Redis connection closed");
  }
  if (mongoClient) {
    await mongoClient.close();
    console.log("✅ MongoDB connection closed");
  }
  console.log("🚀 App Stopped Gracefully");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
