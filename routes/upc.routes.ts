import express from "express";
import * as upc from "../controllers/upc.controller";

const router = express.Router();

/**
 * GET /api/v1/upc/{upc}
 */
router.get("/upc/:upc", upc.getItemUPC);

export default router;
