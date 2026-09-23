# SHOWPULSE (MOVIEBOOK) — AUDIT FIX CHANGELOG

This document catalogs every meaningful fix applied across the platform during the production hardening and architectural refactoring phase.

---

## 1. Frontend Axios Response Contract Normalization

* **Issue**: Inconsistent API response unpacking. `client/src/services/api.js` had an interceptor returning `response.data`, but many frontend components still expected `response.data`, resulting in `undefined` errors and broken views.
* **Root Cause**: Mixed contracts between the API interceptor and downstream React components.
* **Files Changed**:
  * `client/src/services/api.js`
  * `client/src/pages/HomePage.jsx`
  * `client/src/pages/MoviesPage.jsx`
  * `client/src/pages/MovieDetailsPage.jsx`
  * `client/src/pages/EventsPage.jsx`
  * `client/src/pages/EventDetailsPage.jsx`
  * `client/src/pages/SeatSelectionPage.jsx`
  * `client/src/pages/CheckoutPage.jsx`
  * `client/src/pages/TicketViewPage.jsx`
  * `client/src/pages/UserDashboardPage.jsx`
  * `client/src/pages/AdminDashboardPage.jsx`
  * `client/src/pages/OrganizerDashboardPage.jsx`
  * `client/src/pages/QRScannerPage.jsx`
  * `client/src/pages/SearchResultsPage.jsx`
  * `client/src/components/auth/AuthModal.jsx`
  * `client/src/components/booking/SmartSeatPickerModal.jsx`
  * `client/src/components/reviews/ReviewSection.jsx`
* **What Was Changed**: Standardized `api.interceptors.response` to return the complete Axios `response` object and propagate `err.response`. Updated all consuming components and pages to access `res.data.data` / `res.data.success` consistently.
* **Why**: Provides a single, predictable HTTP contract across the entire client application.
* **Test Performed**: Frontend production build `npm run build` executed and validated (0 errors).
* **Result**: All 14 client pages and interactive modals build cleanly and handle responses and errors predictably.

---

## 2. Show-Specific Seat Inventory Architecture

* **Issue**: Seat availability was previously stored on static `Seat.isAvailable`. Booking a physical seat for Show A marked it unavailable across all other shows (Show B, Show C).
* **Root Cause**: Lack of an ephemeral show-specific inventory collection mapping `(show, seat) -> status`.
* **Files Changed**:
  * `server/models/ShowSeat.js` (NEW)
  * `server/models/Seat.js`
  * `server/models/Show.js`
  * `server/seed/seedData.js`
  * `server/controllers/venue.controller.js`
  * `server/services/seatLock.service.js`
  * `server/services/pricing.service.js`
  * `server/services/payment.service.js`
  * `server/services/refund.service.js`
* **What Was Changed**:
  1. Created `ShowSeat` model with compound unique index `({ show: 1, seat: 1 })` and status field `['AVAILABLE', 'LOCKED', 'BOOKED', 'UNAVAILABLE']`.
  2. Removed `isAvailable` from static `Seat.js`.
  3. Seed scripts and show creation now generate dedicated `ShowSeat` records per show.
* **Why**: Ensures physical seat coordinates and categories are immutable, while booking states are isolated strictly to each show instance.
* **Test Performed**: Tested show matrix retrieval and seat inventory status across different shows.
* **Result**: Booking Seat A1 for Show 1 has zero impact on Seat A1 availability for Show 2.

---

## 3. Atomic Multi-Seat Redis Locking with Lua Scripts

* **Issue**: Seat locking looped sequentially through requested seats (`for (...) await redis.set(...)`), causing partial lock vulnerabilities and race conditions.
* **Root Cause**: Non-atomic multi-key Redis write operations.
* **Files Changed**:
  * `server/services/seatLock.service.js`
  * `server/config/redis.js`
  * `server/tests/seat_lock.test.js`
* **What Was Changed**:
  1. Implemented `LUA_ACQUIRE_MULTI_SEAT_LOCK` Lua script: checks all requested keys atomically and only locks if ALL keys are free; returns `0` and locks nothing if any single seat is held.
  2. Implemented `LUA_COMPARE_AND_DELETE_LOCK` Lua script: compares ownership token and deletes atomically to prevent race conditions during expiration.
  3. Added `MemoryRedisClient` in-memory Lua emulation for test and local dev environments.
* **Why**: Guarantees all-or-nothing seat reservations under high concurrent traffic.
* **Test Performed**: Executed concurrent race condition tests with two simultaneous clients requesting overlapping seats.
* **Result**: Exactly one client acquires all requested seats; the competing client receives `400 LOCK_FAILED` with zero partial locks left behind.

---

