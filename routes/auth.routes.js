/**
 * Defines routes for user auth. These routes are not protected.
 */

const auth = require("../controllers/auth.controller");
var router = require("express").Router();

// Sign in a user
router.post("/login", auth.login);

// Register user
router.post("/register", auth.register);

// Forgot password
router.post("/forgot/:email", auth.forgotPassword);

// Reset password
router.post("/reset/:email", auth.resetPassword);

module.exports = router;
