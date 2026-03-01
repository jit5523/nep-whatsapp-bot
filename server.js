// ===============================
// 📌 IMPORTS
// ===============================
const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const User = require("./models/User");

const app = express();
app.use(express.json());

// ===============================
// 📌 MONGODB CONNECTION
// ===============================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected ✅"))
    .catch((err) => {
        console.error("MongoDB Error ❌", err);
        process.exit(1);
    });

// ===============================
// 📌 SAFE JSON LOADER
// ===============================
function loadContent(language, fileName) {
    try {
        const filePath = path.join(__dirname, "content", language, fileName);
        const data = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(data);
    } catch (err) {
        console.error("Content Load Error ❌", err);
        return null;
    }
}

function loadNode(language, nodeId) {
    const map = {
        MAIN: "main.json",
        PART1: "part1.json",
        PART2: "part2.json",
        NCRF: "ncrf.json"
    };

    if (!map[nodeId]) return null;
    return loadContent(language, map[nodeId]);
}

// ===============================
// 📌 ROOT ROUTE
// ===============================
app.get("/", (req, res) => {
    res.send("🚀 NEP WhatsApp Bot is Running");
});

// ===============================
// 📌 META WEBHOOK VERIFICATION
// ===============================
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("Mode:", mode);
    console.log("Token from Meta:", token);
    console.log("Token from ENV:", process.env.VERIFY_TOKEN);

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
        console.log("Webhook Verified ✅");
        return res.status(200).send(challenge);
    } else {
        console.log("Verification Failed ❌");
        return res.sendStatus(403);
    }
});

// ===============================
// 📌 START SERVER (Railway Safe)
// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} 🚀`);
});