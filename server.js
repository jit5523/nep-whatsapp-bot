const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("SERVER IS WORKING 🚀");
});

app.get("/webhook", (req, res) => {
    res.send("WEBHOOK ROUTE WORKING");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log("Server started on port", PORT);
});