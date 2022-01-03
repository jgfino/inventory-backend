import express from "express";
import * as items from "../controllers/items.controller";

const router = express.Router();

/**
 * Create an item
 */
router.post("/", items.createItem);

/**
 * Get an item information by upc. Returns item name and brand, if found.
 */
router.get("/upc/:upc", items.getItemUPC);

/**
 * Get all items. Filter by location id, category, owner id, expired.
 * Search by name. Location and owner data included. Sorted by name.
 */
router.get("/", items.getItems);

/**
 * Get the item with the given id. Location and owner data included.
 */
router.get("/:id", items.getItem);

/**
 * Update the item with the given id. Updatable fields include everything
 * except owner and location.
 */
router.put("/:id", items.updateItem);

/**
 * Delete the item with the given id.
 */
router.delete("/:id", items.deleteItem);

export default router;
