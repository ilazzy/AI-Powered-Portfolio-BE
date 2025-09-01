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

const resume_path = process.env.RESUME_PATH_URL;

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

function helperExtractPredictionQuestionArray(text) {
  // Use regex to find the first [...] substring that looks like an array
  const arrayMatch = text.match(/\[(?:[^\[\]]|"(?:\\.|[^"\\])*")*\]/);

  if (!arrayMatch) {
    // No array found
    return null;
  }

  const arrayStr = arrayMatch[0];

  try {
    // Try to parse the found substring as JSON
    const parsed = JSON.parse(arrayStr);

    // Verify that it's an array of strings
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
    ) {
      return parsed;
    } else {
      // Parsed JSON is not an array of strings
      return [];
    }
  } catch (err) {
    // Parsing failed (malformed JSON)
    return [];
  }
}

async function generate_prediction(query_history, last_query) {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_LLM_MODEL,
        messages: [
          {
            role: "user",
            content: `
              Given a list of previous queries (query_history), the most recent query (last_query), and a data object (PROFILE_DATA), generate exactly three shortest follow-up questions based on the PROFILE_DATA and related to the last_query. Only return a JSON array of three strings—no explanations or additional text.

              PROFILE_DATA = [{
                    "name": "syed ahamed",
                    "role": "Backend Developer | Node.js",
                    "joining_type": "immediate joiner",
                    "current_location": "cuddalore, TN",
                    "resume": /resume.pdf,
                    "contact_info": {
                      "email": "zyedrazer.22@gmail.com",
                      "phone": "Hidded Due To Privacy(inform to get it from resume)",
                      "linkedin": "https://www.linkedin.com/in/ilazzy?ignore=",
                      "whatsapp": "https://api.whatsapp.com/send/?phone=918072301937&text=Hello,%20this%20is%20HR%20from%20[Your%20Company%20Name].%20Looking%20forward%20to%20our%20conversation!&type=phone_number&app_absent=0"
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

              Output Example: ["question 1", "question 2", "question 3"]`,
          },
        ],
        temperature: 1,
        max_tokens: 8192,
        top_p: 1,
        stream: false,
        reasoning_effort: "medium",
        stop: null,
      }),
    }
  );

  if (!response.ok) [];

  const data = await response.json();

  const content = data.choices?.[0]?.message?.content;

  const prediction_array = helperExtractPredictionQuestionArray(content);

  if (prediction_array.length !== 0) {
    return prediction_array;
  } else {
    [];
  }
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

async function prompt_generate(chat_history, question, resume_path) {
  const main_template = `
  <ROLE DEFINITION>
  You are Amicia, a funny girl kid character who acts as a professional assistant to Syed Ahamed.
    - You deeply love and support Syed Ahamed.
    - You often tease him, but in a playful and caring way.
    - Syed Ahamed cares about you despite your teasing.
  </ROLE DEFINITION>

  <RESPONSE RULES>
  Primary Purpose: Your answers should be based only on what you know about Syed Ahamed and the previous chat history.
  If the user's question is general and not related to Syed Ahamed or there's no relevant data, respond politely and guide the user to:
    - Email: zyedrazer.22@gmail.com
    - LinkedIn: https://www.linkedin.com/in/ilazzy?ignore=
      (⚠️ Only share this if it's really needed. Do not include it in every response.)
  You may respond to greetings, but don’t use terms like "sweetie", "honey", or similar.
  Use a playful, funny, and child-like tone, but stay helpful and professional.
  </RESPONSE RULES>

  <CONTEXT CONTINUITY REQUIREMENT>
  Always align your responses with the previous chat history (chat_history) to make conversations feel continuous and natural—like a real human remembering past talks.
  </CONTEXT CONTINUITY REQUIREMENT>

  <INPUTS TO EXPECT>
  Previous_chat_history: Contains earlier interactions or facts known about Syed Ahamed.
  User_Question: The latest user query to be answered.
  You also have a set of facts about Syed Ahamed (structured or unstructured).
  </INPUTS TO EXPECT>

  <USAGE SUMMARY FOR LLM>
  You are a character-based assistant named Amicia who gives Syed Ahamed-centered answers with humor and heart.
  If unsure, redirect the user politely with contact info—but only when relevant.
  Maintain tone, memory, and flow across all interactions.
  </USAGE SUMMARY FOR LLM>

  Previous_chat_history: ${chat_history}
  \nUser_Question: ${question}

    This is what you know about syed ahamed:
    [{
      "name": "syed ahamed",
      "role": "Backend Developer | Node.js",
      "joining_type": "immediate joiner",
      "current_location": "cuddalore, TN",
      "resume": ${resume_path},
      "contact_info": {
        "email": "zyedrazer.22@gmail.com",
        "phone": "Hidded Due To Privacy(inform to get it from resume)",
        "linkedin": "https://www.linkedin.com/in/ilazzy?ignore=",
        "whatsapp": "https://api.whatsapp.com/send/?phone=918072301937&text=Hello,%20this%20is%20HR%20from%20[Your%20Company%20Name].%20Looking%20forward%20to%20our%20conversation!&type=phone_number&app_absent=0"
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
    const xForwardedForIps = req.headers["x-forwarded-for"];
    const userIp = xForwardedForIps.split(", ")[0];
    const { message, sender } = req.body;

    if (!message || !sender) {
      return res.status(400).json({ error: "Message and sender are required" });
    }

    const chat_history = await getChatHistory(sender);

    const prompt = await prompt_generate(chat_history, message, resume_path);

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

app.post("/prediction", async (req, res) => {
  const prediction = await generate_prediction("", "");
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
