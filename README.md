# Veterinary Clinic Backend API Documentation

## Overview
This is the backend API for a veterinary clinic management system. It provides endpoints for user authentication, animal management, and consultation tracking.

## Tech Stack
- Node.js
- Express.js
- MySQL
- Sequelize ORM
- JWT Authentication
- Bcrypt for password hashing

## Project Structure
```
backend/
├── models/              # Database models
│   ├── animales.js      # Animal model
│   ├── consultas.js     # Consultation model
│   ├── tipo_consultas.js # Consultation type model
│   ├── usuarios.js      # User model
│   └── init-models.js   # Model initialization
├── index.js            # Main application file
├── package.json        # Project dependencies
└── .env                # Environment variables
```

## Database Models

### Users (usuarios)
- id (INT, Primary Key, Auto-increment)
- correo (STRING, 60 chars)
- contraseña (STRING, 200 chars)
- isAdmin (BOOLEAN)
- telefono (CHAR, 11 chars)
- direccion (STRING, 100 chars)

### Animals (animales)
- id (INT, Primary Key, Auto-increment)
- nombre (STRING, 60 chars)
- tipo (STRING, 60 chars)
- raza (STRING, 60 chars)
- edad (INT)
- peso (FLOAT)
- altura (FLOAT)

### Consultations (consultas)
- id (INT, Primary Key, Auto-increment)
- fecha (DATE)
- hora (TIME)
- descripcion (TEXT)
- id_usuario (INT, Foreign Key)
- tipo_animal (INT, Foreign Key)
- id_tipoconsulta (INT, Foreign Key)

### Consultation Types (tipo_consultas)
- id (INT, Primary Key, Auto-increment)
- nombre (STRING, 60 chars)
- descripcion (TEXT)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `GET /api/auth/check` - Check authentication status
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Animals
- `GET /api/animals` - Get all animals
- `GET /api/animals/:id` - Get animal by ID
- `POST /api/animals` - Create new animal
- `PUT /api/animals/:id` - Update animal
- `DELETE /api/animals/:id` - Delete animal

### Consultations
- `GET /api/consultations` - Get all consultations
- `GET /api/consultations/:id` - Get consultation by ID
- `POST /api/consultations` - Create new consultation
- `PUT /api/consultations/:id` - Update consultation
- `DELETE /api/consultations/:id` - Delete consultation

## Security Features
- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Cookie-based session management
- Input validation
- SQL injection prevention through Sequelize

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```
JWT_SECRET=your_jwt_secret
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=veterinaria
```

3. Start the server:
```bash
node index.js
```

## Environment Requirements
- Node.js
- MySQL database
- npm or yarn package manager

## API Response Format
All API responses follow this structure:
```json
{
    "message": "Response message",
    "success": boolean,
    "data": {} // Optional data object
}
```

## Error Handling
The API uses standard HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

## CORS Configuration
The API is configured to accept requests from:
- https://cami98735264.github.io
- http://localhost:3001
- http://192.168.1.7:4000
