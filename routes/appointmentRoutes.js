const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Business = require('../models/Business');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');

// Helper function to calculate end time
const calculateEndTime = (startTime, durationMinutes) => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

// Check if time slot is available
const isTimeSlotAvailable = async (businessId, date, startTime, endTime, excludeAppointmentId = null) => {
  const query = {
    business: businessId,
    appointmentDate: date,
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      {
        $and: [
          { startTime: { $lt: endTime } },
          { endTime: { $gt: startTime } }
        ]
      }
    ]
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const conflictingAppointment = await Appointment.findOne(query);
  return !conflictingAppointment;
};

// Create a new appointment (customers only)
router.post('/',
  protect,
  [
    body('service').notEmpty().withMessage('Service ID is required'),
    body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
    body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required (HH:MM)'),
    body('customerName').notEmpty().withMessage('Customer name is required'),
    body('customerEmail').isEmail().withMessage('Valid customer email is required'),
    body('customerPhone').notEmpty().withMessage('Customer phone is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { service: serviceId, appointmentDate, startTime, customerName, customerEmail, customerPhone, notes } = req.body;

      // Get service details
      const service = await Service.findById(serviceId).populate('business');
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      if (!service.isActive) {
        return res.status(400).json({ message: 'This service is not available' });
      }

      // Calculate end time based on service duration
      const endTime = calculateEndTime(startTime, service.duration);

      // Check if business is open on that day
     const appointmentDay = new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const businessHours = service.business.operatingHours[appointmentDay];
      
      if (!businessHours || businessHours.open === 'Closed') {
        return res.status(400).json({ message: `Business is closed on ${appointmentDay}s` });
      }

      // Check if requested time is within business hours
      if (startTime < businessHours.open || endTime > businessHours.close) {
        return res.status(400).json({ 
          message: `Business hours are ${businessHours.open} - ${businessHours.close}` 
        });
      }

      // Check if time slot is available
      const available = await isTimeSlotAvailable(service.business._id, appointmentDate, startTime, endTime);
      if (!available) {
        return res.status(400).json({ message: 'This time slot is not available' });
      }

      // Create appointment
      const appointment = await Appointment.create({
        business: service.business._id,
        service: serviceId,
        customer: req.user._id,
        appointmentDate,
        startTime,
        endTime,
        customerName,
        customerEmail,
        customerPhone,
        notes,
        totalPrice: service.price,
        currency: service.currency
      });

      const populatedAppointment = await Appointment.findById(appointment._id)
        .populate('business', 'name contactEmail contactPhone')
        .populate('service', 'name duration price')
        .populate('customer', 'name email');

      res.status(201).json({
        message: 'Appointment created successfully',
        appointment: populatedAppointment
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Get all appointments (with filters)
router.get('/', protect, async (req, res) => {
  try {
    let query = {};

    // If customer, show only their appointments
    if (req.user.role === 'customer') {
      query.customer = req.user._id;
    }

    // If business owner, show appointments for their businesses
    if (req.user.role === 'business_owner') {
      const businesses = await Business.find({ owner: req.user._id });
      const businessIds = businesses.map(b => b._id);
      query.business = { $in: businessIds };
    }

    const appointments = await Appointment.find(query)
      .populate('business', 'name contactEmail contactPhone')
      .populate('service', 'name duration price')
      .populate('customer', 'name email')
      .sort({ appointmentDate: 1, startTime: 1 });

    res.json({
      count: appointments.length,
      appointments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single appointment
router.get('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('business', 'name description contactEmail contactPhone address')
      .populate('service', 'name description duration price')
      .populate('customer', 'name email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check access rights
    const isCustomer = appointment.customer._id.toString() === req.user._id.toString();
    const isBusinessOwner = await Business.findOne({ 
      _id: appointment.business._id, 
      owner: req.user._id 
    });
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isBusinessOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update appointment status (business owner or admin)
router.patch('/:id/status',
  protect,
  restrictTo('business_owner', 'admin'),
  [
    body('status').isIn(['pending', 'confirmed', 'completed', 'cancelled'])
      .withMessage('Invalid status')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const appointment = await Appointment.findById(req.params.id).populate('business');

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      // Check ownership
      const isOwner = appointment.business.owner.toString() === req.user._id.toString();
      if (!isOwner && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }

      appointment.status = req.body.status;
      await appointment.save();

      res.json({
        message: 'Appointment status updated',
        appointment
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Cancel appointment (customer can cancel their own)
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Only customer who made it or business owner can cancel
    const isCustomer = appointment.customer.toString() === req.user._id.toString();
    const business = await Business.findOne({ _id: appointment.business, owner: req.user._id });
    const isBusinessOwner = !!business;

    if (!isCustomer && !isBusinessOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel completed appointment' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({
      message: 'Appointment cancelled successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;