import * as auth from "../controllers/auth.controller";
import express from "express";

const router = express.Router();

/**
 * POST /api/v1/auth/login
 */
router.post("/login", auth.login);

/**
 * POST /api/v1/auth/register
 */
router.post("/register", auth.register);

/**
 * POST /api/v1/auth/token
 */
router.post("/token", auth.refreshToken);

/**
 * POST /api/v1/auth/forgot/{emailOrPhone}
 */
router.post("/forgot/:emailOrPhone", auth.forgotPassword);

/**
 * POST /api/v1/auth/reset/{emailOrPhone}
 */
router.post("/reset/:emailOrPhone", auth.resetPassword);

export default router;
