const API = 'http://localhost:3000';
let currentUser = null;

// ======================
// Helpers
// ======================

function navigateTo(hash) {
  window.location.hash = hash;
}

function getAuthHeader() {
  const token = sessionStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// ======================
// Routing
// ======================

document.getElementById('getStartedBtn').addEventListener('click', () => {
  navigateTo('#/login');
});

function handleRouting() {
  let hash = window.location.hash || '#/';
  let pageName = hash.replace('#/', '') || 'home';

  const protectedRoutes = ['profile', 'requests'];
  const adminRoutes = ['employees', 'department', 'accounts'];

  if (protectedRoutes.includes(pageName) && !currentUser) {
    navigateTo('#/login');
    return;
  }

  if (adminRoutes.includes(pageName) && (!currentUser || currentUser.role !== 'admin')) {
    navigateTo('#/');
    return;
  }

  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));

  const activePage = document.getElementById(pageName + 'Page');
  if (activePage) activePage.classList.add('active');

  if (pageName === 'verify') {
    const email = sessionStorage.getItem('unverified_email');
    if (!email) { navigateTo('#/'); return; }
    document.getElementById('verify-message').textContent = 'Verification sent to ' + email + '.';
  }

  if (pageName === 'login') {
    const justVerified = sessionStorage.getItem('just_verified');
    if (justVerified === 'true') {
      document.getElementById('verified-alert').classList.remove('d-none');
      sessionStorage.removeItem('just_verified');
    }
  }

  if (pageName === 'profile') renderProfile();
  if (pageName === 'accounts') renderAccountsList();
  if (pageName === 'department') renderDepartmentsList();
  if (pageName === 'employees') renderEmployeesTable();
  if (pageName === 'requests') renderRequestsTable();
}

window.addEventListener('hashchange', handleRouting);

window.addEventListener('load', async () => {
  const token = sessionStorage.getItem('authToken');

  if (token) {
    const { ok, data } = await apiFetch('/api/profile');
    if (ok) {
      setAuthState(true, data);
    } else {
      sessionStorage.removeItem('authToken');
      setAuthState(false);
    }
  } else {
    setAuthState(false);
  }

  handleRouting();
});

// ======================
// Authentication System
// ======================

// Registration
document.getElementById('register-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const firstName = document.getElementById('reg-firstName').value.trim();
  const lastName = document.getElementById('reg-lastName').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value.trim();

  if (password.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }

  const { ok, data } = await apiFetch('/api/register', {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName, email, password }),
  });

  if (!ok) {
    showToast(data.error || 'Registration failed', 'error');
    return;
  }

  // Store the verification token and email so the verify page can use them
  sessionStorage.setItem('unverified_email', email);
  sessionStorage.setItem('verification_token', data.verificationToken);

  navigateTo('#/verify');
});

// Email Verification (Simulated)
document.getElementById('simulateBtn').addEventListener('click', async () => {
  const token = sessionStorage.getItem('verification_token');

  if (!token) {
    showToast('No verification token found!', 'error');
    return;
  }

  const { ok, data } = await apiFetch('/api/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });

  if (!ok) {
    showToast(data.error || 'Verification failed', 'error');
    return;
  }

  sessionStorage.setItem('just_verified', 'true');
  sessionStorage.removeItem('unverified_email');
  sessionStorage.removeItem('verification_token');

  navigateTo('#/login');
});

// Login
document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  const { ok, data } = await apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (!ok) {
    showToast(data.error || 'Login failed', 'error');
    return;
  }

  sessionStorage.setItem('authToken', data.token);
  setAuthState(true, data.user);
  navigateTo('#/profile');
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem('authToken');
  setAuthState(false);
  navigateTo('#/');
});

// Auth State Management
function setAuthState(isAuth, user) {
  if (isAuth) {
    currentUser = user;
    document.body.classList.remove('not-authenticated');
    document.body.classList.add('authenticated');

    if (user && user.role === 'admin') {
      document.body.classList.add('is-admin');
    } else {
      document.body.classList.remove('is-admin');
    }

    const dropdownToggle = document.querySelector('.navbar .dropdown-toggle');
    if (dropdownToggle) {
      dropdownToggle.textContent = user.firstName + ' ' + user.lastName;
    }
  } else {
    currentUser = null;
    document.body.classList.remove('authenticated', 'is-admin');
    document.body.classList.add('not-authenticated');
  }
}

