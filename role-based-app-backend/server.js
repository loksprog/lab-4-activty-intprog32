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

// Auth Routes

// POST /api/register
app.post('/api/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
 
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
 
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
 
  const existing = db.accounts.find(a => a.email === email);
  if (existing) {
    return res.status(409).json({ error: 'Email already exists' });
  }
 
  const hashedPassword = await bcrypt.hash(password, 10);
  const newAccount = {
    id: db.accounts.length > 0 ? Math.max(...db.accounts.map(a => a.id)) + 1 : 1,
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role: 'employee',
    verified: false,
  };
 
  db.accounts.push(newAccount);
 
  // In a real app, send a verification email here.
  // For demo: return a verificationToken the frontend can use to simulate it.
  const verificationToken = jwt.sign({ email }, SECRET_KEY, { expiresIn: '1d' });
 
  res.status(201).json({
    message: 'Account registered. Please verify your email.',
    verificationToken, // frontend uses this to call /api/verify-email
  });
});
 
// POST /api/verify-email
app.post('/api/verify-email', (req, res) => {
  const { token } = req.body;
 
  if (!token) {
    return res.status(400).json({ error: 'Verification token required' });
  }
 
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const account = db.accounts.find(a => a.email === decoded.email);
 
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
 
    if (account.verified) {
      return res.status(400).json({ error: 'Account already verified' });
    }
 
    account.verified = true;
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired verification token' });
  }
});
 
// POST /api/login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
 
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
 
  const account = db.accounts.find(a => a.email === email);
 
  if (!account || !await bcrypt.compare(password, account.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
 
  if (!account.verified) {
    return res.status(403).json({ error: 'Account not verified. Please verify your email first.' });
  }
 
  const token = jwt.sign(
    { id: account.id, email: account.email, role: account.role },
    SECRET_KEY,
    { expiresIn: '1h' }
  );
 
  res.json({
    token,
    user: {
      id: account.id,
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      role: account.role,
    },
  });
});
 
// GET /api/profile  (protected)
app.get('/api/profile', authenticateToken, (req, res) => {
  const account = db.accounts.find(a => a.id === req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
 
  res.json({
    id: account.id,
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
    role: account.role,
  });
});
 
// PUT /api/profile  (protected) — edit own profile
app.put('/api/profile', authenticateToken, (req, res) => {
  const { firstName, lastName } = req.body;
 
  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'First name and last name are required' });
  }
 
  const account = db.accounts.find(a => a.id === req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
 
  account.firstName = firstName;
  account.lastName = lastName;
 
  res.json({
    message: 'Profile updated',
    user: { id: account.id, firstName: account.firstName, lastName: account.lastName, email: account.email, role: account.role },
  });
});
 
// ======================
// Accounts Routes (admin only)
// ======================
 
// GET /api/accounts
app.get('/api/accounts', authenticateToken, authorizeRole('admin'), (req, res) => {
  const safeAccounts = db.accounts.map(({ password, ...rest }) => rest);
  res.json(safeAccounts);
});
 
// POST /api/accounts
app.post('/api/accounts', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { firstName, lastName, email, password, role, verified } = req.body;
 
  if (!firstName || !lastName || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
 
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
 
  const existing = db.accounts.find(a => a.email === email);
  if (existing) {
    return res.status(409).json({ error: 'Email already exists' });
  }
 
  const hashedPassword = await bcrypt.hash(password, 10);
  const newAccount = {
    id: db.accounts.length > 0 ? Math.max(...db.accounts.map(a => a.id)) + 1 : 1,
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role,
    verified: verified || false,
  };
 
  db.accounts.push(newAccount);
  const { password: _, ...safeAccount } = newAccount;
  res.status(201).json({ message: 'Account created', account: safeAccount });
});
 
// PUT /api/accounts/:id
app.put('/api/accounts/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const index = db.accounts.findIndex(a => a.id === id);
 
  if (index === -1) return res.status(404).json({ error: 'Account not found' });
 
  const { firstName, lastName, email, password, role, verified } = req.body;
 
  // Check email conflict (excluding this account)
  const emailConflict = db.accounts.find(a => a.email === email && a.id !== id);
  if (emailConflict) return res.status(409).json({ error: 'Email already in use' });
 
  const existing = db.accounts[index];
  const updatedPassword = password && password.length >= 6
    ? await bcrypt.hash(password, 10)
    : existing.password;
 
  db.accounts[index] = {
    ...existing,
    firstName: firstName || existing.firstName,
    lastName: lastName || existing.lastName,
    email: email || existing.email,
    password: updatedPassword,
    role: role || existing.role,
    verified: verified !== undefined ? verified : existing.verified,
  };
 
  const { password: _, ...safeAccount } = db.accounts[index];
  res.json({ message: 'Account updated', account: safeAccount });
});
 
// PUT /api/accounts/:id/reset-password  (admin only)
app.put('/api/accounts/:id/reset-password', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const account = db.accounts.find(a => a.id === id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
 
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
 
  account.password = await bcrypt.hash(newPassword, 10);
  res.json({ message: 'Password reset successfully' });
});
 
// DELETE /api/accounts/:id
app.delete('/api/accounts/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
 
  // Prevent self-deletion
  if (req.user.id === id) {
    return res.status(403).json({ error: 'You cannot delete your own account' });
  }
 
  const index = db.accounts.findIndex(a => a.id === id);
  if (index === -1) return res.status(404).json({ error: 'Account not found' });
 
  db.accounts.splice(index, 1);
  res.json({ message: 'Account deleted' });
});
 
