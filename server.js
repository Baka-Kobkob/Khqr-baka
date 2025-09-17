import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import NodeCache from "node-cache";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize cache
const cacheTTL = parseInt(process.env.CACHE_TTL) || 30;
const cache = new NodeCache({ stdTTL: cacheTTL });

// Middleware to parse JSON bodies
app.use(express.json());

// Proxy API endpoint
app.post("/api/check_payment", async (req, res) => {
  const { md5 } = req.body;
  if (!md5) return res.status(400).json({ error: "Missing md5" });

  // Check cache first
  const cached = cache.get(md5);
  if (cached) {
    return res.json({ status: cached, source: "cache" });
  }

  try {
    // Call Bakong API
    const response = await axios.post(
      process.env.BAKONG_API_URL,
      { md5 },
      {
        headers: {
          Authorization: `Bearer ${process.env.BAKONG_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        timeout: 5000
      }
    );

    // Determine status
    const bakongData = response.data;
    let status = "UNPAID";

    if (bakongData && bakongData.responseCode === 0) {
      status = "PAID";
    }

    // Save to cache
    cache.set(md5, status);

    return res.json({ status, source: "bakong" });
  } catch (err) {
    console.error("Error checking Bakong payment:", err.message);
    return res.status(500).json({ error: "Failed to check payment" });
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.send("✅ Bakong Proxy API is running");
});

app.listen(PORT, () => {
  console.log(`✅ Bakong Proxy running on port ${PORT}`);
});
