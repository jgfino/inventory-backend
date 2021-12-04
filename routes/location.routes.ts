/**
 * Defines routes to access inventory locations. These routes are protected,
 * and users can only see locations which they own or are a member of.
 */

import * as locations from "../controllers/location.controller";
var router = require("express").Router();

// Create a new location
router.post("/", locations.createLocation);

// Get all locations; search by title or by shared
router.get("/", locations.findAllLocations);

// Get a location by id
router.get("/:id", locations.findOneLocation);

// Update a location by id
router.put("/:id", locations.updateLocation);

// Add location members by id
router.put("/:id/members", locations.modifyMembers);

// Delete location members by id
router.delete("/:id/members", locations.modifyMembers);

// Delete a location by id
router.delete("/:id", locations.deleteLocation);

module.exports = router;
