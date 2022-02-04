import express from "express";
import * as upc from "../controllers/upc.controller";
import { validate } from "express-validation";

const router = express.Router();

/**
 * GET /api/v1/upc/{upc}
 */
router.get("/:upc", upc.getItemUPC);

export default router;
