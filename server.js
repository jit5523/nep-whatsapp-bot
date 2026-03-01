// ===============================
// 📌 IMPORTS
// ===============================
const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Safe require for User model (prevents crash if missing)
let User = null;
try {
    User = require("./models/User");
} catch (err) {
    console.log("User model not found (continuing without FSM) ⚠️");
}

const app = express();
app.use(express.json());

// ===============================
// 📌 HEALTH CHECK (Railway Required)
// ===============================
app.get("/", (req, res) => {
    return res.status(200).send("🚀 NEP WhatsApp Bot Running");
});

app.get("/health", (req, res) => {
    return res.status(200).send("OK");
});

// ===============================
// 📌 SAFE CONTENT LOADER
// ===============================
function loadContent(language, fileName) {
    try {
        const filePath = path.join(__dirname, "content", language, fileName);
        if (!fs.existsSync(filePath)) return null;
        const data = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(data);
    } catch (err) {
        console.log("Content Load Error ❌", err);
        return null;
    }
}

function loadNode(language, nodeId) {
    if (nodeId === "MAIN") return loadContent(language, "main.json");
    if (nodeId === "PART1") return loadContent(language, "part1.json");
    if (nodeId === "PART2") return loadContent(language, "part2.json");
    if (nodeId === "NCRF") return loadContent(language, "ncrf.json");
    return null;
}

// ===============================
// 📌 RENDER MENU
// ===============================
function renderMenu(menuData) {
    if (!menuData) return "Menu not available.";

    let message = menuData.title + "\n\n";
    for (let key in menuData.options) {
        message += `${key}. ${menuData.options[key].label}\n`;
    }

    message += "\n9. Back\n0. Main Menu";
    return message;
}

// ===============================
// 📌 WEBHOOK VERIFICATION
// ===============================
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
        console.log("Webhook Verified ✅");
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
});

// ===============================
// 📌 RECEIVE WHATSAPP EVENTS
// ===============================
app.post("/webhook", (req, res) => {
    console.log("Incoming Webhook:", JSON.stringify(req.body, null, 2));
    return res.sendStatus(200);
});

// ===============================
// 📌 TEST MESSAGE ROUTE (Optional)
// ===============================
app.post("/message", async(req, res) => {
    try {
        if (!User) {
            return res.json({ reply: "User model not configured." });
        }

        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.json({ reply: "Missing phone or message" });
        }

        let user = await User.findOne({ phone });
        if (!user) {
            user = new User({
                phone,
                language: "en",
                currentNode: "MAIN"
            });
            await user.save();
        }

        const menu = loadNode("en", "MAIN");
        return res.json({ reply: renderMenu(menu) });

    } catch (err) {
        console.log("Message Route Error ❌", err);
        return res.json({ reply: "Something went wrong." });
    }
});

// ===============================
// 📌 START SERVER (Railway Safe)
// ===============================
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        if (process.env.MONGO_URI) {
            await mongoose.connect(process.env.MONGO_URI);
            console.log("MongoDB Connected ✅");
        } else {
            console.log("No MONGO_URI found (Skipping DB) ⚠️");
        }

        app.listen(PORT, "0.0.0.0", () => {
            console.log("Server running on port", PORT);
        });

    } catch (err) {
        console.log("Startup Error ❌", err);
        process.exit(1);
    }
}

startServer();