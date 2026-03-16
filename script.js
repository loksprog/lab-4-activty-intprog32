let currentUser = null;

window.db = {
  accounts: [],
};

function navigateTo(hash) {
  window.location.hash = hash;
}

// Get started button
document.getElementById("getStartedBtn").addEventListener("click", () => {
  navigateTo("#/login");
});

// Handles Routing
function handleRouting() {
  // Reads the current hush
  let hash = window.location.hash;

  // Set hash to "#/" if empty
  if (!hash) {
    hash = "#/";
  }

  // Extract page name
  let pageName = hash.replace("#/", "");

  // Set home as the default page
  if (pageName === "") {
    pageName = "home";
  }

  // Protected routes
  const protectedRoutes = ["profile", "requests"];
  const adminRoutes = ["employees", "department", "accounts"];

  // Redirects unauthenticated users away from protected routes
  if (protectedRoutes.includes(pageName) && !currentUser) {
    navigateTo("#/login");
    return;
  }

  // Blocks non-admins
  if (
    adminRoutes.includes(pageName) &&
    (!currentUser || currentUser.role !== "admin")
  ) {
    navigateTo("#/");
    return;
  }

  // Hides all `.page` elements
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });

  // Shows the matching page
  const activePage = document.getElementById(pageName + "Page");
  if (activePage) {
    activePage.classList.add("active");
  }

  // Verify Page
  if (pageName === "verify") {
    const email = localStorage.getItem("unverified_email");

    if (!email) {
      navigateTo("#/");
      return;
    }

    const showMessage = document.getElementById("verify-message");
    showMessage.textContent = "Verification sent to " + email + ".";
  }

  // Login Page
  if (pageName === "login") {
    const justVerified = localStorage.getItem("just_verified");

    if (justVerified === "true") {
      const alertBox = document.getElementById("verified-alert");
      alertBox.classList.remove("d-none");

      localStorage.removeItem("just_verified");
    }
  }

  // Profile Page
  if (pageName === "profile") {
    renderProfile();
  }

  // Accounts Page
  if (pageName === "accounts") {
    renderAccountsList();
  }

  // Departments Page
  if (pageName === "department") {
    renderDepartmentsList();
  }

  // Employees Page
  if (pageName === "employees") {
    renderEmployeesTable();
  }

  // Requests Page
  if (pageName === "requests") {
    renderRequestsTable();
  }
}

// Call handleRouting
window.addEventListener("hashchange", handleRouting);
window.addEventListener("load", () => {
  const authToken = localStorage.getItem("auth_token");

  if (authToken) {
    // Find user with this email
    const user = window.db.accounts.find((acc) => {
      return acc.email === authToken;
    });

    if (user && user.verified) {
      setAuthState(true, user);
    } else {
      localStorage.removeItem("auth_token");
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
const registerForm = document.getElementById("register-form");

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  // Retrieve Inputs
  const reg_firstName = document.getElementById("reg-firstName").value.trim();
  const reg_lastName = document.getElementById("reg-lastName").value.trim();
  const reg_email = document.getElementById("reg-email").value.trim();
  const reg_password = document.getElementById("reg-password").value.trim();

  // Password validation
  if (reg_password.length < 6) {
    showToast("Password must be at least 6 characters", "error");
    return;
  }

  // Check if the Email already exists
  const isEmailExists = window.db.accounts.find((account) => {
    return account.email === reg_email;
  });

  if (isEmailExists) {
    showToast("Email already exists!", "error");
    return;
  }

  const newAccount = {
    firstName: reg_firstName,
    lastName: reg_lastName,
    email: reg_email,
    password: reg_password,
    role: "employee",
    verified: false,
  };

  window.db.accounts.push(newAccount);
  saveToStorage();

  // Store email in `localStorage.unverified_email` (after registration)
  localStorage.setItem("unverified_email", reg_email);

  // Navigate to `#/verify-email`
  navigateTo("#/verify");
});

// Email Verification (Simulated)
const simulateBtn = document.getElementById("simulateBtn");

simulateBtn.addEventListener("click", () => {
  // Get stored Email
  const storedEmail = localStorage.getItem("unverified_email");

  if (!storedEmail) {
    showToast("No email to verify!", "error");
  }

  const account = window.db.accounts.find((acc) => {
    return acc.email === storedEmail;
  });

  if (!account) {
    showToast("Account not found!", "error");
    return;
  }

  // Mark Email as verified
  account.verified = true;
  saveToStorage();

  // Flag
  localStorage.setItem("just_verified", "true");

  // remove email from LS
  localStorage.removeItem("unverified_email");

  // Redirect to login
  navigateTo("#/login");
});

// Login
const loginForm = document.getElementById("login-form");
loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const loginEmail = document.getElementById("login-email").value.trim();
  const loginPassword = document.getElementById("login-password").value.trim();

  const account = window.db.accounts.find((acc) => {
    return (
      acc.email === loginEmail &&
      acc.password === loginPassword &&
      acc.verified === true
    );
  });

  // Check if account exists
  if (!account) {
    showToast("Invalid credentials or account not verified.", "error");
    return;
  }

  // Save auth token to localStorage
  localStorage.setItem("auth_token", loginEmail);

  // Set authentication state
  setAuthState(true, account);

  // Redirect to profile page
  navigateTo("#/profile");
});

