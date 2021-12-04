const mongoose = require("mongoose");

const db = {};
db.mongoose = mongoose;
db.url = process.env.MONGODB_URL;
//db.locations = require("./location.schema").default;
db.categories = require("./category.schema");
db.items = require("./item.schema");
db.users = require("./user.schema");

module.exports = db;
