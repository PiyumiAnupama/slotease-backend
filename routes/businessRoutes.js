const express = require('express');
const router = express.Router();
const Business = require('../models/Business');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');

// Create a new business (business owners only)
router.post('/',
  protect,
  restrictTo('business_owner', 'admin'),
  [
    body('name').notEmpty().withMessage('Business name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category').isIn(['salon', 'clinic', 'legal', 'tutoring', 'mechanic', 'other'])
      .withMessage('Invalid category'),
    body('contactEmail').isEmail().withMessage('Valid contact email is required'),
    body('contactPhone').notEmpty().withMessage('Contact phone is required'),
    body('address.street').notEmpty().withMessage('Street address is required'),
    body('address.city').notEmpty().withMessage('City is required'),
    body('address.state').notEmpty().withMessage('State is required'),
    body('address.zipCode').notEmpty().withMessage('Zip code is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const businessData = {
        ...req.body,
        owner: req.user._id // Automatically set owner to logged-in user
      };

      const business = await Business.create(businessData);

      res.status(201).json({
        message: 'Business created successfully',
        business
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Get all businesses
router.get('/', async (req, res) => {
  try {
    const businesses = await Business.find({ isActive: true })
      .populate('owner', 'name email')
      .select('-__v');

    res.json({
      count: businesses.length,
      businesses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get businesses owned by current user
router.get('/my-businesses', protect, async (req, res) => {
  try {
    const businesses = await Business.find({ owner: req.user._id })
      .select('-__v');

    res.json({
      count: businesses.length,
      businesses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single business by ID
router.get('/:id', async (req, res) => {
  try {
    const business = await Business.findById(req.params.id)
      .populate('owner', 'name email');

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    res.json({ business });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;