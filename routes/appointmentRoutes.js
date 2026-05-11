const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Business = require('../models/Business');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Helper function to calculate end time
const calculateEndTime = (startTime, duration) => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

// Helper function to check if time slot is available
const isTimeSlotAvailable = async (businessId, date, startTime, endTime, excludeAppointmentId = null) => {
  const query = {
    business: businessId,
    appointmentDate: date,
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
    ]
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const conflictingAppointments = await Appointment.find(query);
  return conflictingAppointments.length === 0;
};

// @route   POST /api/appointments
// @desc    Create new appointment
// @access  Private (Customer)
router.post('/', protect, async (req, res) => {
  try {
    const { service: serviceId, appointmentDate, startTime, customerName, customerEmail, customerPhone, notes } = req.body;

    console.log('=== CREATE APPOINTMENT REQUEST ===');
    console.log('User ID:', req.user._id);
    console.log('User Email:', req.user.email);
    console.log('User Role:', req.user.role);
    console.log('Request body:', req.body);

    // Get service details
    const service = await Service.findById(serviceId).populate('business');
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    console.log('Service found:', service.name);
    console.log('Business:', service.business.name);

    // Calculate end time
    const endTime = calculateEndTime(startTime, service.duration);
    console.log('Time slot:', startTime, '-', endTime);

    // Check if business is open on this day
    const appointmentDay = new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const businessHours = service.business.operatingHours[appointmentDay];
    
    if (!businessHours || businessHours.open === 'Closed') {
      return res.status(400).json({ message: `Business is closed on ${appointmentDay}` });
    }

    // Validate time is within business hours
    if (startTime < businessHours.open || endTime > businessHours.close) {
      return res.status(400).json({ 
        message: `Please select a time between ${businessHours.open} and ${businessHours.close}` 
      });
    }

    // Check for conflicts
    const isAvailable = await isTimeSlotAvailable(service.business._id, appointmentDate, startTime, endTime);
    if (!isAvailable) {
      return res.status(400).json({ message: 'This time slot is already booked' });
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
      currency: service.currency,
      status: 'pending'
    });

    console.log('=== APPOINTMENT CREATED SUCCESSFULLY ===');
    console.log('Appointment ID:', appointment._id);
    console.log('Customer ID saved:', appointment.customer);
    console.log('Status:', appointment.status);
    console.log('Full appointment object:', JSON.stringify(appointment, null, 2));

    // Populate before sending response
    await appointment.populate('service business customer');

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      appointment
    });
  } catch (error) {
    console.error('=== ERROR CREATING APPOINTMENT ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/appointments
// @desc    Get appointments based on user role
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    console.log('=== GET APPOINTMENTS REQUEST ===');
    console.log('User ID:', req.user._id);
    console.log('User ID Type:', typeof req.user._id);
    console.log('User Email:', req.user.email);
    console.log('User Role:', req.user.role);

    let query = {};

    if (req.user.role === 'customer') {
      // Customer sees their own appointments
      query.customer = req.user._id;
      console.log('Customer query:', JSON.stringify(query));
      console.log('Looking for appointments with customer ID:', req.user._id.toString());
    } else if (req.user.role === 'business_owner') {
      // Business owner sees appointments for their businesses
      const businesses = await Business.find({ owner: req.user._id });
      const businessIds = businesses.map(b => b._id);
      query.business = { $in: businessIds };
      console.log('Business owner query:', JSON.stringify(query));
      console.log('Business IDs:', businessIds);
    } else if (req.user.role === 'admin') {
      // Admin sees all appointments
      console.log('Admin - fetching all appointments');
    }

    console.log('Executing query:', JSON.stringify(query));

    const appointments = await Appointment.find(query)
      .populate('service', 'name duration price currency')
      .populate('business', 'name contactPhone address')
      .populate('customer', 'name email')
      .sort({ appointmentDate: -1, startTime: -1 })
      .lean();

    console.log('=== APPOINTMENTS FOUND ===');
    console.log('Count:', appointments.length);
    
    if (appointments.length > 0) {
      console.log('First appointment sample:');
      console.log('  ID:', appointments[0]._id);
      console.log('  Customer ID:', appointments[0].customer?._id || appointments[0].customer);
      console.log('  Service:', appointments[0].service?.name);
      console.log('  Status:', appointments[0].status);
    } else {
      console.log('NO APPOINTMENTS FOUND - Query returned empty array');
    }

    res.json({
      success: true,
      count: appointments.length,
      appointments
    });
  } catch (error) {
    console.error('=== ERROR FETCHING APPOINTMENTS ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/appointments/test/mine
// @desc    TEST - Check what appointments exist for this user
// @access  Private
router.get('/test/mine', protect, async (req, res) => {
  try {
    console.log('=== TEST ENDPOINT - CHECKING USER APPOINTMENTS ===');
    console.log('Logged in user ID:', req.user._id);
    console.log('Logged in user role:', req.user.role);

    // Get ALL appointments without any filter
    const allAppointments = await Appointment.find({}).lean();
    
    console.log('Total appointments in database:', allAppointments.length);

    // Manually check which ones belong to this user
    const myAppointments = allAppointments.filter(apt => {
      const customerIdString = apt.customer ? apt.customer.toString() : null;
      const userIdString = req.user._id.toString();
      const matches = customerIdString === userIdString;
      
      console.log(`Appointment ${apt._id}: customer=${customerIdString}, matches=${matches}`);
      
      return matches;
    });

    res.json({
      success: true,
      debug: {
        userId: req.user._id.toString(),
        userRole: req.user.role,
        totalAppointmentsInDB: allAppointments.length,
        myAppointmentsCount: myAppointments.length
      },
      myAppointments: myAppointments,
      allAppointmentsSample: allAppointments.slice(0, 3).map(a => ({
        id: a._id,
        customerId: a.customer,
        customerIdType: typeof a.customer,
        matchesUser: a.customer && a.customer.toString() === req.user._id.toString(),
        date: a.appointmentDate,
        status: a.status
      }))
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// @route   GET /api/appointments/debug/all
// @desc    DEBUG - Get ALL appointments (temporary)
// @access  Private
router.get('/debug/all', protect, async (req, res) => {
  try {
    const allAppointments = await Appointment.find({})
      .populate('service business customer')
      .lean();
    
    res.json({
      total: allAppointments.length,
      userRole: req.user.role,
      userId: req.user._id,
      appointments: allAppointments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/appointments/:id
// @desc    Get single appointment
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('service')
      .populate('business')
      .populate('customer', 'name email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check authorization
    const isCustomer = appointment.customer._id.toString() === req.user._id.toString();
    const business = await Business.findById(appointment.business._id);
    const isOwner = business.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this appointment' });
    }

    res.json({ success: true, appointment });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PATCH /api/appointments/:id/status
// @desc    Update appointment status (business owner/admin only)
// @access  Private
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user is business owner or admin
    const business = await Business.findById(appointment.business);
    const isOwner = business.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this appointment' });
    }

    appointment.status = status;
    await appointment.save();

    await appointment.populate('service business customer');

    res.json({
      success: true,
      message: 'Appointment status updated',
      appointment
    });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PATCH /api/appointments/:id/cancel
// @desc    Cancel appointment (customer or business owner)
// @access  Private
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check authorization
    const isCustomer = appointment.customer.toString() === req.user._id.toString();
    const business = await Business.findById(appointment.business);
    const isOwner = business.owner.toString() === req.user._id.toString();

    if (!isCustomer && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to cancel this appointment' });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel completed appointment' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    await appointment.populate('service business customer');

    res.json({
      success: true,
      message: 'Appointment cancelled',
      appointment
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;