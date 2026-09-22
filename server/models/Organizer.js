const mongoose = require('mongoose');

const organizerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    organizationName: {
      type: String,
      required: [true, 'Organization / Business Name is required'],
      trim: true
    },
    businessEmail: {
      type: String,
      required: [true, 'Business email is required'],
      lowercase: true,
      trim: true
    },
    businessPhone: {
      type: String,
      required: true,
      trim: true
    },
    website: {
      type: String,
      default: ''
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'India' }
    },
    taxId: {
      type: String, // GST or PAN
      default: ''
    },
    status: {
      type: String,
      enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      default: 'APPROVED' // For smooth dev demo; in production requires admin review
    },
    commissionRate: {
      type: Number,
      default: 5.0 // 5% platform commission
    },
    payoutDetails: {
      bankName: String,
      accountNumber: String,
      ifscCode: String,
      upiId: String
    },
    metrics: {
      totalEvents: { type: Number, default: 0 },
      totalTicketsSold: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

organizerSchema.index({ status: 1 });
organizerSchema.index({ organizationName: 1 });

const Organizer = mongoose.model('Organizer', organizerSchema);
module.exports = Organizer;
