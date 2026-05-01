# SlotEase - Appointment Booking System Backend

Multi business appointment booking platform built with the MERN stack.

## Features
- 🔐 JWT authentication with role-based access control
- 👤 User management (customers, business owners, admins)
- 🏢 Multi-business support
- 📅 Service management with pricing and duration
- 📆 Smart appointment booking with conflict detection
- ⏰ Business hours validation
- 🔍 Availability checking

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB Atlas
- **Authentication:** JWT + bcrypt
- **Validation:** express validator

## Installation

\`\`\`bash
npm install
\`\`\`

Create `.env`:
\`\`\`
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
\`\`\`

\`\`\`bash
npm run dev
\`\`\`

