const QRCode = require('qrcode');
const crypto = require('crypto');
const { JWT_SECRET } = require('../config/env');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Organizer = require('../models/Organizer');
const logger = require('../utils/logger');

class TicketService {
  /**
   * Generate signed tamper-proof QR Code payload and Base64 image
   */
  static async generateQRCode(booking) {
    // Cryptographically signed verification payload
    const payloadToSign = `${booking.bookingId}:${booking.user}:${booking.pricing.finalAmount}`;
    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(payloadToSign)
      .digest('hex')
      .substring(0, 16);

    const verificationToken = `SPQR-${booking.bookingId}-${signature}`;

    const qrDataToEncode = JSON.stringify({
      bookingId: booking.bookingId,
      token: verificationToken,
      platform: 'ShowPulse',
      issuedAt: new Date().toISOString()
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrDataToEncode, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#0B0F19',
        light: '#FFFFFF'
      }
    });

    return {
      qrCodeDataUrl,
      verificationToken
    };
  }

  /**
   * Verify QR pass at cinema / event gate and mark as CHECKED_IN atomically
   */
  static async scanAndCheckInTicket(scannedToken, scannerUser = null) {
    if (!scannedToken) {
      throw new Error('No QR token provided');
    }

    let parsedToken = scannedToken;
    try {
      if (scannedToken.startsWith('{')) {
        const json = JSON.parse(scannedToken);
        parsedToken = json.token || json.bookingId || scannedToken;
      }
    } catch (e) {
      parsedToken = scannedToken;
    }

    // 1. Fetch booking to check status & permissions
    const booking = await Booking.findOne({
      $or: [
        { qrVerificationToken: parsedToken },
        { bookingId: parsedToken }
      ]
    })
      .populate('movie', 'title duration languages formats ageRating')
      .populate('event', 'title venueName date startTime organizer')
      .populate('venue', 'name address city organizer')
      .populate('screen', 'name screenType')
      .populate('user', 'name email phone');

    if (!booking) {
      return {
        isValid: false,
        status: 'INVALID',
        message: 'Invalid pass or ticket not found in database.'
      };
    }

    // 2. Organizer Permission Verification (if scanned by organizer)
    if (scannerUser && scannerUser.role === 'ORGANIZER') {
      const isOwnerOfEvent = booking.event && booking.event.organizer?.toString() === scannerUser._id.toString();
      const isOwnerOfVenue = booking.venue && booking.venue.organizer?.toString() === scannerUser._id.toString();

      if (!isOwnerOfEvent && !isOwnerOfVenue) {
        return {
          isValid: false,
          status: 'UNAUTHORIZED_ORGANIZER',
          message: 'Access denied: You do not have permission to check-in tickets for this event/venue.'
        };
      }
    }

    if (booking.bookingStatus !== 'CONFIRMED') {
      return {
        isValid: false,
        status: 'UNPAID_OR_CANCELLED',
        message: `Ticket is not active (Current status: ${booking.bookingStatus})`
      };
    }

    // 3. Atomic check-in transition from NOT_CHECKED_IN to CHECKED_IN
    const updatedBooking = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        bookingStatus: 'CONFIRMED',
        checkInStatus: 'NOT_CHECKED_IN'
      },
      {
        $set: {
          checkInStatus: 'CHECKED_IN',
          checkInTime: new Date()
        }
      },
      { new: true }
    )
      .populate('movie', 'title duration languages formats ageRating')
      .populate('event', 'title venueName date startTime')
      .populate('venue', 'name address city')
      .populate('screen', 'name screenType')
      .populate('user', 'name email phone');

    if (!updatedBooking) {
      // Race condition or already scanned
      return {
        isValid: false,
        status: 'ALREADY_USED',
        message: '⚠️ DUPLICATE ENTRY DETECTED! This ticket has already been used.',
        checkedInAt: booking.checkInTime,
        booking
      };
    }

    logger.info(`Ticket ${updatedBooking.bookingId} checked in successfully at gate.`);

    return {
      isValid: true,
      status: 'ADMITTED',
      message: '✅ Ticket verified successfully. Entry granted!',
      checkedInAt: updatedBooking.checkInTime,
      booking: updatedBooking
    };
  }
}

module.exports = TicketService;
