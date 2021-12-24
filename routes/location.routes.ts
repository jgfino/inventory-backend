/**
 * Defines routes to access inventory locations. These routes are protected,
 * and users can only see locations which they own or are a member of.
 */

import * as locations from "../controllers/location.controller";
var router = require("express").Router();

// Create a location
router.post("/", locations.createLocation);

// Get all locations the current user owns, is a member of, or is invited to
// Filter by name search or by shared/invited/member of
// router.get("/", locations.findLocations);

// Get a location
router.get("/:id", locations.findLocation);

// // Update a location
// router.put("/:id", locations.updateLocation);

// // Delete a location
// router.delete("/:id");

// // Get the members of a location
// router.get("/:id/members");

// // Add a member to the location
// router.post("/:id/members/:memberId");

// // Delete a member from the location
// router.delete("/:id/members/:memberId");

// // Get the users invited to a location
// router.get("/:id/members/invited");

export default router;