// ======================
// Departments Routes (admin only)
// ======================
 
// GET /api/departments  (accessible to all authenticated users — needed for employee form dropdown)
app.get('/api/departments', authenticateToken, (req, res) => {
  res.json(db.departments);
});
 
// POST /api/departments
app.post('/api/departments', authenticateToken, authorizeRole('admin'), (req, res) => {
  const { name, description } = req.body;
 
  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description are required' });
  }
 
  const nameExists = db.departments.find(d => d.name.toLowerCase() === name.toLowerCase());
  if (nameExists) return res.status(409).json({ error: 'Department name already exists' });
 
  const newDept = {
    id: db.departments.length > 0 ? Math.max(...db.departments.map(d => d.id)) + 1 : 1,
    name,
    description,
  };
 
  db.departments.push(newDept);
  res.status(201).json({ message: 'Department created', department: newDept });
});
 
// PUT /api/departments/:id
app.put('/api/departments/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const dept = db.departments.find(d => d.id === id);
  if (!dept) return res.status(404).json({ error: 'Department not found' });
 
  const { name, description } = req.body;
 
  const nameConflict = db.departments.find(d => d.name.toLowerCase() === name.toLowerCase() && d.id !== id);
  if (nameConflict) return res.status(409).json({ error: 'Department name already exists' });
 
  dept.name = name || dept.name;
  dept.description = description || dept.description;
 
  res.json({ message: 'Department updated', department: dept });
});
 
// DELETE /api/departments/:id
app.delete('/api/departments/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const index = db.departments.findIndex(d => d.id === id);
  if (index === -1) return res.status(404).json({ error: 'Department not found' });
 
  // Block deletion if employees are assigned to this department
  const hasEmployees = db.employees.some(e => e.departmentId === id);
  if (hasEmployees) {
    return res.status(409).json({ error: 'Cannot delete department with existing employees' });
  }
 
  db.departments.splice(index, 1);
  res.json({ message: 'Department deleted' });
});
 
// ======================
// Employees Routes (admin only)
// ======================
 
// GET /api/employees
app.get('/api/employees', authenticateToken, authorizeRole('admin'), (req, res) => {
  res.json(db.employees);
});
 
// POST /api/employees
app.post('/api/employees', authenticateToken, authorizeRole('admin'), (req, res) => {
  const { employeeId, userEmail, position, departmentId, hireDate } = req.body;
 
  if (!employeeId || !userEmail || !position || !departmentId || !hireDate) {
    return res.status(400).json({ error: 'All fields are required' });
  }
 
  const accountExists = db.accounts.find(a => a.email === userEmail);
  if (!accountExists) {
    return res.status(404).json({ error: 'User email must match an existing account' });
  }
 
  const idExists = db.employees.find(e => e.employeeId === employeeId);
  if (idExists) return res.status(409).json({ error: 'Employee ID already exists' });
 
  const deptExists = db.departments.find(d => d.id === parseInt(departmentId));
  if (!deptExists) return res.status(404).json({ error: 'Department not found' });
 
  const newEmployee = {
    employeeId,
    userEmail,
    position,
    departmentId: parseInt(departmentId),
    hireDate,
  };
 
  db.employees.push(newEmployee);
  res.status(201).json({ message: 'Employee added', employee: newEmployee });
});
 
// PUT /api/employees/:employeeId
app.put('/api/employees/:employeeId', authenticateToken, authorizeRole('admin'), (req, res) => {
  const { employeeId } = req.params;
  const index = db.employees.findIndex(e => e.employeeId === employeeId);
  if (index === -1) return res.status(404).json({ error: 'Employee not found' });
 
  const { userEmail, position, departmentId, hireDate } = req.body;
 
  const accountExists = db.accounts.find(a => a.email === userEmail);
  if (!accountExists) {
    return res.status(404).json({ error: 'User email must match an existing account' });
  }
 
  const deptExists = db.departments.find(d => d.id === parseInt(departmentId));
  if (!deptExists) return res.status(404).json({ error: 'Department not found' });
 
  db.employees[index] = { employeeId, userEmail, position, departmentId: parseInt(departmentId), hireDate };
  res.json({ message: 'Employee updated', employee: db.employees[index] });
});
 
// DELETE /api/employees/:employeeId
app.delete('/api/employees/:employeeId', authenticateToken, authorizeRole('admin'), (req, res) => {
  const { employeeId } = req.params;
  const index = db.employees.findIndex(e => e.employeeId === employeeId);
  if (index === -1) return res.status(404).json({ error: 'Employee not found' });
 
  db.employees.splice(index, 1);
  res.json({ message: 'Employee deleted' });
});
 
// ======================
// Requests Routes
// ======================
 
// GET /api/requests  — returns only the current user's requests
app.get('/api/requests', authenticateToken, (req, res) => {
  const userRequests = db.requests.filter(r => r.employeeEmail === req.user.email);
  res.json(userRequests);
});
 
// POST /api/requests
app.post('/api/requests', authenticateToken, (req, res) => {
  const { type, items } = req.body;
 
  if (!type || !items || items.length === 0) {
    return res.status(400).json({ error: 'Type and at least one item are required' });
  }
 
  const newRequest = {
    id: db.requests.length > 0 ? Math.max(...db.requests.map(r => r.id)) + 1 : 1,
    type,
    items,
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    employeeEmail: req.user.email,
  };
 
  db.requests.push(newRequest);
  res.status(201).json({ message: 'Request submitted', request: newRequest });
});
 
// ======================
// Start Server
// ======================
 
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`🔑 Default login: admin@example.com / Password123!`);
});