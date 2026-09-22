const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true
    },
    paymentId: {
      type: String,
      sparse: true
    },
    signature: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ['CREATED', 'CAPTURED', 'FAILED', 'REFUNDED'],
      default: 'CREATED'
    },
    method: {
      type: String,
      default: 'RAZORPAY'
    },
    errorReason: String,
    rawWebhookPayload: mongoose.Schema.Types.Mixed
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ user: 1 });
paymentSchema.index({ booking: 1 });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
