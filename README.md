# 9antra - The Bridge

A modern e-learning platform built with React, Node.js, PostgreSQL, and Docker.

## 🚀 Features

- **Modern Architecture**: Built with React frontend and Node.js/Express backend
- **PostgreSQL Database**: Robust relational database with Sequelize ORM
- **Docker Support**: Fully containerized with Docker Compose
- **Admin Panel**: Course management with pgAdmin database interface
- **File Upload**: Image upload with multer
- **API Structure**: Following REST API best practices with serializers and middleware
- **Error Handling**: Comprehensive error handling with custom error classes
- **Validation**: Joi validation middleware
- **CRUD Operations**: Reusable CRUD operations utility

## 🛠️ Technology Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Framer Motion
- Axios
- React Router DOM

### Backend
- Node.js
- Express.js
- Sequelize ORM
- PostgreSQL
- Joi (validation)
- Multer (file upload)
- bcrypt
- Express Async Errors

### DevOps
- Docker & Docker Compose
- pgAdmin
- nodemon

## 📋 Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Git

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/hamzafallahi/Technical-Test-9antra.tn.git
   cd Technical-Test-9antra.tn
   ```

2. **Start the application**
   ```bash
   # On Windows
   start.bat
   
   # On Linux/Mac
   chmod +x start.sh
   ./start.sh
   ```

3. **Access the services**
   - Backend API: http://localhost:3000
   - pgAdmin: http://localhost:8080 (admin@9antra.tn / admin123)
   - Frontend: http://localhost:5173 (run `npm run dev` separately)

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Update database credentials if needed

3. **Start PostgreSQL**
   ```bash
   docker-compose up postgres pgadmin -d
   ```

4. **Run the backend**
   ```bash
   npm run server
   ```

5. **Run the frontend**
   ```bash
   npm run dev
   ```

## 🐳 Docker Services

- **postgres**: PostgreSQL 15 database server
- **pgadmin**: Database administration interface
- **backend**: Node.js API server

## 📁 Project Structure

```
├── src/                    # Frontend React app
├── server/                 # Backend API
│   ├── controllers/        # Route controllers
│   ├── models/            # Sequelize models
│   ├── routes/            # Express routes
│   ├── middlewares/       # Custom middleware
│   ├── serializers/       # Data serializers
│   ├── validation-rules/  # Joi validation schemas
│   ├── error/             # Error handling
│   ├── utils/             # Utility functions
│   ├── config/            # Configuration files
│   └── uploads/           # File uploads
├── docker-compose.yml     # Docker services configuration
└── package.json          # Dependencies
```

## 🔧 API Endpoints

### Courses API
- `GET /api/courses` - Get all courses (with pagination, filtering, sorting)
- `GET /api/courses/:id` - Get course by ID
- `POST /api/courses` - Create new course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Query Parameters
- `page[size]`: Number of items per page
- `page[number]`: Page number (0-based)
- `sort`: Sort fields (prefix with `-` for descending)
- `fields`: Select specific fields
- `filter[field]`: Filter by field value

### Contact API
- `POST /api/contactus` - Submit contact form

## 🗃️ Database

The application uses PostgreSQL with Sequelize ORM. Models are automatically created/updated using `sync({ alter: true })`.

### Database Management
- Access pgAdmin at http://localhost:8080
- Default credentials: admin@9antra.tn / admin123
- Server connection: postgres / postgres123

## 🔐 Environment Variables

```env
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=9antra_platform
DB_USER=postgres
DB_PASSWORD=postgres123

# Server Configuration
PORT=3000
NODE_ENV=development

# Email Configuration (for contact form)
FROM_EMAIL_GMAIL=your-email@gmail.com
FROM_EMAIL_PASSWORD=your-app-password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

- **Hamza Fallahi** - *Initial work* - [hamzafallahi](https://github.com/hamzafallahi)

## 🙏 Acknowledgments

- 9antra Team
- React and Node.js communities
- Docker for containerization
