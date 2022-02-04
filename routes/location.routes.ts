import * as locations from "../controllers/location.controller";
import express from "express";

const router = express.Router();

/**
 * POST /api/v1/locations
 */
router.post("/", locations.createLocation);

/**
 * GET /api/v1/locations
 */
router.get("/", locations.getLocations);

/**
 * GET /api/v1/locations/{id}
 */
router.get("/:id", locations.getLocation);

/**
 * PATCH /api/v1/locations/{id}
 */
router.patch("/:id", locations.updateLocation);

/**
 * DELETE /api/v1/locations/{id}
 */
router.delete("/:id", locations.deleteLocation);

/**
 * POST /api/v1/locations/{id}/join
 */
router.post("/:id/join", locations.joinLocation);

/**
 * POST /api/v1/locations/{id}/leave
 */
router.post("/:id/leave", locations.removeMember);

/**
 * DELETE /api/v1/locations/{id}/members/{memberId}
 */
router.delete("/:id/members/:memberId", locations.removeMember);

// Items //

/**
 * POST /api/v1/locations/{id}/items
 */
router.post("/:id/items", locations.addItem);

/**
 * GET /api/v1/locations/{id}/items
 */
router.get("/:id/items", locations.getItems);

/**
 * GET /api/v1/locations/{id}/items/{itemId}
 */
router.get("/:id/items/:itemId", locations.getItem);

/**
 * PATCH /api/v1/locations/{id}/items/{itemId}
 */
router.patch("/:id/items/:itemId", locations.updateItem);

/**
 * DELETE /api/v1/locations/{id}/items/{itemId}
 */
router.delete("/:id/items/:itemId", locations.removeItem);

// Item searching //

/**
 * GET /api/v1/locations/items
 */
router.get("/items/search", locations.searchItems);

export default router;
