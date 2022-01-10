import express from "express";
import * as items from "../controllers/items.controller";

const router = express.Router();

/**
 * Get an item information by upc. Returns item name and brand, if found.
 */
router.get("/upc/:upc", items.getItemUPC);

export default router;
