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

// Middle to parse JSON
app.use(express.json());

// In-memory database
let db = {
  accounts: [
    {
      id: 1,
      firstName: 'Admin', lastName: 'User',
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