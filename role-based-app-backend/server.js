const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3000;
const SECRET_KEY = "my-secret-is-my-secret-only";

// Enable cors for frontend
app.use(cors({
    origin: ['http://127.0.0.1:5500/', 'http://localhost:5500']
}));

// Middlware to parse JSON
app.use(express.json());

// In-memory database
let db = {
  accounts: [
    {
      id: 1,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: bcrypt.hashSync('Password123!', 10),
      role: 'admin',
      verified: true,
    },
  ],
  departments: [
    { id: 1, name: 'Engineering', description: 'Software development' },
    { id: 2, name: 'HR', description: 'Human Resources' },
  ],
  employees: [],
  requests: [],
};

// ===========
// Middleware
// ===========

// Token authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
 
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
 
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}
 
// Role authorization
function authorizeRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }
    next();
  };
}