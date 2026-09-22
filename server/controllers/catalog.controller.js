const City = require('../models/City');
const Category = require('../models/Category');
const Movie = require('../models/Movie');
const Event = require('../models/Event');
const Show = require('../models/Show');
const Venue = require('../models/Venue');
const ApiResponse = require('../utils/apiResponse');

// @route   GET /api/cities
// @desc    Get all active cities
// @access  Public
const getCities = async (req, res, next) => {
  try {
    const cities = await City.find({ isActive: true }).sort({ isPopular: -1, name: 1 });
    return ApiResponse.success(res, 'Cities fetched successfully', cities);
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = { isActive: true };
    if (type) filter.type = type;

    const categories = await Category.find(filter).sort({ name: 1 });
    return ApiResponse.success(res, 'Categories fetched successfully', categories);
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/movies
// @desc    Get movies with filtering, search & pagination
// @access  Public
const getMovies = async (req, res, next) => {
  try {
    const {
      city,
      genre,
      language,
      format,
      status = 'NOW_SHOWING',
      search,
      page = 1,
      limit = 12,
      sort = 'trending'
    } = req.query;

    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (genre) {
      query.genres = { $in: [new RegExp(genre, 'i')] };
    }

    if (language) {
      query.languages = { $in: [new RegExp(language, 'i')] };
    }

    if (format) {
      query.formats = { $in: [new RegExp(format, 'i')] };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    if (sort === 'rating') sortOptions.rating = -1;
    else if (sort === 'releaseDate') sortOptions.releaseDate = -1;
    else if (sort === 'trending') sortOptions.isTrending = -1;
    else sortOptions.createdAt = -1;

    const skip = (Number(page) - 1) * Number(limit);
    const [movies, total] = await Promise.all([
      Movie.find(query).sort(sortOptions).skip(skip).limit(Number(limit)),
      Movie.countDocuments(query)
    ]);

    return ApiResponse.paginated(res, 'Movies fetched successfully', movies, page, limit, total);
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/movies/:id
// @desc    Get single movie details with venues and showtimes
// @access  Public
const getMovieDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { city, date } = req.query;

    let movie = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      movie = await Movie.findById(id);
    } else {
      movie = await Movie.findOne({ slug: id });
    }

    if (!movie) {
      return ApiResponse.error(res, 'Movie not found', 404, 'MOVIE_NOT_FOUND');
    }

    // Query shows if city is passed
    let showsGroupedByVenue = [];
    let availableDates = [];

    if (city) {
      const targetDate = date || new Date().toISOString().split('T')[0];

      // Find all distinct dates for this movie in this city
      availableDates = await Show.find({
        movie: movie._id,
        city: new RegExp(`^${city}$`, 'i'),
        status: 'SCHEDULED'
      }).distinct('date');

      // Find all shows for the selected date
      const shows = await Show.find({
        movie: movie._id,
        city: new RegExp(`^${city}$`, 'i'),
        date: targetDate,
        status: 'SCHEDULED'
      })
        .populate('venue', 'name address location amenities')
        .populate('screen', 'name screenType')
        .sort({ startTime: 1 });

      // Group shows by Venue
      const venueMap = new Map();
      for (const show of shows) {
        if (!show.venue) continue;
        const venueId = show.venue._id.toString();
        if (!venueMap.has(venueId)) {
          venueMap.set(venueId, {
            venue: show.venue,
            shows: []
          });
        }
        venueMap.get(venueId).shows.push(show);
      }

      showsGroupedByVenue = Array.from(venueMap.values());
    }

    return ApiResponse.success(res, 'Movie details fetched successfully', {
      movie,
      availableDates: availableDates.sort(),
      venues: showsGroupedByVenue
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/events
// @desc    Get events with category, date, city filtering
// @access  Public
const getEvents = async (req, res, next) => {
  try {
    const {
      city,
      category,
      search,
      status = 'PUBLISHED',
      page = 1,
      limit = 12
    } = req.query;

    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (city) {
      query.city = new RegExp(`^${city}$`, 'i');
    }

    if (category && category !== 'ALL') {
      query.category = category.toUpperCase();
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [events, total] = await Promise.all([
      Event.find(query).sort({ date: 1, isTrending: -1 }).skip(skip).limit(Number(limit)),
      Event.countDocuments(query)
    ]);

    return ApiResponse.paginated(res, 'Events fetched successfully', events, page, limit, total);
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/events/:id
// @desc    Get event details
// @access  Public
const getEventDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    let event = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      event = await Event.findById(id).populate('organizer', 'name email');
    } else {
      event = await Event.findOne({ slug: id }).populate('organizer', 'name email');
    }

    if (!event) {
      return ApiResponse.error(res, 'Event not found', 404, 'EVENT_NOT_FOUND');
    }

    return ApiResponse.success(res, 'Event details fetched successfully', event);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCities,
  getCategories,
  getMovies,
  getMovieDetails,
  getEvents,
  getEventDetails
};
