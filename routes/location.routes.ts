/**
 * Defines routes to access inventory locations. These routes are protected,
 * and users can only see locations which they own or are a member of.
 */

import * as locations from "../controllers/location.controller";
var router = require("express").Router();

/**
 * Create a location
 */
router.post("/", locations.createLocation);

/**
 * Get all locations. Filter by owner id. Search by location
 * name. Populates owner field for display.
 * Without a filter, returns locations a user is a member of or owns.
 */
router.get("/", locations.getLocations);

/**
 * Get a location with the given id.
 */
router.get("/:id", locations.getLocation);

/**
 * Get a location with the given id. Populate owner, member, invited members
 */
router.get("/:id/details", locations.getLocation);

/**
 * Update the location with the given id. Updatable fields include name,
 * iconName, and colorName
 */
router.put("/:id", locations.updateLocation);

/**
 * Delete the location with the given id.
 */
router.delete("/:id", locations.deleteLocation);

export default router;
