# inventory-backend

This is the backend API for the Inventory Management application that I am currently working on. It is very much a work in progress, and I will update this README as progress is made. The current (work in progress) API documentation can be found [HERE](https://jgfino.github.io/inventory-backend/)

## Tech Stack
* Node.js
* Express.js
* Passport.js
* MongoDB/Mongoose
* AWS S3
* Twilio

## Features
* Customizable inventory management by creating "Locations" such as a fridge, pantry, or garage to store items in.
* For food-based Locations, ability to be notified when items are about to expire
* Search items by UPC/Barcode using the Edamam API
* Create collaborative Locations and Shopping Lists for other users to join
* Free vs. premium account support for future client apps. Premium accounts have more sharing options and more access to the collaborative Shopping Lists feature

## TODO:
* Finish OpenApi file
* Postman Testing for all routes
* iOS and Android client apps
* Implement expiration push notifications
