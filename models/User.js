const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true
    },
    language: {
        type: String,
        default: "en"
    },
    currentNode: {
        type: String,
        default: "MAIN"
    }
});

module.exports = mongoose.model("User", userSchema);