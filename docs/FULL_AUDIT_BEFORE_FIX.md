# ShowPulse / MovieBook — Full Codebase Audit (Before Fixes)

**Date**: September 2026  
**Auditor**: Antigravity AI Engineering Team  
**Scope**: Full Stack (Frontend Client, Backend API, Database Models, Sockets, Redis, Payment & Security)

---

## 1. Executive Summary

This audit represents an exhaustive analysis of the `moviebook` (ShowPulse) full-stack ticketing platform codebase. While the repository contains a comprehensive foundation with React 18 / Tailwind CSS on the frontend and Express / Mongoose / Redis / Socket.IO on the backend, significant architectural defects, concurrency vulnerabilities, security oversights, and business-logic flaws were identified.

---

## 2. Current Architecture & Component Tracing

### 2.1 Backend Architecture
- **Framework**: Express.js with Node.js HTTP server + Socket.IO integration (`server/app.js`).
- **Database**: MongoDB with Mongoose ODM (`server/models/*`).
- **In-Memory Cache & Distributed Lock**: Redis via `ioredis` with an in-process fallback `MemoryRedisClient` (`server/config/redis.js`).
- **Payment Layer**: Razorpay Node SDK with development fallback mock (`server/services/payment.service.js`).
- **Real-Time Layer**: Socket.IO with rooms for show locking (`show:<showId>`) and user alerts (`user:<userId>`) (`server/sockets/index.js`).

### 2.2 Frontend Architecture
- **Framework**: React 18, Vite 5, Tailwind CSS, Lucide icons, React Router DOM v6, Zustand store (`client/src/*`).
- **API Client**: Axios instance configured in `client/src/services/api.js`.

---

## 3. Detailed Audit Findings by Severity & Priority

### Priority Key:
- **P0**: Critical / Production-Blocking (Data corruption, security breaches, financial loss, system collapse).
- **P1**: High Priority (Incorrect business logic, broken user flows, race conditions).
- **P2**: Medium Priority (Performance bottlenecks, non-atomic increments, UX inconsistencies).
- **P3**: Low Priority / Roadmap Polish (SEO, PWA, code cleanup).

---

### 3.1 P0 — Critical Architectural & Security Flaws

| ID | Component | Issue Description | Root Cause |
|---|---|---|---|
| **P0-1** | Seat Inventory / Data Model | **Global Physical Seat Availability Mutation**: Booking a seat marks `Seat.isAvailable = false` globally on the physical Screen Seat model. Show B cannot book seat A1 if Show A booked it. | Absence of show-specific inventory layer (`ShowSeat`). Availability is mistakenly bound to static physical hardware definition (`server/models/Seat.js`, `server/controllers/venue.controller.js`, `server/services/payment.service.js`). |
| **P0-2** | Redis Locking | **Non-Atomic Multi-Seat Lock Acquisition**: `SeatLockService.lockSeats` loops through requested seats using sequential `get` then `set` calls. | Multi-key race condition allowing partial seat acquisition and conflicting overlapping locks without Lua atomicity (`server/services/seatLock.service.js`). |
| **P0-3** | Redis Locking | **Unsafe Compare-and-Delete Race Condition in Lock Release**: Unlocking seats reads key, checks ownership, and issues `DEL`. A lock expiring between GET and DEL causes deleting a subsequent user's lock. | Missing atomic Redis Lua script / compare-and-delete pattern (`server/services/seatLock.service.js`). |
| **P0-4** | Payment Security | **Mock Signatures Accepted in Production**: `verifySignature` accepts any signature prefixed with `test_sig_` regardless of environment. | Lack of environment-isolated payment adapter; production accepts spoofed mock signatures without Razorpay cryptographic verification (`server/services/payment.service.js`). |
| **P0-5** | Webhooks & Idempotency | **Missing Webhook Endpoint & Webhook Signature Verification**: No `POST /api/payments/webhook` route or raw body signature verification exists. | Payment confirmation relies solely on frontend callback (`server/routes/payment.routes.js`). |
| **P0-6** | QR Gate Security | **Unauthenticated Gate Check-In Route**: `POST /api/bookings/tickets/scan-checkin` uses `optionalAuth`. Anyone can scan/burn tickets. | `optionalAuth` used instead of `authenticate` + `authorize('ADMIN', 'ORGANIZER')` with event/venue ownership validation (`server/routes/booking.routes.js`). |
| **P0-7** | Socket Security | **Unauthorized Socket Channel Ingress**: Socket client can emit `join_user(userId)` with arbitrary `userId` to eavesdrop on private notifications and tickets. | No socket authentication handshake; arbitrary client input trusted for room joining (`server/sockets/index.js`). |
| **P0-8** | Authorization / IDOR | **Unauthenticated & IDOR Booking Access**: `GET /api/bookings/:id` uses `optionalAuth` and exposes sensitive PII (`user.name`, `user.email`, `user.phone`) to unauthenticated guests. | Missing authorization and IDOR guard (`server/routes/booking.routes.js`, `server/controllers/booking.controller.js`). |
| **P0-9** | Refresh Token Security | **Missing Token Family Invalidation on Reuse**: When a revoked refresh token is presented, error is thrown without revoking the active token family. | Incomplete token rotation lifecycle allowing stolen token replay (`server/utils/jwt.js`). |
| **P0-10** | Production Lock Fallback | **Silent Fallback to In-Memory Redis in Production**: In production, if Redis is down, server falls back to single-process in-memory locks, breaking distributed locking across multi-instance clusters. | No production strict assertion on shared Redis client (`server/config/redis.js`). |

