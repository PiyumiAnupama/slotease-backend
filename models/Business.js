const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Business description is required']
    },
    category: {
      type: String,
      required: [true, 'Business category is required'],
      enum: ['salon', 'clinic', 'legal', 'tutoring', 'mechanic', 'other']
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required']
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: 'Sri Lanka' }
    },
    operatingHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Business', businessSchema);