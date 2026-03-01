const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(express.json());

/* ===========================
   SAFE MONGODB CONNECTION
=========================== */
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log("MongoDB Connected ✅"))
        .catch(err => console.log("MongoDB Error ❌", err));
} else {
    console.log("⚠️ No MongoDB configured (Skipping DB)");
}

/* ===========================
   USER MODEL
=========================== */
const userSchema = new mongoose.Schema({
    phone: String,
    language: { type: String, default: "en" },
    currentNode: { type: String, default: "MAIN" }
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

/* ===========================
   SAFE CONTENT LOADER
=========================== */
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

/* ===========================
   RENDER FUNCTIONS
=========================== */
function renderMenu(menuData) {
    if (!menuData) return "⚠️ Menu not available.";

    let message = menuData.title + "\n\n";
    for (let key in menuData.options) {
        message += `${key}️⃣ ${menuData.options[key].label}\n`;
    }
    message += "\n━━━━━━━━━━━━━━\n🔙 9️⃣ Back\n🏠 0️⃣ Main Menu";
    return message;
}

function renderChapterOptions(chapterData) {
    return `
📘 ${chapterData.label}

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

/* ===========================
   ROOT ROUTE
=========================== */
app.get("/", (req, res) => {
    res.status(200).send("🚀 NEP WhatsApp Bot Running");
});

/* ===========================
   WEBHOOK VERIFICATION
=========================== */
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
});

/* ===========================
   SEND MESSAGE FUNCTION
=========================== */
async function sendWhatsAppMessage(to, text) {
    try {
        await axios.post(
            `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`, {
                messaging_product: "whatsapp",
                to: to,
                text: { body: text }
            }, {
                headers: {
                    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );
    } catch (err) {
        console.log("Send Error ❌", err.response ? .data || err.message);
    }
}

/* ===========================
   WHATSAPP WEBHOOK RECEIVE
=========================== */
app.post("/webhook", async(req, res) => {
    try {
        const entry = req.body.entry ? .[0];
        const changes = entry ? .changes ? .[0];
        const message = changes ? .value ? .messages ? .[0];

        if (!message) return res.sendStatus(200);

        const from = message.from;
        const text = message.text ? .body ? .trim();

        let user = await User.findOne({ phone: from });
        if (!user) {
            user = new User({ phone: from });
            await user.save();
        }

        if (text ? .toLowerCase() === "hi") {
            user.currentNode = "MAIN";
            await user.save();
            const menu = loadNode(user.language, "MAIN");
            await sendWhatsAppMessage(from, renderMenu(menu));
            return res.sendStatus(200);
        }

        if (text === "0" || text === "9") {
            user.currentNode = "MAIN";
            await user.save();
            const menu = loadNode(user.language, "MAIN");
            await sendWhatsAppMessage(from, renderMenu(menu));
            return res.sendStatus(200);
        }

        const currentMenu = loadNode(user.language, user.currentNode);

        if (currentMenu && currentMenu.options[text]) {
            const selected = currentMenu.options[text];

            if (selected.summary) {
                user.currentNode = selected.id;
                await user.save();
                await sendWhatsAppMessage(from, renderChapterOptions(selected));
                return res.sendStatus(200);
            }

            user.currentNode = selected.id;
            await user.save();
            const nextMenu = loadNode(user.language, selected.id);
            await sendWhatsAppMessage(from, renderMenu(nextMenu));
            return res.sendStatus(200);
        }

        await sendWhatsAppMessage(from, "❌ Invalid option\nType *Hi* to restart.");
        res.sendStatus(200);

    } catch (err) {
        console.log("Webhook Error ❌", err);
        res.sendStatus(500);
    }
});

/* ===========================
   START SERVER
=========================== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} 🚀`);
});