---

### 3.2 P1 — High Priority Business Logic & Concurrency Bugs

| ID | Component | Issue Description | Root Cause |
|---|---|---|---|
| **P1-1** | Frontend Axios Contract | **Inconsistent Response Interceptor Handling**: `api.interceptors.response` unwraps `response.data`, but some components expect Axios response wrapper while others expect raw data. | Mixed expectations between raw payload and Axios envelope (`client/src/services/api.js`). |
| **P1-2** | Loyalty System | **Premature Point Deduction Before Payment**: Loyalty points are deducted upon booking initiation (`/bookings/create`). Abandoned checkouts permanently lose points. | Points not reserved or deducted post-payment confirmation (`server/controllers/booking.controller.js`). |
| **P1-3** | Referral System | **Premature Referral Points on Registration**: Referrer receives 50 loyalty points immediately on user registration instead of after first successful booking. | Trigger attached to `register` rather than verified first booking completion (`server/controllers/auth.controller.js`). |
| **P1-4** | Refund System | **Fake Refund Execution**: `RefundService.cancelBooking` marks refund as `PROCESSED` without calling Razorpay Refund API (`razorpay.payments.refund`). | Missing real payment provider refund invocation (`server/services/refund.service.js`). |
| **P1-5** | Cancellation Policy | **Hardcoded Refund Percentage**: `refundPercentage = 75` is hardcoded; showtime cutoff hours and event-specific cancellation policies are ignored. | Missing policy lookup and time validation (`server/services/refund.service.js`). |
| **P1-6** | Coupon Concurrency | **Non-Atomic Coupon Usage & Limit Enforcement**: Coupon usage count and user limit are checked without atomic reservation/increment, susceptible to race conditions. | Lacks atomic MongoDB `$inc` / transaction constraint (`server/services/pricing.service.js`). |
| **P1-7** | Event Capacity Concurrency | **Non-Atomic Ticket Category Capacity Decrement**: Event ticket purchases do not atomically decrement and enforce `soldCount <= capacity`. | Missing atomic update guard against overselling (`server/controllers/booking.controller.js`). |
| **P1-8** | AI Assistant Budget | **Ignored Budget Filter**: Natural language queries specifying budget (e.g., "movies under ₹300") extract `maxBudget` but omit price filter from database queries. | Missing price tier query filter against database show prices (`server/controllers/aiAssistant.controller.js`). |
| **P1-9** | AI Assistant City Filter | **Disconnected City Filtering**: AI queries filter movies directly rather than tracing `Movie -> Show -> Screen -> Venue -> City`. Movies without shows in the requested city are returned. | Missing relational aggregation across show schedules (`server/controllers/aiAssistant.controller.js`). |
| **P1-10** | Security Logging | **Password Reset Token Logged in Production**: Password reset token is logged to standard output via `logger.info`. | Sensitive credential leak in logs (`server/controllers/auth.controller.js`). |

