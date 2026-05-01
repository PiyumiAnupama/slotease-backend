# SlotEase Backend

> Multi-business appointment booking platform connecting service providers with customers

SlotEase RESTful API built with Node.js, Express, and MongoDB that enables businesses to manage services and customers to book appointments seamlessly.

---

## 🎯 Overview

SlotEase solves the appointment scheduling problem for small businesses in Sri Lanka (salons, clinics, legal consultancies, tutoring centers) by providing a centralized platform with smart scheduling logic, conflict detection, and role-based access control.

### Key Features

- 🔐 **Secure Authentication** — JWT-based auth with bcrypt password hashing
- 👥 **Role-Based Access** — Three user roles (customer, business_owner, admin)
- 🏢 **Multi-Business Support** — Business owners can register and manage their businesses
- 📋 **Service Management** — Define services with pricing, duration, and descriptions
- 📅 **Smart Booking** — Automatic conflict detection and business hours validation
- ⏰ **Availability Checking** — Real-time slot availability based on existing bookings
- ✅ **Status Tracking** — Appointment lifecycle (pending → confirmed → completed/cancelled)

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **Database** | MongoDB Atlas |
| **Authentication** | JWT + bcrypt |
| **Validation** | express-validator |
| **Dev Tools** | Nodemon, dotenv |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/PiyumiAnupama/slotease-backend.git
   cd slotease-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGO_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_secret_key_min_32_characters
   ```

4. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

The API will be running at `http://localhost:3000`

---

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and receive JWT token |
| GET | `/api/auth/me` | Protected | Get current user details |

### Business Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/businesses` | Business Owner/Admin | Create a new business |
| GET | `/api/businesses` | Public | Get all active businesses |
| GET | `/api/businesses/my-businesses` | Protected | Get user's businesses |
| GET | `/api/businesses/:id` | Public | Get business by ID |

### Service Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/services` | Business Owner/Admin | Create a service |
| GET | `/api/services` | Public | Get all active services |
| GET | `/api/services/business/:businessId` | Public | Get services by business |
| GET | `/api/services/:id` | Public | Get service by ID |
| PUT | `/api/services/:id` | Owner/Admin | Update service |
| DELETE | `/api/services/:id` | Owner/Admin | Soft delete service |

### Appointment Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/appointments` | Protected | Create an appointment |
| GET | `/api/appointments` | Protected | Get appointments (role-filtered) |
| GET | `/api/appointments/:id` | Protected | Get appointment by ID |
| PATCH | `/api/appointments/:id/status` | Business Owner/Admin | Update appointment status |
| PATCH | `/api/appointments/:id/cancel` | Customer/Owner | Cancel appointment |

---

## 🏗️ Project Structure

```
backend/
├── config/
│   └── db.js              # MongoDB connection
├── models/
│   ├── User.js            # User schema
│   ├── Business.js        # Business schema
│   ├── Service.js         # Service schema
│   └── Appointment.js     # Appointment schema
├── routes/
│   ├── authRoutes.js      # Auth endpoints
│   ├── businessRoutes.js  # Business endpoints
│   ├── serviceRoutes.js   # Service endpoints
│   └── appointmentRoutes.js # Appointment endpoints
├── middleware/
│   └── authMiddleware.js  # JWT verification & role checking
├── .env                   # Environment variables (not in git)
├── .gitignore
├── package.json
└── server.js              # Entry point
```

---

## 🔒 Security Features

- **Password Hashing:** bcrypt with salt rounds of 12
- **JWT Tokens:** 7-day expiry, signed with secret key
- **Input Validation:** All endpoints validate input with express-validator
- **Role-Based Access:** Middleware restricts routes by user role
- **Ownership Verification:** Users can only modify their own resources
- **CORS Enabled:** Configured for frontend integration

---

## 🧪 Testing

### Manual Testing with Thunder Client 

1. Register a business owner user
2. Login to get JWT token
3. Create a business using the token
4. Add services to the business
5. Register a customer user
6. Create an appointment as the customer
7. Verify business owner can see and manage the appointment

---

## 🚧 Future Enhancements

- [ ] Email notifications for appointment confirmations
- [ ] SMS reminders before appointments
- [ ] Search and filtering for businesses by location/category
- [ ] Rating and review system for businesses
- [ ] Payment integration
- [ ] Admin dashboard for platform management
- [ ] React frontend with booking calendar UI
- [ ] Real-time updates with Socket.io

---

## 👨‍💻 Author

**Anupama Piyadigama**

- GitHub: [@PiyumiAnupama](https://github.com/PiyumiAnupama)
- LinkedIn: [anupamapiyadigama](https://linkedin.com/in/anupamapiyadigama)
- Email: anupamapiyadigama@gmail.com
- Portfolio: [anupama.onrender.com](https://anupama.onrender.com)

---

**⭐ If you found this project helpful, please consider giving it a star!**
