import * as shoppingLists from "../controllers/shoppingList.controller";
import express from "express";

const router = express.Router();

/**
 * POST /api/v1/lists
 */
router.post("/", shoppingLists.createList);

/**
 * GET /api/v1/lists
 */
router.get("/", shoppingLists.getLists);

/**
 * GET /api/v1/lists/{id}
 */
router.get("/:id", shoppingLists.getList);

/**
 * PUT /api/v1/lists/{id}
 */
router.put("/:id", shoppingLists.updateList);

/**
 * DELETE /api/v1/lists/{id}
 */
router.delete("/:id", shoppingLists.deleteList);

/**
 * POST /api/v1/lists/{id}/join
 */
router.post("/:id/members", shoppingLists.joinList);

/**
 * POST /api/v1/lists/{id}/leave
 */
router.post("/:id/members", shoppingLists.removeMember);

/**
 * DELETE /api/v1/lists/{id}/members/{memberId}
 */
router.delete("/:id/members/:memberId", shoppingLists.removeMember);

/**
 * POST /api/v1/lists/{id}/items
 */
router.post("/:id/items", shoppingLists.addItem);

/**
 * PUT /api/v1/lists/{id}/items/{itemId}
 */
router.put("/:id/items/:itemId", shoppingLists.updateItem);

/**
 * DELETE /api/v1/lists/{id}/items/{itemId}
 */
router.delete("/:id/items/:itemId", shoppingLists.deleteItem);
