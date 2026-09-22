const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalog.controller');

// Cities & Categories
router.get('/cities', catalogController.getCities);
router.get('/categories', catalogController.getCategories);

// Movies
router.get('/movies', catalogController.getMovies);
router.get('/movies/:id', catalogController.getMovieDetails);

// Events
router.get('/events', catalogController.getEvents);
router.get('/events/:id', catalogController.getEventDetails);

module.exports = router;
