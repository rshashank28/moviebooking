const Show = require('../models/Show');
const Seat = require('../models/Seat');
const SeatLockService = require('./seatLock.service');

class SeatRecommenderService {
  /**
   * Recommend optimal contiguous seats based on user preference
   * @param {string} showId
   * @param {number} seatCount
   * @param {'BEST_VIEW'|'BUDGET'|'RECLINER'|'AISLE'} preference
   */
  static async recommendSeats(showId, seatCount = 2, preference = 'BEST_VIEW') {
    const show = await Show.findById(showId).populate('screen');
    if (!show) {
      throw new Error('Show not found');
    }

    const screen = show.screen;
    let layoutRows = screen.layout || [];

    // If layout is not set, generate default layout
    if (!layoutRows || layoutRows.length === 0) {
      layoutRows = [
        { rowLabel: 'A', category: 'RECLINER', seatCount: 8, aisleGaps: [] },
        { rowLabel: 'B', category: 'VIP', seatCount: 10, aisleGaps: [] },
        { rowLabel: 'C', category: 'PREMIUM', seatCount: 10, aisleGaps: [] },
        { rowLabel: 'D', category: 'PREMIUM', seatCount: 10, aisleGaps: [] },
        { rowLabel: 'E', category: 'REGULAR', seatCount: 10, aisleGaps: [] },
        { rowLabel: 'F', category: 'REGULAR', seatCount: 10, aisleGaps: [] }
      ];
    }

    // Get all seats for screen
    let seats = await Seat.find({ screen: screen._id });
    if (!seats || seats.length === 0) {
      // If seats weren't populated in DB, generate virtual seats from layout
      seats = [];
      layoutRows.forEach((rowConfig) => {
        for (let i = 1; i <= rowConfig.seatCount; i++) {
          seats.push({
            seatIdentifier: `${rowConfig.rowLabel}${i}`,
            row: rowConfig.rowLabel,
            number: i,
            category: rowConfig.category,
            isAvailable: true
          });
        }
      });
    }

    const bookedSeats = new Set(show.bookedSeats || []);
    const lockedSeatIds = new Set(await SeatLockService.getLockedSeatsForShow(showId));

    // Price map
    const priceMap = new Map();
    (show.priceTiers || []).forEach((t) => {
      priceMap.set(t.category, t.price);
    });

    // Group available seats by row
    const rowMap = new Map();
    seats.forEach((seat) => {
      const isUnavailable = !seat.isAvailable || bookedSeats.has(seat.seatIdentifier) || lockedSeatIds.has(seat.seatIdentifier);
      if (!rowMap.has(seat.row)) {
        rowMap.set(seat.row, []);
      }
      rowMap.get(seat.row).push({
        seatIdentifier: seat.seatIdentifier,
        row: seat.row,
        number: seat.number,
        category: seat.category,
        price: priceMap.get(seat.category) || 250,
        isAvailable: !isUnavailable
      });
    });

    const totalRowsCount = layoutRows.length;
    const centerRowIndex = Math.round(totalRowsCount * 0.65); // Best view row (~65% back)

    const candidates = [];

    layoutRows.forEach((rowConfig, rIndex) => {
      const rowSeats = (rowMap.get(rowConfig.rowLabel) || []).sort((a, b) => a.number - b.number);
      if (rowSeats.length < seatCount) return;

      const totalColsInRow = rowConfig.seatCount || rowSeats.length;
      const centerCol = Math.round(totalColsInRow / 2);

      for (let i = 0; i <= rowSeats.length - seatCount; i++) {
        const slice = rowSeats.slice(i, i + seatCount);

        // Check if all seats in slice are available and contiguous in numbering
        const allAvailable = slice.every((s) => s.isAvailable);
        let isContiguous = true;
        for (let k = 0; k < slice.length - 1; k++) {
          if (slice[k + 1].number !== slice[k].number + 1) {
            isContiguous = false;
            break;
          }
        }

        if (allAvailable && isContiguous) {
          const middleSeatNumber = (slice[0].number + slice[slice.length - 1].number) / 2;
          const rowDistance = Math.abs(rIndex - centerRowIndex);
          const colDistance = Math.abs(middleSeatNumber - centerCol);
          const euclideanDist = Math.sqrt(rowDistance * rowDistance + colDistance * colDistance);

          const isRecliner = rowConfig.category === 'RECLINER' || rowConfig.category === 'VIP';
          const totalPrice = slice.reduce((sum, s) => sum + s.price, 0);

          let score = 100 - (euclideanDist * 10);

          if (preference === 'BUDGET') {
            score = 1000 / (totalPrice || 100) - (euclideanDist * 2);
          } else if (preference === 'RECLINER') {
            score = (isRecliner ? 500 : -500) - (euclideanDist * 5);
          } else if (preference === 'AISLE') {
            const isNearAisle = slice[0].number === 1 || slice[slice.length - 1].number === totalColsInRow;
            score = (isNearAisle ? 60 : 0) + (100 - (euclideanDist * 10));
          }

          candidates.push({
            seats: slice.map((s) => ({
              seatIdentifier: s.seatIdentifier,
              row: s.row,
              number: s.number,
              category: s.category,
              price: s.price
            })),
            totalPrice,
            category: rowConfig.category,
            score
          });
        }
      }
    });

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => b.score - a.score);

    return {
      recommendation: candidates[0],
      alternatives: candidates.slice(1, 4)
    };
  }
}

module.exports = SeatRecommenderService;