// Auth State Management
function setAuthState(isAuth, user) {
  if (isAuth) {
    currentUser = user;

    // Update body classes
    document.body.classList.remove("not-authenticated");
    document.body.classList.add("authenticated");

    // Check if admin
    if (user && user.role === "admin") {
      document.body.classList.add("is-admin");
    } else {
      document.body.classList.remove("is-admin");
    }

    const dropdownToggle = document.querySelector(".navbar .dropdown-toggle");
    if (dropdownToggle) {
      dropdownToggle.textContent = user.firstName + " " + user.lastName;
    }
  } else {
    // user logged out
    currentUser = null;
    document.body.classList.remove("authenticated", "is-admin");
    document.body.classList.add("not-authenticated");
  }
}

// Logout
document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("auth_token");
  setAuthState(false);
  navigateTo("#/");
});

// ===================================
// Data Persistence with localStorage
// ===================================

const STORAGE_KEY = "ipt_demo_v1";

function loadFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    try {
      window.db = JSON.parse(stored);
    } catch (error) {
      console.error("Corrupt data, seeding defaults");
      seedDefaultData();
    }
  } else {
    seedDefaultData();
  }
}

function seedDefaultData() {
  window.db = {
    accounts: [
      {
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        password: "Password123!",
        role: "admin",
        verified: true,
      },
    ],
    departments: [
      { id: 1, name: "Engineering", description: "Software development" },
      { id: 2, name: "HR", description: "Human Resources" },
    ],
    employees: [],
    requests: [],
  };

  saveToStorage();
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

loadFromStorage();

// ============
// Profile Page
// ============

function renderProfile() {
  // Make sure user is logged in
  if (!currentUser) {
    navigateTo("#/login");
    return;
  }

  // Get profile display elements
  const profileName = document.getElementById("profile-name");
  const profileEmail = document.getElementById("profile-email");
  const profileRole = document.getElementById("profile-role");

  // Display user information
  profileName.textContent = currentUser.firstName + " " + currentUser.lastName;
  profileEmail.textContent = currentUser.email;
  profileRole.textContent = currentUser.role;
}

// Edit Profile button
const editProfileBtn = document.getElementById("edit-profile-button");

editProfileBtn.addEventListener("click", () => {
  // Pre-fill form with current user data
  document.getElementById("edit-firstName").value = currentUser.firstName;
  document.getElementById("edit-lastName").value = currentUser.lastName;

  // Show modal
  const modal = new bootstrap.Modal(
    document.getElementById("editProfileModal"),
  );
  modal.show();
});

// Edit Profile Form Submit
document
  .getElementById("edit-profile-form")
  .addEventListener("submit", (event) => {
    event.preventDefault();

    // Get new values
    const newFirstName = document.getElementById("edit-firstName").value.trim();
    const newLastName = document.getElementById("edit-lastName").value.trim();

    if (!newFirstName || !newLastName) {
      showToast("Please fill in all fields!", "error");
      return;
    }

    // Update currentUser
    currentUser.firstName = newFirstName;
    currentUser.lastName = newLastName;

    // Find and update in database
    const accountIndex = window.db.accounts.findIndex(
      (acc) => acc.email === currentUser.email,
    );
    if (accountIndex !== -1) {
      window.db.accounts[accountIndex].firstName = newFirstName;
      window.db.accounts[accountIndex].lastName = newLastName;
      saveToStorage();
    }

    renderProfile();

    // Update dropdown username
    const dropdownToggle = document.querySelector(".navbar .dropdown-toggle");
    if (dropdownToggle) {
      dropdownToggle.textContent = newFirstName + " " + newLastName;
    }

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("editProfileModal"),
    );
    modal.hide();

    showToast("Profile updated successfully!", "success");
  });