---

### 3.3 P2 — Medium Priority & Consistency Issues

| ID | Component | Issue Description | Root Cause |
|---|---|---|---|
| **P2-1** | Database Indexing | Missing compound indexes on `ShowSeat(show, seat)`, `Booking(user, createdAt)`, `Payment(orderId, paymentId)`, `RefreshToken(user, token)`. | Unindexed high-frequency query filters (`server/models/*`). |
| **P2-2** | Organizer Authorization | Organizer routes lack resource ownership validation (e.g. Organizer A editing Organizer B's events). | Missing resource tenancy checks (`server/controllers/organizer.controller.js`). |
| **P2-3** | Admin Analytics | Analytics metrics should use robust aggregation pipelines reconciling confirmed payments and cancellations. | Potential discrepancy in revenue calculations (`server/controllers/admin.controller.js`). |
| **P2-4** | Group Booking | Group booking UI / backend flow needs a clean dedicated state model (`GroupBooking`, `SeatAssignment`). | Incomplete dedicated abstraction. |
| **P2-5** | Email Verification | Registration automatically activates accounts without email verification link/token workflow. | Missing email verification token lifecycle (`server/controllers/auth.controller.js`). |

---

### 3.4 P3 — Low Priority / Roadmap Features

| ID | Component | Issue Description | Root Cause |
|---|---|---|---|
| **P3-1** | PWA & SEO | Static metadata on client; missing manifest.json and structured JSON-LD breadcrumbs for movies/events. | Basic static index.html (`client/index.html`). |
| **P3-2** | Image Uploads | Relying on external image URLs rather than validated secure multipart upload pipeline. | Direct URL input fields in admin/organizer forms. |

---

## 4. Remediation Plan

We will proceed through the 18 phases specified in the instructions:
1. **Phase 1**: Standardize Frontend Axios Response Contract (`api.js` + all 14 consumers).
2. **Phase 2**: Introduce `ShowSeat` Show-Specific Seat Inventory & Migrate `Seat.isAvailable`.
3. **Phase 3**: Implement Atomic Multi-Seat Redis Locking (Lua scripts, compare-and-delete, lock tokens).
4. **Phase 4**: Implement Lock Ownership Verification & Booking State Machine.
5. **Phase 5**: Server-Authoritative Pricing, Atomic Coupon Enforcement & Post-Payment Loyalty Ledger.
6. **Phase 6**: Razorpay Production Architecture (Production vs Mock adapter).
7. **Phase 7**: Razorpay Webhook Endpoint, Raw Signature Verification & Idempotency.
8. **Phase 8**: Real Payment-Provider Refund Processing & Cancellation Policy Engine.
9. **Phase 9**: Secure Gate QR Check-In with Strict Role & Venue Ownership Validation.
10. **Phase 10**: Socket.IO JWT Authentication, Refresh Token Family Rotation & PII IDOR Protection.
11. **Phase 11**: Event Ticket Category Capacity Concurrency Controls.
12. **Phase 12**: Grounded AI Assistant with True Database Price & City Filtering.
13. **Phase 13**: Referral Reward Post-First-Booking & Group Booking Abstraction.
14. **Phase 14**: Secure File Upload Abstraction & Notification Dispatcher.
15. **Phase 15**: Verified Admin & Organizer Analytics Aggregations.
16. **Phase 16**: Responsive UI Polish, PWA Manifest & SEO Enhancements.
17. **Phase 17**: Comprehensive Unit, Integration, Concurrency & Security Test Suite.
18. **Phase 18**: Final Production Audit, Gap Analysis & Changelog Documentation.