// ======================
// Cancel / Nav Buttons
// ======================

document.getElementById('regCancelBtn').addEventListener('click', () => navigateTo('#/'));
document.getElementById('loginCancelBtn').addEventListener('click', () => navigateTo('#/'));
document.getElementById('goToLoginBtn').addEventListener('click', () => navigateTo('#/login'));

// ============
// Profile Page
// ============

function renderProfile() {
  if (!currentUser) { navigateTo('#/login'); return; }

  document.getElementById('profile-name').textContent = currentUser.firstName + ' ' + currentUser.lastName;
  document.getElementById('profile-email').textContent = currentUser.email;
  document.getElementById('profile-role').textContent = currentUser.role;
}

document.getElementById('edit-profile-button').addEventListener('click', () => {
  document.getElementById('edit-firstName').value = currentUser.firstName;
  document.getElementById('edit-lastName').value = currentUser.lastName;

  const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
  modal.show();
});

document.getElementById('edit-profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const firstName = document.getElementById('edit-firstName').value.trim();
  const lastName = document.getElementById('edit-lastName').value.trim();

  if (!firstName || !lastName) {
    showToast('Please fill in all fields!', 'error');
    return;
  }

  const { ok, data } = await apiFetch('/api/profile', {
    method: 'PUT',
    body: JSON.stringify({ firstName, lastName }),
  });

  if (!ok) {
    showToast(data.error || 'Update failed', 'error');
    return;
  }

  // Sync currentUser with the updated values from the server
  currentUser.firstName = data.user.firstName;
  currentUser.lastName = data.user.lastName;

  renderProfile();

  const dropdownToggle = document.querySelector('.navbar .dropdown-toggle');
  if (dropdownToggle) {
    dropdownToggle.textContent = data.user.firstName + ' ' + data.user.lastName;
  }

  bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
  showToast('Profile updated successfully!', 'success');
});

// =====================
// Accounts (Admin)
// =====================

const accountFormCard = document.getElementById('account-form-card');
const addAccForm = document.getElementById('addAcc-form');
let editingAccountId = null;

document.getElementById('addAccBtn').addEventListener('click', () => {
  editingAccountId = null;
  document.getElementById('account-form-title').textContent = 'Add Account';
  addAccForm.reset();
  accountFormCard.classList.remove('d-none');
});

document.getElementById('accCancelBtn').addEventListener('click', () => {
  accountFormCard.classList.add('d-none');
  addAccForm.reset();
  editingAccountId = null;
});

async function renderAccountsList() {
  const tableBody = document.getElementById('accounts-table-body');
  const { ok, data } = await apiFetch('/api/accounts');

  if (!ok) {
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load accounts</td></tr>';
    return;
  }

  if (data.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No accounts</td></tr>';
    return;
  }

  tableBody.innerHTML = '';
  data.forEach(account => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${account.firstName} ${account.lastName}</td>
      <td>${account.email}</td>
      <td>${account.role}</td>
      <td>${account.verified ? '✓' : '—'}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editAccount(${account.id})">Edit</button>
        <button class="btn btn-sm btn-warning" onclick="resetPassword(${account.id})">Reset PW</button>
        <button class="btn btn-sm btn-danger" onclick="deleteAccount(${account.id})">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

async function editAccount(id) {
  const { ok, data } = await apiFetch('/api/accounts');
  if (!ok) return;

  const account = data.find(a => a.id === id);
  if (!account) return;

  editingAccountId = id;
  document.getElementById('accFirstName').value = account.firstName;
  document.getElementById('accLastName').value = account.lastName;
  document.getElementById('accEmail').value = account.email;
  document.getElementById('accPassword').value = '';
  document.getElementById('accRole').value = account.role;
  document.getElementById('verifiedCheck').checked = account.verified;

  document.getElementById('account-form-title').textContent = 'Edit Account';
  accountFormCard.classList.remove('d-none');
}

addAccForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const accountData = {
    firstName: document.getElementById('accFirstName').value.trim(),
    lastName: document.getElementById('accLastName').value.trim(),
    email: document.getElementById('accEmail').value.trim(),
    password: document.getElementById('accPassword').value.trim(),
    role: document.getElementById('accRole').value,
    verified: document.getElementById('verifiedCheck').checked,
  };

  const isEdit = editingAccountId !== null;
  const { ok, data } = await apiFetch(
    isEdit ? `/api/accounts/${editingAccountId}` : '/api/accounts',
    { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(accountData) }
  );

  if (!ok) {
    showToast(data.error || 'Operation failed', 'error');
    return;
  }

  showToast(isEdit ? 'Account updated successfully!' : 'Account added successfully!', 'success');
  accountFormCard.classList.add('d-none');
  addAccForm.reset();
  editingAccountId = null;
  document.getElementById('account-form-title').textContent = 'Add Account';
  renderAccountsList();
});

