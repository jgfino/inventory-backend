import * as locations from "../controllers/location.controller";
import express from "express";

const router = express.Router();

/**
 * Locations
 */

/**
 * Create a location
 */
router.post("/", locations.createLocation);

/**
 * Get all locations. Filter by owner id. Search by location
 * name. Populates owner field for display.
 */
router.get("/", locations.getLocations);

/**
 * Get a location with the given id.
 */
router.get("/:id", locations.getLocation);

/**
 * Get a location and its items
 */
router.get("/:id/details", locations.getLocation);

/**
 * Update the location with the given id. Updatable fields include name,
 * iconName
 */
router.put("/:id", locations.updateLocation);

/**
 * Delete the location with the given id.
 */
router.delete("/:id", locations.deleteLocation);

/**
 * Add the requesting user to the given location. Users can only add themselves
 * to a location.
 */
router.post("/:id/members/:memberId", locations.addMember);

/**
 * Remove a member from a location.
 */
router.delete("/:id/members/:memberId", locations.removeMember);

/**
 * Items
 */

/**
 * Add a new item to the given location
 */
router.post("/:id/items", locations.addItem);

/**
 * Get the items in the given locaiton
 */
router.get("/:id/items", locations.getItems);

/**
 * Search all locations for items. Returns locations containing matching items
 */
router.get("/search", locations.searchItems);

/**
 * Get an item in a location.
 */
router.get("/:id/items/:item", locations.getItem);

/**
 * Update the given item in the given location
 */
router.put("/:id/items/:item", locations.updateItem);

/**
 * Delete the given item in the given location
 */
router.delete("/:id/items/:item", locations.removeItem);

export default router;
