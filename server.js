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
        console.log("MongoDB Error ❌");
        console.log(err);
    });

// ===============================
// 📌 CONTENT LOADER FUNCTIONS
// ===============================

// Load JSON file dynamically
function loadContent(language, fileName) {
    const filePath = path.join(__dirname, "content", language, fileName);
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
}

// Load menu node
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

// Render normal menu
function renderMenu(menuData) {
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

// Render chapter sub-options
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
// 📌 ROOT ROUTE
// ===============================
app.get("/", (req, res) => {
    res.send("🚀 NEP WhatsApp Bot is Running");
});

// ===============================
// 📌 MAIN FSM ROUTE
// ===============================
app.post("/message", async(req, res) => {
    try {
        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.json({ reply: "⚠️ Missing phone or message" });
        }

        let user = await User.findOne({ phone });

        // Create new user if first time
        if (!user) {
            user = new User({
                phone,
                language: "en",
                currentNode: "MAIN"
            });
            await user.save();
        }

        const userMessage = message.trim();

        // ===============================
        // 🔁 Restart with Hi
        // ===============================
        if (userMessage.toLowerCase() === "hi") {
            user.currentNode = "MAIN";
            await user.save();

            const menu = loadNode(user.language, "MAIN");
            return res.json({ reply: renderMenu(menu) });
        }

        // ===============================
        // 🔙 Back & Main Menu
        // ===============================
        if (userMessage === "0" || userMessage === "9") {
            user.currentNode = "MAIN";
            await user.save();

            const menu = loadNode(user.language, "MAIN");
            return res.json({ reply: renderMenu(menu) });
        }

        // Load current menu
        const currentMenu = loadNode(user.language, user.currentNode);

        // ===============================
        // 🌐 LANGUAGE SWITCH MODE
        // ===============================
        if (user.currentNode === "LANGUAGE_SWITCH") {

            if (userMessage === "1") {
                user.language = "en";
            }

            if (userMessage === "2") {
                user.language = "gu";
            }

            user.currentNode = "MAIN";
            await user.save();

            const menu = loadNode(user.language, "MAIN");
            return res.json({ reply: renderMenu(menu) });
        }

        // ===============================
        // 🔘 NORMAL MENU NAVIGATION
        // ===============================
        if (currentMenu && currentMenu.options[userMessage]) {

            const selectedOption = currentMenu.options[userMessage];

            // 🌐 Language switch selection
            if (selectedOption.id === "LANGUAGE_SWITCH") {
                user.currentNode = "LANGUAGE_SWITCH";
                await user.save();

                return res.json({
                    reply: "🌐 Choose Language:\n\n1️⃣ English\n2️⃣ ગુજરાતી"
                });
            }

            // 📘 Chapter selection
            if (selectedOption.summary) {
                user.currentNode = selectedOption.id;
                await user.save();

                return res.json({
                    reply: renderChapterOptions(selectedOption)
                });
            }

            // 📂 Normal navigation
            user.currentNode = selectedOption.id;
            await user.save();

            const nextMenu = loadNode(user.language, selectedOption.id);

            return res.json({ reply: renderMenu(nextMenu) });
        }

        // ===============================
        // 📘 CHAPTER MODE (Summary/Detail etc.)
        // ===============================
        const parentMenus = ["part1.json", "part2.json", "ncrf.json"];

        for (let file of parentMenus) {
            const data = loadContent(user.language, file);

            for (let key in data.options) {
                const chapter = data.options[key];

                if (chapter.id === user.currentNode) {

                    if (userMessage === "1")
                        return res.json({ reply: `📘 Summary:\n\n${chapter.summary}` });

                    if (userMessage === "2")
                        return res.json({ reply: `📖 Detailed Explanation:\n\n${chapter.detail}` });

                    if (userMessage === "3")
                        return res.json({ reply: `🧠 Simple Example:\n\n${chapter.example}` });

                    if (userMessage === "4")
                        return res.json({
                            reply: `📄 Official PDF:\n\nEnglish:\n${chapter.pdf_en}\n\nGujarati:\n${chapter.pdf_gu}`
                        });

                    if (userMessage === "5")
                        return res.json({
                            reply: `🤓 Simple Explanation:\n\nThink of this like building a strong foundation before constructing a house.`
                        });
                }
            }
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
// 📌 META WEBHOOK VERIFICATION
// ===============================
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("Mode:", mode);
    console.log("Token from Meta:", token);
    console.log("Token from ENV:", process.env.VERIFY_TOKEN);

    if (mode && token === process.env.VERIFY_TOKEN) {
        console.log("Verification Success ✅");
        return res.status(200).send(challenge);
    } else {
        console.log("Verification Failed ❌");
        return res.send("Verification failed ❌");
    }
});

// ===============================
// 📌 START SERVER
// ===============================
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} 🚀`);
});