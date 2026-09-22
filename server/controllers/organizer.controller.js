const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Organizer = require('../models/Organizer');
const ApiResponse = require('../utils/apiResponse');

// @route   GET /api/organizer/stats
// @desc    Get organizer revenue, ticket sales, and event analytics
// @access  Organizer / Admin
const getOrganizerStats = async (req, res, next) => {
  try {
    const organizerUser = req.user._id;

    // Find all events owned by organizer
    const events = await Event.find({ organizer: organizerUser }).sort({ date: -1 });
    const eventIds = events.map((e) => e._id);

    // Find all confirmed bookings for these events
    const bookings = await Booking.find({
      event: { $in: eventIds },
      bookingStatus: 'CONFIRMED'
    });

    let totalRevenue = 0;
    let totalTicketsSold = 0;

    bookings.forEach((b) => {
      totalRevenue += b.pricing.finalAmount || 0;
      if (b.eventPasses && b.eventPasses.length > 0) {
        b.eventPasses.forEach((p) => {
          totalTicketsSold += p.quantity || 0;
        });
      }
    });

    // Calculate total capacity
    let totalCapacity = 0;
    events.forEach((e) => {
      totalCapacity += e.capacity || 0;
    });

    const occupancyRate = totalCapacity > 0 ? Math.round((totalTicketsSold / totalCapacity) * 100) : 0;

    return ApiResponse.success(res, 'Organizer metrics fetched', {
      stats: {
        totalRevenue,
        totalTicketsSold,
        totalEvents: events.length,
        occupancyRate: Math.min(100, occupancyRate)
      },
      events,
      recentBookings: bookings.slice(0, 10)
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/organizer/events
// @desc    Create a new live concert / comedy / sports event
// @access  Organizer / Admin
const createOrganizerEvent = async (req, res, next) => {
  try {
    const {
      title,
      category,
      artist,
      venueName,
      address,
      city,
      date,
      startTime,
      endTime,
      ticketCategories,
      capacity,
      poster,
      banner,
      description,
      terms,
      cancellationPolicy
    } = req.body;

    const slug = `${title}-${city}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const defaultCategories = ticketCategories || [
      { name: 'Standard Pass', price: 499, capacity: 200, soldCount: 0, description: 'General access' },
      { name: 'VIP Pass', price: 1499, capacity: 50, soldCount: 0, description: 'Front rows & lounge' }
    ];

    let totalCap = 0;
    defaultCategories.forEach((c) => { totalCap += Number(c.capacity || 0); });

    const newEvent = await Event.create({
      title,
      slug,
      organizer: req.user._id,
      category: category || 'CONCERTS',
      artist: artist || '',
      venueName: venueName || 'City Arena',
      address: address || 'Main Road',
      city: city || 'Patna',
      date: new Date(date),
      startTime: startTime || '07:00 PM',
      endTime: endTime || '10:00 PM',
      ticketCategories: defaultCategories,
      capacity: capacity || totalCap || 250,
      poster: poster || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800&auto=format&fit=crop',
      banner: banner || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1600&auto=format&fit=crop',
      description: description || 'Exciting live event on ShowPulse.',
      terms: terms || ['Valid government ID required', 'Age 5+'],
      cancellationPolicy: cancellationPolicy || { isAllowed: true, cutoffHours: 24, refundPercentage: 75 },
      status: 'PUBLISHED'
    });

    return ApiResponse.created(res, 'Event published successfully', newEvent);
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/organizer/export-csv
// @desc    Export ticket sales in CSV format
// @access  Organizer / Admin
const exportSalesCSV = async (req, res, next) => {
  try {
    const events = await Event.find({ organizer: req.user._id });
    const eventIds = events.map((e) => e._id);

    const bookings = await Booking.find({
      event: { $in: eventIds },
      bookingStatus: 'CONFIRMED'
    }).populate('user', 'name email phone').populate('event', 'title city date');

    let csvContent = 'Booking ID,Customer Name,Customer Email,Customer Phone,Event,Date,Passes,Total Amount,Paid At\n';

    bookings.forEach((b) => {
      const passInfo = b.eventPasses?.map((p) => `${p.quantity}x ${p.categoryName}`).join('; ') || 'N/A';
      csvContent += `"${b.bookingId}","${b.user?.name || 'Guest'}","${b.user?.email || ''}","${b.user?.phone || ''}","${b.event?.title || ''}","${b.event?.date ? new Date(b.event.date).toISOString().split('T')[0] : ''}","${passInfo}","₹${b.pricing?.finalAmount || 0}","${b.payment?.paidAt ? new Date(b.payment.paidAt).toISOString() : ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="showpulse_sales_report.csv"');
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOrganizerStats,
  createOrganizerEvent,
  exportSalesCSV
};