// =====================
// Admin Features (CRUD)
// =====================

// Accounts
const addAccBtn = document.getElementById("addAccBtn");
const accountFormCard = document.getElementById("account-form-card");
const accCancelBtn = document.getElementById("accCancelBtn");
const addAccForm = document.getElementById("addAcc-form");

let editingAccountIndex = null;

// Add Account button - show form
addAccBtn.addEventListener("click", () => {
  editingAccountIndex = null;
  document.getElementById("account-form-title").textContent = "Add Account";
  addAccForm.reset();
  accountFormCard.classList.remove("d-none");
});

// Cancel button - hide form
accCancelBtn.addEventListener("click", () => {
  accountFormCard.classList.add("d-none");
  addAccForm.reset();
  editingAccountIndex = null;
});

// Render accounts table
function renderAccountsList() {
  const tableBody = document.getElementById("accounts-table-body");
  tableBody.innerHTML = "";

  if (window.db.accounts.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="5" class="text-center">No accounts</td></tr>';
    return;
  }

  window.db.accounts.forEach((account, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${account.firstName} ${account.lastName}</td>
      <td>${account.email}</td>
      <td>${account.role}</td>
      <td>${account.verified ? "✓" : "—"}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editAccount(${index})">Edit</button>
        <button class="btn btn-sm btn-warning" onclick="resetPassword(${index})">Reset PW</button>
        <button class="btn btn-sm btn-danger" onclick="deleteAccount(${index})">Delete</button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

// Edit account function
function editAccount(index) {
  editingAccountIndex = index;
  const account = window.db.accounts[index];

  // Pre-fill form
  document.getElementById("accFirstName").value = account.firstName;
  document.getElementById("accLastName").value = account.lastName;
  document.getElementById("accEmail").value = account.email;
  document.getElementById("accPassword").value = account.password;
  document.getElementById("accRole").value = account.role;
  document.getElementById("verifiedCheck").checked = account.verified;

  // Change title and show form
  document.getElementById("account-form-title").textContent = "Edit Account";
  accountFormCard.classList.remove("d-none");
}

// Form submit - handles both add and edit
addAccForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const accountData = {
    firstName: document.getElementById("accFirstName").value.trim(),
    lastName: document.getElementById("accLastName").value.trim(),
    email: document.getElementById("accEmail").value.trim(),
    password: document.getElementById("accPassword").value.trim(),
    role: document.getElementById("accRole").value,
    verified: document.getElementById("verifiedCheck").checked,
  };

  if (editingAccountIndex !== null) {
    // Editing existing account
    window.db.accounts[editingAccountIndex] = accountData;
    showToast("Account updated successfully!", "success");
  } else {
    // Adding new account
    const emailExists = window.db.accounts.find(
      (acc) => acc.email === accountData.email,
    );
    if (emailExists) {
      showToast("Email already exists!", "error");
      return;
    }
    window.db.accounts.push(accountData);
    showToast("Account added successfully!", "success");
  }

  saveToStorage();
  renderAccountsList();

  // Hide form and reset
  accountFormCard.classList.add("d-none");
  addAccForm.reset();
  editingAccountIndex = null;
  document.getElementById("account-form-title").textContent = "Add Account";
});

// Reset password function
function resetPassword(index) {
  const account = window.db.accounts[index];
  const newPassword = prompt("Enter new password (min 6 characters):");

  if (!newPassword) {
    return; // User cancelled
  }

  if (newPassword.length < 6) {
    showToast("Password must be at least 6 characters!", "error");
    return;
  }

  account.password = newPassword;
  saveToStorage();

  showToast("Password reset successfully!", "success");
}

// Delete account function
function deleteAccount(index) {
  const account = window.db.accounts[index];

  // Prevent self-deletion
  if (currentUser && account.email === currentUser.email) {
    showToast("You cannot delete your own account", "error");
    return;
  }

  if (
    confirm(
      `Are you sure you want to delete ${account.firstName} ${account.lastName}?`,
    )
  ) {
    window.db.accounts.splice(index, 1);
    saveToStorage();
    renderAccountsList();
    showToast("Account deleted successfully!", "success");
  }
}

// Departments
let editingDepartmentIndex = null;

function renderDepartmentsList() {
  const tableBody = document.getElementById("departments-table-body");

  if (window.db.departments.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="3" class="text-center">No departments</td></tr>';
    return;
  }

  tableBody.innerHTML = "";

  window.db.departments.forEach((dept, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${dept.name}</td>
      <td>${dept.description}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editDepartment(${index})">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteDepartment(${index})">Delete</button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

// Show Add Department Modal
document.getElementById("add-department-btn").addEventListener("click", () => {
  editingDepartmentIndex = null;
  document.getElementById("department-form-title").textContent =
    "Add Department";
  document.getElementById("add-department-form").reset();

  const modal = new bootstrap.Modal(
    document.getElementById("addDepartmentModal"),
  );
  modal.show();
});

// Add/Edit Department Form Submit
document
  .getElementById("add-department-form")
  .addEventListener("submit", (event) => {
    event.preventDefault();

    const deptName = document.getElementById("dept-name").value.trim();
    const deptDescription = document
      .getElementById("dept-description")
      .value.trim();

    if (!deptName || !deptDescription) {
      showToast("Please fill in all fields!", "error");
      return;
    }

    if (editingDepartmentIndex !== null) {
      // Editing existing department
      window.db.departments[editingDepartmentIndex].name = deptName;
      window.db.departments[editingDepartmentIndex].description =
        deptDescription;
      editingDepartmentIndex = null;
      showToast("Department updated successfully!", "success");
    } else {
      const nameExists = window.db.departments.find(
        (dept) => dept.name.toLowerCase() === deptName.toLowerCase(),
      );
      if (nameExists) {
        showToast("Department name already exists!", "error");
        return;
      }

      const newId =
        window.db.departments.length > 0
          ? Math.max(...window.db.departments.map((d) => d.id)) + 1
          : 1;

      const newDepartment = {
        id: newId,
        name: deptName,
        description: deptDescription,
      };

      window.db.departments.push(newDepartment);
      showToast("Department added successfully!", "success");
    }

    saveToStorage();
    renderDepartmentsList();

    // Close modal
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("addDepartmentModal"),
    );
    modal.hide();
  });

// Edit Department
function editDepartment(index) {
  editingDepartmentIndex = index;
  const dept = window.db.departments[index];

  // Pre-fill form
  document.getElementById("dept-name").value = dept.name;
  document.getElementById("dept-description").value = dept.description;

  document.getElementById("department-form-title").textContent =
    "Edit Department";

  const modal = new bootstrap.Modal(
    document.getElementById("addDepartmentModal"),
  );
  modal.show();
}

// Delete Department
function deleteDepartment(index) {
  const dept = window.db.departments[index];

  const hasEmployees = window.db.employees.some(
    (emp) => emp.departmentId === dept.id,
  );
  if (hasEmployees) {
    showToast("Cannot delete department with existing employees!", "error");
    return;
  }

  if (confirm(`Are you sure you want to delete ${dept.name}?`)) {
    window.db.departments.splice(index, 1);
    saveToStorage();
    renderDepartmentsList();
    showToast("Department deleted successfully!", "success");
  }
}

// Employees
let editingEmployeeIndex = null;

// Render Employees Table
function renderEmployeesTable() {
  const tableBody = document.getElementById("empBodyTable");
  const emptyRow = document.getElementById("emptyEmp");

  tableBody.innerHTML = "";

  if (window.db.employees.length === 0) {
    tableBody.innerHTML =
      '<tr id="emptyEmp"><td colspan="5" class="text-center">No employees</td></tr>';
    return;
  }

  window.db.employees.forEach((employee, index) => {
    // Find department name
    const dept = window.db.departments.find(
      (d) => d.id === employee.departmentId,
    );
    const deptName = dept ? dept.name : "N/A";

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${employee.employeeId}</td>
      <td>${employee.userEmail}</td>
      <td>${employee.position}</td>
      <td>${deptName}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editEmployee(${index})">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${index})">Delete</button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

// Populate Department Dropdown
function populateDepartmentDropdown() {
  const deptSelect = document.getElementById("empDepartment");
  deptSelect.innerHTML = "";

  window.db.departments.forEach((dept) => {
    const option = document.createElement("option");
    option.value = dept.id;
    option.textContent = dept.name;
    deptSelect.appendChild(option);
  });
}

// Show Add Employee Form
document.getElementById("addEmpBtn").addEventListener("click", () => {
  editingEmployeeIndex = null;
  document.getElementById("empFormCard").classList.remove("d-none");
  document.getElementById("empFormTitle").textContent = "Add Employee";
  document.getElementById("addEmp-form").reset();
  populateDepartmentDropdown();
});

// Cancel Button
document.getElementById("empCancelBtn").addEventListener("click", () => {
  document.getElementById("empFormCard").classList.add("d-none");
  document.getElementById("addEmp-form").reset();
  editingEmployeeIndex = null;
});

// Add/Edit Employee Form Submit
document.getElementById("addEmp-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const employeeData = {
    employeeId: document.getElementById("empId").value.trim(),
    userEmail: document.getElementById("empEmail").value.trim(),
    position: document.getElementById("empPosition").value.trim(),
    departmentId: parseInt(document.getElementById("empDepartment").value),
    hireDate: document.getElementById("empHireDate").value,
  };

  const accountExists = window.db.accounts.find(
    (acc) => acc.email === employeeData.userEmail,
  );
  if (!accountExists) {
    showToast("User email must match an existing account!", "error");
    return;
  }

  if (editingEmployeeIndex !== null) {
    window.db.employees[editingEmployeeIndex] = employeeData;
    editingEmployeeIndex = null;
  } else {
    const idExists = window.db.employees.find(
      (emp) => emp.employeeId === employeeData.employeeId,
    );
    if (idExists) {
      showToast("Employee ID already exists!", "error");
      return;
    }

    window.db.employees.push(employeeData);
  }

  saveToStorage();
  renderEmployeesTable();

  // Hide form and reset
  document.getElementById("empFormCard").classList.add("d-none");
  document.getElementById("addEmp-form").reset();

  showToast("Employee saved successfully!", "success");
});

// Edit Employee
function editEmployee(index) {
  editingEmployeeIndex = index;
  const employee = window.db.employees[index];

  // Populate department dropdown first
  populateDepartmentDropdown();

  // Pre-fill form
  document.getElementById("empId").value = employee.employeeId;
  document.getElementById("empEmail").value = employee.userEmail;
  document.getElementById("empPosition").value = employee.position;
  document.getElementById("empDepartment").value = employee.departmentId;
  document.getElementById("empHireDate").value = employee.hireDate;

  // Change form title and show form
  document.getElementById("empFormTitle").textContent = "Edit Employee";
  document.getElementById("empFormCard").classList.remove("d-none");
}

// Delete Employee
function deleteEmployee(index) {
  const employee = window.db.employees[index];

  if (
    confirm(`Are you sure you want to delete employee ${employee.employeeId}?`)
  ) {
    window.db.employees.splice(index, 1);
    saveToStorage();
    renderEmployeesTable();
    showToast("Employee deleted successfully!", "success");
  }
}

// =============
// User Requests
// =============

// Render Requests Table
function renderRequestsTable() {
  const tableBody = document.getElementById("requestsTableBody");

  // Filter requests for current user
  const userRequests = window.db.requests.filter(
    (req) => req.employeeEmail === currentUser.email,
  );

  // Check if there are requests
  if (userRequests.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="2" class="text-center">You have no requests yet.</td></tr>';
    return;
  }

  // Clear and render requests
  tableBody.innerHTML = "";

  userRequests.forEach((request) => {
    // Format items for display
    const itemsList = request.items
      .map((item) => `${item.name} (${item.qty})`)
      .join(", ");

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${request.type}</td>
      <td>${itemsList}</td>
    `;

    tableBody.appendChild(row);
  });
}

// Add/Remove Items
document.getElementById("itemsContainer").addEventListener("click", (e) => {
  // Add item button
  if (e.target.closest(".add-item-btn")) {
    const container = document.getElementById("itemsContainer");

    // Create new item row with X button
    const newRow = document.createElement("div");
    newRow.className = "input-group mb-2 item-row";
    newRow.innerHTML = `
      <input
        type="text"
        class="form-control item-name"
        placeholder="Item Name"
        required
      />
      <input
        type="number"
        class="form-control item-qty"
        style="max-width: 100px"
        placeholder="Qty"
        value="1"
        min="1"
        required
      />
      <button
        type="button"
        class="btn btn-outline-danger remove-item-btn"
      >
        <i class="bi bi-x"></i>
      </button>
    `;

    container.appendChild(newRow);
  }

  // Remove item button
  if (e.target.closest(".remove-item-btn")) {
    const row = e.target.closest(".item-row");
    row.remove();
  }
});

// Submit Request Form
document.getElementById("reqModal-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const requestType = document.getElementById("requestType").value.trim();

  if (!requestType) {
    showToast("Please enter a request type!", "warning");
    return;
  }

  const itemRows = document.querySelectorAll(".item-row");
  const items = [];

  itemRows.forEach((row) => {
    const name = row.querySelector(".item-name").value.trim();
    const qty = parseInt(row.querySelector(".item-qty").value);

    if (name && qty > 0) {
      items.push({ name, qty });
    }
  });

  if (items.length === 0) {
    showToast("Please add at least one item!", "warning");
    return;
  }

  const newRequest = {
    type: requestType,
    items: items,
    status: "Pending",
    date: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
    employeeEmail: currentUser.email,
  };

  // Save to database
  window.db.requests.push(newRequest);
  saveToStorage();

  // Re-render table
  renderRequestsTable();

  // Reset form and close modal
  document.getElementById("reqModal-form").reset();

  // Reset items container to single row
  const itemsContainer = document.getElementById("itemsContainer");
  itemsContainer.innerHTML = `
    <div class="input-group mb-2 item-row">
      <input
        type="text"
        class="form-control item-name"
        placeholder="Item Name"
        required
      />
      <input
        type="number"
        class="form-control item-qty"
        style="max-width: 100px"
        placeholder="Qty"
        value="1"
        min="1"
        required
      />
      <button
        type="button"
        class="btn btn-outline-secondary add-item-btn"
      >
        <i class="bi bi-plus"></i>
      </button>
    </div>
  `;

  // Close modal
  const modal = bootstrap.Modal.getInstance(
    document.getElementById("requestModal"),
  );
  modal.hide();

  showToast("Request submitted successfully!", "success");
});

// Toast Notifications
function showToast(message, type = "info") {
  const toastEl = document.getElementById("liveToast");
  const toastMessage = document.getElementById("toast-message");

  // Set background color based on type
  let bgClass = "bg-primary";

  switch (type) {
    case "success":
      bgClass = "bg-success";
      break;
    case "error":
    case "danger":
      bgClass = "bg-danger";
      break;
    case "warning":
      bgClass = "bg-warning";
      break;
    case "info":
      bgClass = "bg-info";
      break;
  }

  toastMessage.textContent = message;

  // Apply background color (text is white by default)
  toastEl.className = "toast align-items-center text-white border-0 " + bgClass;

  // Show toast
  const toast = new bootstrap.Toast(toastEl, {
    autohide: true,
    delay: 3000,
  });
  toast.show();
}
