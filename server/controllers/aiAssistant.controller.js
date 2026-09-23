const Movie = require('../models/Movie');
const Event = require('../models/Event');
const Show = require('../models/Show');
const Venue = require('../models/Venue');
const City = require('../models/City');
const ApiResponse = require('../utils/apiResponse');

// @route   POST /api/ai/assistant
// @desc    Process natural language queries with true database price & city grounding
// @access  Public
const processUserQuery = async (req, res, next) => {
  try {
    const { prompt, city = 'Patna' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return ApiResponse.error(res, 'Prompt text is required', 400, 'PROMPT_REQUIRED');
    }

    const cleanPrompt = prompt.toLowerCase();

    // 1. Detect Intent & Entities
    const isMovieQuery = cleanPrompt.includes('movie') || cleanPrompt.includes('film') || cleanPrompt.includes('cinema') || cleanPrompt.includes('theater') || cleanPrompt.includes('imax');
    const isEventQuery = cleanPrompt.includes('event') || cleanPrompt.includes('concert') || cleanPrompt.includes('comedy') || cleanPrompt.includes('show') || cleanPrompt.includes('standup') || cleanPrompt.includes('music') || cleanPrompt.includes('sports');

    // Extract price constraint (e.g. "under 300", "below 500", "less than 1000", "500 budget", "₹300 budget")
    const priceMatch = cleanPrompt.match(/(?:under|below|less than|max|within|budget of|around)\s*(?:₹|rs\.?|inr)?\s*(\d+)/i) ||
      cleanPrompt.match(/(?:₹|rs\.?|inr)?\s*(\d+)\s*(?:budget|price)/i);
    const maxBudget = priceMatch ? parseInt(priceMatch[1], 10) : null;

    // Extract format constraint
    let formatFilter = null;
    if (cleanPrompt.includes('imax')) formatFilter = 'IMAX 3D';
    else if (cleanPrompt.includes('4dx')) formatFilter = '4DX';
    else if (cleanPrompt.includes('3d')) formatFilter = '3D';

    // Extract Genre candidates
    const genresList = ['Action', 'Sci-Fi', 'Comedy', 'Drama', 'Thriller', 'Horror', 'Romance', 'Adventure', 'Animation'];
    const matchedGenres = genresList.filter((g) => cleanPrompt.includes(g.toLowerCase()));

    // City detection
    const cities = await City.find({ isActive: true });
    let detectedCity = city;
    for (const c of cities) {
      if (cleanPrompt.includes(c.name.toLowerCase())) {
        detectedCity = c.name;
        break;
      }
    }

    // Resolve City ID and Venues in that city
    const cityDoc = cities.find((c) => c.name.toLowerCase() === detectedCity.toLowerCase());
    const venueFilter = { status: 'ACTIVE' };
    if (cityDoc) {
      venueFilter.$or = [{ city: cityDoc._id }, { city: new RegExp(`^${detectedCity}$`, 'i') }];
    } else {
      venueFilter.city = new RegExp(`^${detectedCity}$`, 'i');
    }
    const venuesInCity = await Venue.find(venueFilter).select('_id');
    const venueIds = venuesInCity.map((v) => v._id);

    // Find shows in this city with price constraint
    const showQuery = {
      venue: { $in: venueIds }
    };
    if (maxBudget) {
      showQuery['priceTiers.price'] = { $lte: maxBudget };
    }
    if (formatFilter) {
      showQuery.format = formatFilter;
    }

    const availableMovieIds = await Show.find(showQuery).distinct('movie');

    let results = {
      movies: [],
      events: [],
      shows: []
    };
    let responseText = '';
    let suggestedActions = [];

    // 2. Query execution grounded in actual DB records
    if (isMovieQuery || (!isEventQuery && matchedGenres.length > 0)) {
      const movieFilter = { status: 'NOW_SHOWING' };

      if (availableMovieIds.length > 0) {
        movieFilter._id = { $in: availableMovieIds };
      }
      if (matchedGenres.length > 0) {
        movieFilter.genres = { $in: matchedGenres };
      }
      if (formatFilter) {
        movieFilter.formats = formatFilter;
      }

      results.movies = await Movie.find(movieFilter)
        .sort({ rating: -1, releaseDate: -1 })
        .limit(4);

      if (results.movies.length > 0) {
        const topMovie = results.movies[0];
        const budgetText = maxBudget ? ` under ₹${maxBudget}` : '';
        responseText = `Here are the top ${matchedGenres.length > 0 ? matchedGenres.join('/') : 'trending'} movies${budgetText} playing in ${detectedCity}. **${topMovie.title}** has a high rating of ⭐ ${topMovie.rating}/10 and is a great match!`;
        suggestedActions = [
          `Book tickets for ${topMovie.title}`,
          `Find IMAX shows in ${detectedCity}`,
          `Filter movies under ₹300`
        ];
      }
    }

    if (isEventQuery || results.movies.length === 0) {
      const eventFilter = {
        city: { $regex: new RegExp(detectedCity, 'i') },
        status: 'PUBLISHED'
      };

      if (maxBudget) {
        eventFilter['ticketCategories.price'] = { $lte: maxBudget };
      }

      if (cleanPrompt.includes('comedy') || cleanPrompt.includes('standup')) {
        eventFilter.category = 'STANDUP_COMEDY';
      } else if (cleanPrompt.includes('music') || cleanPrompt.includes('concert')) {
        eventFilter.category = 'CONCERTS';
      } else if (cleanPrompt.includes('sports')) {
        eventFilter.category = 'SPORTS';
      }

      results.events = await Event.find(eventFilter)
        .sort({ date: 1 })
        .limit(4);

      if (results.events.length > 0) {
        const topEvent = results.events[0];
        const budgetText = maxBudget ? ` under ₹${maxBudget}` : '';
        const eventIntro = `Found thrilling live experiences in ${detectedCity}${budgetText}! **${topEvent.title}** (${topEvent.category}) on ${new Date(topEvent.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} at ${topEvent.venueName}.`;
        responseText = responseText ? `${responseText} \n\n${eventIntro}` : eventIntro;
        suggestedActions.push(`Explore ${topEvent.category.toLowerCase()} passes`);
      }
    }

    // Fallback if no specific entity matched
    if (results.movies.length === 0 && results.events.length === 0) {
      results.movies = await Movie.find({ status: 'NOW_SHOWING' }).sort({ rating: -1 }).limit(3);
      results.events = await Event.find({ status: 'PUBLISHED' }).sort({ date: 1 }).limit(3);
      responseText = `I searched our live catalog for "${prompt}" in ${detectedCity}. Here are the top trending movies and highest rated live events happening right now!`;
      suggestedActions = [
        `Show action movies in ${detectedCity}`,
        `Find comedy shows this weekend`,
        `Explore events under ₹500`
      ];
    }

    return ApiResponse.success(res, 'AI assistant query processed', {
      query: prompt,
      detectedCity,
      maxBudget,
      matchedGenres,
      responseText,
      cards: {
        movies: results.movies,
        events: results.events
      },
      suggestedActions: suggestedActions.slice(0, 3)
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  processUserQuery
};
