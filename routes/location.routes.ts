/**
 * Defines routes to access inventory locations. These routes are protected,
 * and users can only see locations which they own or are a member of.
 */

import * as locations from "../controllers/location.controller";
var router = require("express").Router();

/**
 * Create a new location
 *
 * POST /api/locations/
 *
 * Body: Location
 */
router.post("/", locations.createLocation);

/**
 * Find all locations
 *
 * GET /api/locations?shared={true/false}&search={text}
 *
 * Query Params:
 * - shared: true to only receive shared locations, false for only personal
 * - search: text string to search location names
 */
router.get("/", locations.findLocations);

/**
 * Get a location by id
 *
 * GET /api/locations/:id
 */
router.get("/:id", locations.findLocations);

/**
 * Update a location by id
 *
 * PUT /api/locations/:id
 *
 * Body: Location or partial Location
 */
router.put("/:id", locations.updateLocation);

/**
 * Delete a member from the location by id
 *
 * DELETE /api/locations/:id/members/:memberId
 */
router.delete("/:id/members/:memberId", locations.deleteMember);

/**
 * Delete a location by id
 *
 * DELETE /api/locations/:id
 */
router.delete("/:id", locations.deleteLocation);

export default router;
