const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Business = require('../models/Business');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');

// Create a new service (business owner must own the business)
router.post('/',
  protect,
  restrictTo('business_owner', 'admin'),
  [
    body('business').notEmpty().withMessage('Business ID is required'),
    body('name').notEmpty().withMessage('Service name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('duration').isInt({ min: 15 }).withMessage('Duration must be at least 15 minutes'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { business, name, description, duration, price, currency } = req.body;

      // Check if business exists and belongs to the user
      const businessDoc = await Business.findById(business);
      if (!businessDoc) {
        return res.status(404).json({ message: 'Business not found' });
      }

      if (businessDoc.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'You can only add services to your own business' });
      }

      const service = await Service.create({
        business,
        name,
        description,
        duration,
        price,
        currency: currency || 'LKR'
      });

      res.status(201).json({
        message: 'Service created successfully',
        service
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Get all services for a specific business
router.get('/business/:businessId', async (req, res) => {
  try {
    const services = await Service.find({ 
      business: req.params.businessId,
      isActive: true 
    }).select('-__v');

    res.json({
      count: services.length,
      services
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all services (with business populated)
router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true })
      .populate('business', 'name category city')
      .select('-__v');

    res.json({
      count: services.length,
      services
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single service by ID
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('business', 'name description contactEmail contactPhone');

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ service });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update service (owner only)
router.put('/:id',
  protect,
  restrictTo('business_owner', 'admin'),
  async (req, res) => {
    try {
      const service = await Service.findById(req.params.id).populate('business');

      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      // Check ownership
      if (service.business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'You can only update your own services' });
      }

      const updatedService = await Service.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      res.json({
        message: 'Service updated successfully',
        service: updatedService
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Delete service (owner only)
router.delete('/:id',
  protect,
  restrictTo('business_owner', 'admin'),
  async (req, res) => {
    try {
      const service = await Service.findById(req.params.id).populate('business');

      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      // Check ownership
      if (service.business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'You can only delete your own services' });
      }

      // Soft delete - just mark as inactive
      service.isActive = false;
      await service.save();

      res.json({ message: 'Service deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;