async function resetPassword(id) {
  const newPassword = prompt('Enter new password (min 6 characters):');
  if (!newPassword) return;

  if (newPassword.length < 6) {
    showToast('Password must be at least 6 characters!', 'error');
    return;
  }

  const { ok, data } = await apiFetch(`/api/accounts/${id}/reset-password`, {
    method: 'PUT',
    body: JSON.stringify({ newPassword }),
  });

  showToast(ok ? 'Password reset successfully!' : (data.error || 'Reset failed'), ok ? 'success' : 'error');
}

async function deleteAccount(id) {
  const { ok: listOk, data: accounts } = await apiFetch('/api/accounts');
  if (!listOk) return;

  const account = accounts.find(a => a.id === id);
  if (!account) return;

  if (!confirm(`Are you sure you want to delete ${account.firstName} ${account.lastName}?`)) return;

  const { ok, data } = await apiFetch(`/api/accounts/${id}`, { method: 'DELETE' });
  showToast(ok ? 'Account deleted successfully!' : (data.error || 'Delete failed'), ok ? 'success' : 'error');
  if (ok) renderAccountsList();
}

// =====================
// Departments (Admin)
// =====================

let editingDepartmentId = null;

async function renderDepartmentsList() {
  const tableBody = document.getElementById('departments-table-body');
  const { ok, data } = await apiFetch('/api/departments');

  if (!ok) {
    tableBody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Failed to load departments</td></tr>';
    return;
  }

  if (data.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No departments</td></tr>';
    return;
  }

  tableBody.innerHTML = '';
  data.forEach(dept => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${dept.name}</td>
      <td>${dept.description}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editDepartment(${dept.id})">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteDepartment(${dept.id})">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

document.getElementById('add-department-btn').addEventListener('click', () => {
  editingDepartmentId = null;
  document.getElementById('department-form-title').textContent = 'Add Department';
  document.getElementById('add-department-form').reset();
  new bootstrap.Modal(document.getElementById('addDepartmentModal')).show();
});

document.getElementById('add-department-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = document.getElementById('dept-name').value.trim();
  const description = document.getElementById('dept-description').value.trim();

  if (!name || !description) {
    showToast('Please fill in all fields!', 'error');
    return;
  }

  const isEdit = editingDepartmentId !== null;
  const { ok, data } = await apiFetch(
    isEdit ? `/api/departments/${editingDepartmentId}` : '/api/departments',
    { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify({ name, description }) }
  );

  if (!ok) {
    showToast(data.error || 'Operation failed', 'error');
    return;
  }

  showToast(isEdit ? 'Department updated successfully!' : 'Department added successfully!', 'success');
  editingDepartmentId = null;
  bootstrap.Modal.getInstance(document.getElementById('addDepartmentModal')).hide();
  renderDepartmentsList();
});

async function editDepartment(id) {
  const { ok, data } = await apiFetch('/api/departments');
  if (!ok) return;

  const dept = data.find(d => d.id === id);
  if (!dept) return;

  editingDepartmentId = id;
  document.getElementById('dept-name').value = dept.name;
  document.getElementById('dept-description').value = dept.description;
  document.getElementById('department-form-title').textContent = 'Edit Department';
  new bootstrap.Modal(document.getElementById('addDepartmentModal')).show();
}

async function deleteDepartment(id) {
  const { ok: listOk, data: depts } = await apiFetch('/api/departments');
  if (!listOk) return;

  const dept = depts.find(d => d.id === id);
  if (!dept) return;

  if (!confirm(`Are you sure you want to delete ${dept.name}?`)) return;

  const { ok, data } = await apiFetch(`/api/departments/${id}`, { method: 'DELETE' });
  showToast(ok ? 'Department deleted successfully!' : (data.error || 'Delete failed'), ok ? 'success' : 'error');
  if (ok) renderDepartmentsList();
}

// =====================
// Employees (Admin)
// =====================

let editingEmployeeId = null;

async function renderEmployeesTable() {
  const tableBody = document.getElementById('empBodyTable');
  const [empRes, deptRes] = await Promise.all([
    apiFetch('/api/employees'),
    apiFetch('/api/departments'),
  ]);

  if (!empRes.ok) {
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load employees</td></tr>';
    return;
  }

  if (empRes.data.length === 0) {
    tableBody.innerHTML = '<tr id="emptyEmp"><td colspan="5" class="text-center">No employees</td></tr>';
    return;
  }

  tableBody.innerHTML = '';
  empRes.data.forEach(employee => {
    const dept = deptRes.ok ? deptRes.data.find(d => d.id === employee.departmentId) : null;
    const deptName = dept ? dept.name : 'N/A';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${employee.employeeId}</td>
      <td>${employee.userEmail}</td>
      <td>${employee.position}</td>
      <td>${deptName}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editEmployee('${employee.employeeId}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${employee.employeeId}')">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

async function populateDepartmentDropdown() {
  const deptSelect = document.getElementById('empDepartment');
  deptSelect.innerHTML = '';

  const { ok, data } = await apiFetch('/api/departments');
  if (!ok) return;

  data.forEach(dept => {
    const option = document.createElement('option');
    option.value = dept.id;
    option.textContent = dept.name;
    deptSelect.appendChild(option);
  });
}

document.getElementById('addEmpBtn').addEventListener('click', async () => {
  editingEmployeeId = null;
  document.getElementById('empFormCard').classList.remove('d-none');
  document.getElementById('empFormTitle').textContent = 'Add Employee';
  document.getElementById('addEmp-form').reset();
  await populateDepartmentDropdown();
});

document.getElementById('empCancelBtn').addEventListener('click', () => {
  document.getElementById('empFormCard').classList.add('d-none');
  document.getElementById('addEmp-form').reset();
  editingEmployeeId = null;
});

document.getElementById('addEmp-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const employeeData = {
    employeeId: document.getElementById('empId').value.trim(),
    userEmail: document.getElementById('empEmail').value.trim(),
    position: document.getElementById('empPosition').value.trim(),
    departmentId: parseInt(document.getElementById('empDepartment').value),
    hireDate: document.getElementById('empHireDate').value,
  };

  const isEdit = editingEmployeeId !== null;
  const { ok, data } = await apiFetch(
    isEdit ? `/api/employees/${editingEmployeeId}` : '/api/employees',
    { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(employeeData) }
  );

  if (!ok) {
    showToast(data.error || 'Operation failed', 'error');
    return;
  }

  showToast('Employee saved successfully!', 'success');
  document.getElementById('empFormCard').classList.add('d-none');
  document.getElementById('addEmp-form').reset();
  editingEmployeeId = null;
  renderEmployeesTable();
});

async function editEmployee(employeeId) {
  const { ok, data } = await apiFetch('/api/employees');
  if (!ok) return;

  const employee = data.find(e => e.employeeId === employeeId);
  if (!employee) return;

  editingEmployeeId = employeeId;
  await populateDepartmentDropdown();

  document.getElementById('empId').value = employee.employeeId;
  document.getElementById('empEmail').value = employee.userEmail;
  document.getElementById('empPosition').value = employee.position;
  document.getElementById('empDepartment').value = employee.departmentId;
  document.getElementById('empHireDate').value = employee.hireDate;

  document.getElementById('empFormTitle').textContent = 'Edit Employee';
  document.getElementById('empFormCard').classList.remove('d-none');
}

async function deleteEmployee(employeeId) {
  if (!confirm(`Are you sure you want to delete employee ${employeeId}?`)) return;

  const { ok, data } = await apiFetch(`/api/employees/${employeeId}`, { method: 'DELETE' });
  showToast(ok ? 'Employee deleted successfully!' : (data.error || 'Delete failed'), ok ? 'success' : 'error');
  if (ok) renderEmployeesTable();
}

// =============
// User Requests
// =============

async function renderRequestsTable() {
  const tableBody = document.getElementById('requestsTableBody');
  const { ok, data } = await apiFetch('/api/requests');

  if (!ok) {
    tableBody.innerHTML = '<tr><td colspan="2" class="text-center text-danger">Failed to load requests</td></tr>';
    return;
  }

  if (data.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="2" class="text-center">You have no requests yet.</td></tr>';
    return;
  }

  tableBody.innerHTML = '';
  data.forEach(request => {
    const itemsList = request.items.map(item => `${item.name} (${item.qty})`).join(', ');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${request.type}</td>
      <td>${itemsList}</td>
    `;
    tableBody.appendChild(row);
  });
}

// Add/Remove Items in request form
document.getElementById('itemsContainer').addEventListener('click', (e) => {
  if (e.target.closest('.add-item-btn')) {
    const container = document.getElementById('itemsContainer');
    const newRow = document.createElement('div');
    newRow.className = 'input-group mb-2 item-row';
    newRow.innerHTML = `
      <input type="text" class="form-control item-name" placeholder="Item Name" required />
      <input type="number" class="form-control item-qty" style="max-width: 100px" placeholder="Qty" value="1" min="1" required />
      <button type="button" class="btn btn-outline-danger remove-item-btn">
        <i class="bi bi-x"></i>
      </button>
    `;
    container.appendChild(newRow);
  }

  if (e.target.closest('.remove-item-btn')) {
    e.target.closest('.item-row').remove();
  }
});

document.getElementById('reqModal-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const type = document.getElementById('requestType').value.trim();
  if (!type) {
    showToast('Please enter a request type!', 'warning');
    return;
  }

  const items = [];
  document.querySelectorAll('.item-row').forEach(row => {
    const name = row.querySelector('.item-name').value.trim();
    const qty = parseInt(row.querySelector('.item-qty').value);
    if (name && qty > 0) items.push({ name, qty });
  });

  if (items.length === 0) {
    showToast('Please add at least one item!', 'warning');
    return;
  }

  const { ok, data } = await apiFetch('/api/requests', {
    method: 'POST',
    body: JSON.stringify({ type, items }),
  });

  if (!ok) {
    showToast(data.error || 'Submission failed', 'error');
    return;
  }

  renderRequestsTable();
  document.getElementById('reqModal-form').reset();

  document.getElementById('itemsContainer').innerHTML = `
    <div class="input-group mb-2 item-row">
      <input type="text" class="form-control item-name" placeholder="Item Name" required />
      <input type="number" class="form-control item-qty" style="max-width: 100px" placeholder="Qty" value="1" min="1" required />
      <button type="button" class="btn btn-outline-secondary add-item-btn">
        <i class="bi bi-plus"></i>
      </button>
    </div>
  `;

  bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
  showToast('Request submitted successfully!', 'success');
});

// ======================
// Toast Notifications
// ======================

function showToast(message, type = 'info') {
  const toastEl = document.getElementById('liveToast');
  const toastMessage = document.getElementById('toast-message');

  const bgMap = { success: 'bg-success', error: 'bg-danger', danger: 'bg-danger', warning: 'bg-warning', info: 'bg-info' };
  const bgClass = bgMap[type] || 'bg-primary';

  toastMessage.textContent = message;
  toastEl.className = 'toast align-items-center text-white border-0 ' + bgClass;

  new bootstrap.Toast(toastEl, { autohide: true, delay: 3000 }).show();
}