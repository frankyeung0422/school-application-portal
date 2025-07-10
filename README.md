# School Application Portal

A comprehensive web application for managing kindergarten applications in Hong Kong. This portal helps parents find information about kindergartens and streamline the application process.

## Features

### 🏠 **Home Page**
- Modern, responsive landing page with hero section
- Feature highlights and statistics
- Call-to-action sections

### 🔍 **Kindergarten Search & Browse**
- Comprehensive list of Hong Kong kindergartens
- Advanced search functionality by name and district
- District-based filtering
- Real-time search results

### 📋 **Detailed Kindergarten Information**
- Individual kindergarten detail pages
- Complete contact information
- School addresses and websites
- Organization details

### 📝 **Application System**
- Online application forms
- User-friendly modal interface
- Form validation
- Application submission tracking

### 📱 **Responsive Design**
- Mobile-first approach
- Works seamlessly on all devices
- Modern UI/UX with smooth animations

### 🧭 **Navigation**
- Sticky navigation bar
- Mobile hamburger menu
- Active page indicators

## Technology Stack

### Frontend
- **React 19** - Modern React with hooks
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **CSS3** - Custom styling with animations
- **Responsive Design** - Mobile-first approach

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **CORS** - Cross-origin resource sharing

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account (or local MongoDB)
- npm or yarn package manager

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   Create a `.env` file in the backend directory with your MongoDB connection string:
   ```
   ATLAS_URI=your_mongodb_atlas_connection_string
   PORT=5000
   ```

4. **Import kindergarten data:**
   ```bash
   node -r dotenv/config src/scripts/importKindergartens.js
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`

## API Endpoints

### Kindergartens
- `GET /api/kindergartens` - Get all kindergartens
- `GET /api/kindergartens/:schoolNo` - Get specific kindergarten by school number

## Features in Detail

### Search & Filtering
- **Text Search**: Search by kindergarten name (English/Chinese) or district
- **District Filter**: Filter kindergartens by specific districts
- **Real-time Results**: Instant search results as you type
- **Clear Filters**: Easy reset of search criteria

### Application Process
- **Step-by-step Forms**: Guided application process
- **Form Validation**: Client-side validation for required fields
- **Responsive Forms**: Works on all device sizes
- **Application Tracking**: Future feature for tracking application status

## Future Enhancements

### Planned Features
- [ ] User authentication and registration
- [ ] Application status tracking
- [ ] Email notifications
- [ ] Advanced filtering (fees, curriculum, etc.)
- [ ] School reviews and ratings
- [ ] Map integration for school locations
- [ ] Multi-language support
- [ ] Admin dashboard for schools

## Support

For support and questions:
- Email: info@schoolportal.hk
- Phone: +852 1234 5678 