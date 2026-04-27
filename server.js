const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Middleware
const { protect, restrictTo } = require('./middleware/authMiddleware');

// Protected routes (test routes)
app.get('/api/profile', protect, (req, res) => {
  res.json({ 
    message: 'This is your profile', 
    user: req.user 
  });
});

app.get('/api/admin', protect, restrictTo('admin'), (req, res) => {
  res.json({ message: 'Welcome admin!' });
});

app.get('/', (req, res) => {
  res.json({ message: 'SlotEase API is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});