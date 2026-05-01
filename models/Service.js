const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Service description is required']
    },
    duration: {
      type: Number, // in minutes
      required: [true, 'Service duration is required'],
      min: [15, 'Duration must be at least 15 minutes']
    },
    price: {
      type: Number,
      required: [true, 'Service price is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'LKR'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);