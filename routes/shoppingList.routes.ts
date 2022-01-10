import * as shoppingLists from "../controllers/shoppingList.controller";
import express from "express";

const router = express.Router();

/**
 * Create a shopping list
 */
router.post("/", shoppingLists.createList);

/**
 * Get all shopping lists. Sorted by creation date
 */
router.get("/", shoppingLists.getLists);

/**
 * Get a shopping list with the given id.
 */
router.get("/:id", shoppingLists.getList);

/**
 * Update the shopping list with the given id. Updatable fields include name,
 * notes
 */
router.put("/:id", shoppingLists.updateLocation);

/**
 * Delete the shopping list with the given id
 */
router.delete("/:id", shoppingLists.deleteList);

/**
 * Add an item to the given shopping list
 */
router.post("/:id/items", shoppingLists.addItem);

/**
 * Update the given item in the given shopping list
 */
router.put("/:id/items/:itemId", shoppingLists.updateItem);

/**
 * Remove the given item from the given shopping list
 */
router.delete("/:id/items/:itemId", shoppingLists.deleteItem);

/**
 * Add the requesting user to the given shopping list
 */
router.post("/:id/members", shoppingLists.addMember);

/**
 * Remove a member from a shopping list
 */
router.delete("/:id/members/:memberId", shoppingLists.removeMember);