## 4. Unguessable Lock Token & Strict Ownership Verification

* **Issue**: Seat locks relied on easily guessable client user IDs, and `POST /bookings/create` trusted arbitrary seat arrays without verifying lock ownership.
* **Root Cause**: Missing cryptographic lock tokens and absence of pre-booking lock ownership assertion.
* **Files Changed**:
  * `server/services/seatLock.service.js`
  * `server/controllers/booking.controller.js`
  * `server/tests/booking_payment.test.js`
* **What Was Changed**:
  1. `SeatLockService.lockSeats` generates a random 128-bit hex `lockToken`.
  2. `SeatLockService.verifyLockOwnership` asserts that every seat is actively locked in Redis/DB with matching `userId` and `lockToken` before booking initiation.
* **Why**: Prevents IDOR attacks and unauthorized seat stealing.
* **Test Performed**: Tested booking creation with valid vs forged lock tokens.
* **Result**: Unauthorized booking requests without a valid lock token are immediately rejected with `400 BOOKING_CREATION_FAILED`.

---

## 5. Authoritative Server-Side Pricing Engine

* **Issue**: Ticket prices, fees, and discounts could potentially be spoofed by frontend clients.
* **Root Cause**: Lack of single-point recalculation on the backend.
* **Files Changed**:
  * `server/services/pricing.service.js`
  * `server/controllers/booking.controller.js`
  * `server/tests/booking_payment.test.js`
* **What Was Changed**:
  1. Pricing engine independently fetches base seat prices from `ShowSeat` / `Event` models.
  2. Automatically computes ₹30/seat convenience fee and 18% GST on fees.
  3. Validates coupons against `minOrderAmount`, `validUntil`, global `usageLimit`, and user `perUserLimit`.
  4. Recalculates final totals authoritatively before passing order amount to Razorpay.
* **Why**: Eliminates client-side price tampering.
* **Test Performed**: Tested fee calculation, coupon discount deduction, and loyalty redemption limits.
* **Result**: Server-calculated final amount is guaranteed and immutable.

---

## 6. Loyalty Points Timing & Double-Spend Fix

* **Issue**: Loyalty points were deducted at booking initiation (`INITIATED`) before payment was completed, causing point loss on abandoned or failed checkouts.
* **Root Cause**: Premature balance decrement before payment gateway confirmation.
* **Files Changed**:
  * `server/controllers/booking.controller.js`
  * `server/services/payment.service.js`
  * `server/models/LoyaltyTransaction.js`
  * `server/tests/booking_payment.test.js`
* **What Was Changed**:
  1. Removed loyalty point decrement from booking initiation.
  2. Deduct redeemed points only upon verified payment confirmation (`processPaymentSuccess`).
  3. Record full audit trail in `LoyaltyTransaction` with `balanceAfter` and transaction type (`REDEEMED`, `EARNED`, `REFERRAL_BONUS`).
* **Why**: Guarantees points are only consumed when a ticket is successfully issued.
* **Test Performed**: Initiated booking and verified point balance; verified points deducted and earned after payment verification.
* **Result**: Zero premature balance deductions; immutable loyalty ledger maintained.

---

## 7. Real Razorpay Payment Architecture & Webhook Verification

* **Issue**: Mock signatures (`test_sig_`) were accepted universally, and webhook endpoints lacked cryptographic verification and idempotency guards.
* **Root Cause**: Incomplete gateway adapter abstraction and missing webhook signature verification.
* **Files Changed**:
  * `server/services/payment.service.js`
  * `server/controllers/booking.controller.js`
  * `server/routes/payment.routes.js`
  * `server/tests/booking_payment.test.js`
* **What Was Changed**:
  1. Production mode strictly rejects mock payment signatures and requires genuine Razorpay HMAC SHA256 signatures.
  2. Implemented `POST /api/payments/webhook` with HMAC SHA256 signature verification.
  3. Added idempotency guard (`bookingStatus === 'CONFIRMED'`) to prevent duplicate ticket generation, double loyalty rewards, or double inventory decrements on repeated webhook delivery.
* **Why**: Provides enterprise-grade payment security and prevents replay attacks.
* **Test Performed**: Simulated valid and duplicate payment verification payloads.
* **Result**: First payment verification confirms booking and generates signed QR pass; duplicate requests return cleanly without duplicating state changes.

---

## 8. Real Refunds & Show-Specific Seat Release

* **Issue**: Cancellations updated local database status to `REFUNDED` without calling the gateway refund API, used a hardcoded 75% refund percentage, and did not release show-specific seats cleanly.
* **Root Cause**: Missing payment provider refund integration and static seat model coupling.
* **Files Changed**:
  * `server/services/refund.service.js`
  * `server/controllers/refund.controller.js`
  * `server/tests/refund_search_dashboard.test.js`
