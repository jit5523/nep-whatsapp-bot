const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// ========================
// HEALTH CHECK
// ========================
app.get("/", (req, res) => {
    res.send("NEP WhatsApp Bot Running 🚀");
});

// ========================
// WEBHOOK VERIFICATION
// ========================
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
        console.log("Webhook Verified ✅");
        return res.status(200).send(challenge);
    } else {
        console.log("Verification Failed ❌");
        return res.sendStatus(403);
    }
});

// ========================
// RECEIVE MESSAGES
// ========================
app.post("/webhook", (req, res) => {
    console.log("Incoming message:", JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});

// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 3000;

async function start() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected ✅");

        app.listen(PORT, "0.0.0.0", () => {
            console.log("Server running on port", PORT);
        });
    } catch (err) {
        console.log("Startup Error ❌", err);
        process.exit(1);
    }
}

start();