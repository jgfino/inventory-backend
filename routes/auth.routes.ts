/**
 * Defines routes for user auth. These routes are not protected.
 */

import * as auth from "../controllers/auth.controller";
var router = require("express").Router();

// Sign in a user
router.post("/login", auth.login);

// Register user
router.post("/register", auth.register);

// Refresh tokens
router.post("/token", auth.refreshToken);

// Forgot password
router.post("/forgot/:emailOrPhone", auth.forgotPassword);

// Reset password
router.post("/reset/:emailOrPhone", auth.resetPassword);

export default router;
