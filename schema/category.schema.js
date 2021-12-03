var schemaUtils = require("./schemaUtils");

var Category = schemaUtils.buildModel("category", {
  name: String,
  iconName: String,
  colorName: String,
  location: String,
});

module.exports = Category;
