var schemaUtils = require("./schemaUtils");

var Item = schemaUtils.buildModel("item", {
  name: String,
  expirationDate: String,
  price: Number,
  notificationDays: [Number],
  purchaseLocation: String,
  purchaseDate: String,
  owner: String,
  category: String,
  location: String,
});

module.exports = Item;
