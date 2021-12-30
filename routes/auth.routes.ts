import * as auth from "../controllers/auth.controller";
import express from "express";

const router = express.Router();

/**
 * Sign in a user
 */
router.post("/login", auth.login);

/**
 * Register a new user
 */
router.post("/register", auth.register);

/**
 * Refresh a user's tokens using an access and refresh token
 */
router.post("/token", auth.refreshToken);

/**
 * Send a password reset email/text
 */
router.post("/forgot/:emailOrPhone", auth.forgotPassword);

/**
 * Reset a user's password using a token
 */
router.post("/reset/:emailOrPhone", auth.resetPassword);

export default router;
