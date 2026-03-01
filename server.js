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
// 📌 GLOBAL ERROR HANDLING
// ===============================
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception ❌", err);
});

process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection ❌", err);
});

// ===============================
// 📌 HEALTH CHECK (Railway Required)
// ===============================
app.get("/", (req, res) => {
    return res.send("🚀 NEP WhatsApp Bot Running");
});

app.get("/health", (req, res) => {
    return res.send("OK");
});

// ===============================
// 📌 CONTENT LOADER FUNCTIONS
// ===============================
function loadContent(language, fileName) {
    try {
        const filePath = path.join(__dirname, "content", language, fileName);

        if (!fs.existsSync(filePath)) {
            console.log("File not found:", filePath);
            return null;
        }

        const data = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(data);
    } catch (err) {
        console.log("JSON Load Error ❌", err);
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
// 📌 RENDER FUNCTIONS
// ===============================
function renderMenu(menuData) {
    if (!menuData) return "⚠️ Menu not available.";

    let message = menuData.title + "\n\n";

    for (let key in menuData.options) {
        message += `${key}️⃣ ${menuData.options[key].label}\n`;
    }

    message += "\n━━━━━━━━━━━━━━\n";
    message += "🔙 9️⃣ Back\n";
    message += "🏠 0️⃣ Main Menu\n";

    if (menuData.footer) {
        message += `\n✨ ${menuData.footer}`;
    }

    return message;
}

function renderChapterOptions(chapterData) {
    return `
📘 ${chapterData.label}

Choose what you want:

1️⃣ Summary  
2️⃣ Detailed Explanation  
3️⃣ Simple Example  
4️⃣ Download Official PDF  
5️⃣ Explain in Simple Words  

━━━━━━━━━━━━━━
🔙 9️⃣ Back  
🏠 0️⃣ Main Menu
`;
}

// ===============================
// 📌 META WEBHOOK VERIFICATION (CRITICAL FIX)
// ===============================
app.get("/webhook", (req, res) => {
    if (
        req.query["hub.mode"] === "subscribe" &&
        req.query["hub.verify_token"] === process.env.VERIFY_TOKEN
    ) {
        return res.send(req.query["hub.challenge"]);
    }
    return res.sendStatus(403);
});

// ===============================
// 📌 RECEIVE WHATSAPP WEBHOOK DATA
// ===============================
app.post("/webhook", async(req, res) => {
    try {
        console.log("Incoming Webhook:", JSON.stringify(req.body, null, 2));
        return res.sendStatus(200);
    } catch (err) {
        console.log("Webhook Error ❌", err);
        return res.sendStatus(500);
    }
});

// ===============================
// 📌 MAIN FSM ROUTE (Internal Testing)
// ===============================
app.post("/message", async(req, res) => {
    try {
        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.json({ reply: "⚠️ Missing phone or message" });
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

        const userMessage = message.trim();

        if (userMessage.toLowerCase() === "hi") {
            user.currentNode = "MAIN";
            await user.save();
            const menu = loadNode(user.language, "MAIN");
            return res.json({ reply: renderMenu(menu) });
        }

        if (userMessage === "0" || userMessage === "9") {
            user.currentNode = "MAIN";
            await user.save();
            const menu = loadNode(user.language, "MAIN");
            return res.json({ reply: renderMenu(menu) });
        }

        const currentMenu = loadNode(user.language, user.currentNode);

        if (currentMenu && currentMenu.options[userMessage]) {
            const selectedOption = currentMenu.options[userMessage];

            user.currentNode = selectedOption.id;
            await user.save();

            const nextMenu = loadNode(user.language, selectedOption.id);
            return res.json({ reply: renderMenu(nextMenu) });
        }

        return res.json({
            reply: "❌ Invalid option\n\nType 'Hi' to restart."
        });

    } catch (error) {
        console.log("Error ❌", error);
        return res.json({
            reply: "⚠️ Something went wrong."
        });
    }
});

// ===============================
// 📌 START SERVER AFTER MONGO CONNECT (RAILWAY SAFE)
// ===============================
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected ✅");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT} 🚀`);
        });
    })
    .catch((err) => {
        console.log("MongoDB Error ❌", err);
        process.exit(1);
    });