* **What Was Changed**:
  1. Implemented dynamic cancellation policies based on time-to-show (e.g. 90% if >24h, 75% if 2–24h, 0% if <2h).
  2. Integrates with `razorpay.payments.refund` API for active payment IDs.
  3. Releases only the show's `ShowSeat` records (`AVAILABLE`) without modifying static screen seat definitions.
* **Why**: Adheres to dynamic cinema/event refund rules and real financial settlement.
* **Test Performed**: Verified cancellation calculation, status transition to `CANCELLED`, ShowSeat release, and user notification generation.
* **Result**: Verified refund processing with atomic inventory release and real-time user notification.

---

## 9. QR Ticket Security & Gate Check-In Protection

* **Issue**: QR scanner endpoint had optional authentication, allowing anyone to forge check-ins or scan tickets for unrelated venues.
* **Root Cause**: Weak route middleware and missing organizer resource ownership validation.
* **Files Changed**:
  * `server/routes/booking.routes.js`
  * `server/services/ticket.service.js`
  * `server/tests/booking_payment.test.js`
* **What Was Changed**:
  1. Secured `POST /api/bookings/tickets/scan-checkin` with mandatory `authenticate` and `authorize('ADMIN', 'ORGANIZER')`.
  2. Validates organizer ownership against the specific event/venue.
  3. Cryptographically signs QR verification tokens (`SPQR-BK-...-signature`).
  4. Uses atomic `findOneAndUpdate` with condition `{ checkInStatus: 'NOT_CHECKED_IN' }` to prevent race conditions during simultaneous entry scans.
* **Why**: Prevents ticket duplication, gate fraud, and unauthorized organizer check-ins.
* **Test Performed**: Tested valid scan by admin, rejection of second scan (duplicate entry alert), and rejection of unauthenticated requests.
* **Result**: First scan succeeds with `200 ADMITTED`; second scan is blocked with `400 ALREADY_USED`.

---

## 10. Refresh Token Security & Token Family Reuse Detection

* **Issue**: Refresh tokens were stored in plain text and lacked token family invalidation upon reuse of a revoked token.
* **Root Cause**: Incomplete token rotation lifecycle.
* **Files Changed**:
  * `server/models/RefreshToken.js`
  * `server/utils/jwt.js`
  * `server/controllers/auth.controller.js`
  * `server/tests/auth.test.js`
* **What Was Changed**:
  1. SHA-256 hashed refresh tokens stored in MongoDB.
  2. Implemented token family tracking (`familyId`).
  3. If a revoked token is presented, the entire token family is immediately revoked, protecting the user from session hijacking.
* **Why**: Industry best practice for OAuth2/JWT refresh token rotation.
* **Test Performed**: Verified token rotation and token family invalidation in auth test suite.
* **Result**: Seamless session rotation and automatic compromise containment.

---

## 11. Grounded AI Assistant & Budget/City Filtering

* **Issue**: AI assistant extracted budget and city entities but did not ground them in actual MongoDB database queries, returning hallucinated or unfiltered catalog items.
* **Root Cause**: Entity extraction was not linked to MongoDB query filters (`price <= budget`, `Show -> Venue -> City`).
* **Files Changed**:
  * `server/controllers/aiAssistant.controller.js`
  * `server/tests/recommendation_ai.test.js`
* **What Was Changed**:
  1. Integrated structured query synthesis: queries movies with shows having `priceTiers.price <= maxBudget`.
  2. Traced city availability through `Movie -> Show -> Venue -> City`.
  3. AI response is strictly formatted using actual database query results with zero hallucination.
* **Why**: Guarantees that AI recommendations reflect real live catalog prices and locations.
* **Test Performed**: Tested "movies under ₹300", "below 500", and live comedy events in `recommendation_ai.test.js`.
* **Result**: All returned recommendations strictly respect budget bounds and venue locations.

---

## 12. Referral Rewards & First-Booking Rule

* **Issue**: Referral points were awarded at user registration instead of after the referred friend's first eligible booking.
* **Root Cause**: Premature reward trigger in auth controller.
* **Files Changed**:
  * `server/controllers/auth.controller.js`
  * `server/services/payment.service.js`
* **What Was Changed**:
  1. Registration tracks `referredBy` without awarding referrer points.
  2. Referrer is rewarded 50 loyalty points only upon friend's first confirmed booking confirmation (`priorConfirmedBookingsCount === 0`).
* **Why**: Prevents referral farming and aligns with business policy.
* **Test Performed**: Verified first-booking referral ledger entry creation.
* **Result**: Referrers receive bonuses exclusively upon verified friend checkout.
