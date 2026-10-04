document.addEventListener("DOMContentLoaded", () => {
  initializeAdminStaffPage();
});

let allStaff = [];
let csrfToken = "";

async function initializeAdminStaffPage() {
  const authenticated = await checkAdminAuthentication();

  if (!authenticated) {
    return;
  }

  try {
    await loadCsrfToken();
  } catch (error) {
    console.error("Unable to initialize security token:", error);
    return;
  }

  updateAdminProfile();
  setupSearch();
  setupNotifications();
  setupLogout();
  setupCategoryManagement();
  setupAddStaff();

  await loadStaff();
}

async function checkAdminAuthentication() {
  try {
    const response = await fetch("../php/auth.php", {
      credentials: "same-origin",
    });

    const data = await response.json();

    if (!data.authenticated) {
      window.location.href = "../index.html";
      return false;
    }

    if (data.role !== "admin") {
      window.location.href = "../index.html";
      return false;
    }

    return true;
  } catch (error) {
    console.error("Authentication check failed:", error);
    window.location.href = "../index.html";
    return false;
  }
}

async function loadCsrfToken() {
  const response = await fetch("../php/csrf-token.php", {
    credentials: "same-origin",
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok || !data.success || !data.csrf_token) {
    throw new Error(data.message || "Unable to initialize security token.");
  }

  csrfToken = data.csrf_token;
}

function updateAdminProfile() {
  fetch("../php/auth.php", {
    credentials: "same-origin",
  })
    .then((response) => response.json())
    .then((data) => {
      if (!data.authenticated) {
        return;
      }

      const name = data.name || "Admin";
      const initials = getInitials(name);

      setText("adminName", name);
      setText("sidebarAdminName", name);

      setText("profileAvatar", initials);
      setText("sidebarAvatar", initials);
    })
    .catch((error) => {
      console.error("Unable to load admin profile:", error);
    });
}

async function loadStaff() {
  const tableBody = document.getElementById("staffTableBody");
  const errorBox = document.getElementById("staffError");

  if (errorBox) {
    errorBox.style.display = "none";
    errorBox.textContent = "";
  }

  try {
    const response = await fetch("../php/admin-staff.php", {
      credentials: "same-origin",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load staff information.");
    }

    allStaff = Array.isArray(data.staff) ? data.staff : [];

    updateSummary(data.summary || {});
    renderStaff(allStaff);
  } catch (error) {
    console.error("Staff loading failed:", error);

    if (errorBox) {
      errorBox.textContent =
        error.message || "Unable to load staff information.";

      errorBox.style.display = "block";
    }

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-staff-state">
              <h3>Unable to load staff</h3>
              <p>Please refresh the page and try again.</p>
            </div>
          </td>
        </tr>
      `;
    }
  }
}

function updateSummary(summary) {
  setText("totalStaff", Number(summary.total_staff || 0));
  setText("activeStaff", Number(summary.active_staff || 0));
  setText("staffWithWork", Number(summary.staff_with_work || 0));
  setText("totalWorkload", Number(summary.total_workload || 0));
}

function renderStaff(staffList) {
  const tableBody = document.getElementById("staffTableBody");

  if (!tableBody) {
    return;
  }

  if (!staffList.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-staff-state">
            <h3>No staff found</h3>
            <p>
              There are currently no staff accounts matching
              your search.
            </p>
          </div>
        </td>
      </tr>
    `;

    return;
  }

  tableBody.innerHTML = staffList
    .map((staff) => createStaffRow(staff))
    .join("");
}

function createStaffRow(staff) {
  const name = staff.name || "Unnamed Staff";
  const email = staff.email || "No email";
  const status = String(staff.status || "inactive").toLowerCase();

  const categories = staff.categories
    ? escapeHtml(staff.categories)
    : "No categories mapped";

  const workload = Number(staff.current_workload || 0);
  const assignedCount = Number(staff.assigned_count || 0);
  const inProgressCount = Number(staff.in_progress_count || 0);

  const initials = getInitials(name);

  const statusClass = status === "active" ? "status-active" : "status-inactive";

  const statusLabel = status === "active" ? "Active" : "Inactive";

  const workloadClass = getWorkloadClass(workload);
  const workloadPercentage = getWorkloadPercentage(workload);

  return `
    <tr>
      <td>
        <div class="staff-person">
          <div class="staff-avatar">
            ${escapeHtml(initials)}
          </div>

          <div>
            <div class="staff-person-name">
              ${escapeHtml(name)}
            </div>

            <div class="staff-person-email">
              ${escapeHtml(email)}
            </div>
          </div>
        </div>
      </td>

      <td>
        <span class="status-badge ${statusClass}">
          ${statusLabel}
        </span>
      </td>

      <td>
        <div class="category-list">
          ${categories}
        </div>
      </td>

      <td>
        <div class="workload-cell">
          <div class="workload-number">
            ${workload}
          </div>

          <div class="workload-label">
            active complaint${workload === 1 ? "" : "s"}
          </div>

          <div class="workload-bar">
            <div
              class="workload-bar-fill ${workloadClass}"
              style="width: ${workloadPercentage}%"
            ></div>
          </div>
        </div>
      </td>

      <td>
        <div class="complaint-counts">
          <div class="complaint-count">
            Assigned:
            <strong>${assignedCount}</strong>
          </div>

          <div class="complaint-count">
            In Progress:
            <strong>${inProgressCount}</strong>
          </div>
        </div>
      </td>

      <td>
        <button
          type="button"
          class="staff-manage-button"
          data-staff-id="${Number(staff.user_id)}"
          data-staff-name="${escapeHtml(name)}"
        >
          Manage Categories
        </button>
      </td>
    </tr>
  `;
}

function getWorkloadPercentage(workload) {
  const maxDisplayWorkload = 10;

  if (workload <= 0) {
    return 0;
  }

  return Math.min((workload / maxDisplayWorkload) * 100, 100);
}

function getWorkloadClass(workload) {
  if (workload >= 7) {
    return "high";
  }

  if (workload >= 4) {
    return "busy";
  }

  return "";
}

function setupSearch() {
  const searchInput = document.getElementById("staffSearch");

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
      renderStaff(allStaff);
      return;
    }

    const filteredStaff = allStaff.filter((staff) => {
      const name = String(staff.name || "").toLowerCase();
      const email = String(staff.email || "").toLowerCase();
      const categories = String(staff.categories || "").toLowerCase();
      const status = String(staff.status || "").toLowerCase();

      return (
        name.includes(query) ||
        email.includes(query) ||
        categories.includes(query) ||
        status.includes(query)
      );
    });

    renderStaff(filteredStaff);
  });
}

function setupAddStaff() {
  const addButton = document.getElementById("addStaffButton");
  const modal = document.getElementById("staffFormModal");
  const overlay = document.getElementById("staffFormOverlay");
  const closeButton = document.getElementById("closeStaffForm");
  const cancelButton = document.getElementById("cancelStaffForm");
  const form = document.getElementById("staffForm");

  if (!addButton || !modal || !form) {
    return;
  }

  addButton.addEventListener("click", openStaffForm);

  if (closeButton) {
    closeButton.addEventListener("click", closeStaffForm);
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", closeStaffForm);
  }

  if (overlay) {
    overlay.addEventListener("click", closeStaffForm);
  }

  form.addEventListener("submit", createStaff);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("open")) {
      closeStaffForm();
    }
  });
}

function openStaffForm() {
  const modal = document.getElementById("staffFormModal");
  const form = document.getElementById("staffForm");

  if (!modal) {
    return;
  }

  if (form) {
    form.reset();
  }

  const statusInput = document.getElementById("staffStatusInput");

  if (statusInput) {
    statusInput.value = "active";
  }

  clearStaffFormMessage();

  modal.classList.add("open");

  const nameInput = document.getElementById("staffNameInput");

  if (nameInput) {
    setTimeout(() => {
      nameInput.focus();
    }, 50);
  }
}

function closeStaffForm() {
  const modal = document.getElementById("staffFormModal");

  if (modal) {
    modal.classList.remove("open");
  }

  clearStaffFormMessage();
}

async function createStaff(event) {
  event.preventDefault();

  const submitButton = document.getElementById("saveStaffButton");

  const name = document.getElementById("staffNameInput")?.value.trim() || "";

  const email = document.getElementById("staffEmailInput")?.value.trim() || "";

  const phone = document.getElementById("staffPhoneInput")?.value.trim() || "";

  const password = document.getElementById("staffPasswordInput")?.value || "";

  const confirmPassword =
    document.getElementById("staffConfirmPasswordInput")?.value || "";

  const status = document.getElementById("staffStatusInput")?.value || "active";

  if (!name || !email || !phone || !password || !confirmPassword) {
    showStaffFormMessage("Please fill in all required fields.", "error");
    return;
  }

  if (password.length < 8) {
    showStaffFormMessage(
      "Password must contain at least 8 characters.",
      "error",
    );

    return;
  }

  if (password !== confirmPassword) {
    showStaffFormMessage("Passwords do not match.", "error");
    return;
  }

  if (!/^[0-9]{7,15}$/.test(phone)) {
    showStaffFormMessage("Phone number must contain 7 to 15 digits.", "error");

    return;
  }

  if (!csrfToken) {
    showStaffFormMessage(
      "Security token is unavailable. Please refresh the page.",
      "error",
    );

    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Creating...";
  }

  try {
    const response = await fetch("../php/admin-create-staff.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
      },
      credentials: "same-origin",
      body: JSON.stringify({
        name,
        email,
        phone,
        password,
        confirm_password: confirmPassword,
        status,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to create staff account.");
    }

    showStaffFormMessage(
      data.message || "Staff account created successfully.",
      "success",
    );

    setTimeout(() => {
      closeStaffForm();
      loadStaff();
    }, 700);
  } catch (error) {
    console.error("Staff creation failed:", error);

    showStaffFormMessage(
      error.message || "Unable to create staff account.",
      "error",
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Create Staff";
    }
  }
}

function showStaffFormMessage(message, type) {
  const messageBox = document.getElementById("staffFormMessage");

  if (!messageBox) {
    return;
  }

  messageBox.textContent = message;
  messageBox.className = `staff-form-message show ${type}`;
}

function clearStaffFormMessage() {
  const messageBox = document.getElementById("staffFormMessage");

  if (!messageBox) {
    return;
  }

  messageBox.textContent = "";
  messageBox.className = "staff-form-message";
}

function setupCategoryManagement() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".staff-manage-button");

    if (!button) {
      return;
    }

    const staffId = Number(button.dataset.staffId);
    const staffName = button.dataset.staffName || "Staff";

    openCategoryModal(staffId, staffName);
  });

  injectCategoryModalStyles();
}

async function openCategoryModal(staffId, staffName) {
  const modal = getOrCreateCategoryModal();

  setText("categoryModalStaffName", staffName);
  setText("categoryModalMessage", "Loading categories...");

  const list = document.getElementById("categoryModalList");
  const saveButton = document.getElementById("saveCategoryButton");

  if (list) {
    list.innerHTML = `
      <div class="category-loading">
        Loading categories...
      </div>
    `;
  }

  if (saveButton) {
    saveButton.disabled = true;
  }

  modal.classList.add("open");

  try {
    const response = await fetch(
      `../php/admin-staff-categories.php?staff_id=${staffId}`,
      {
        credentials: "same-origin",
      },
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load categories.");
    }

    renderCategoryOptions(
      data.categories || [],
      data.assigned_category_ids || [],
    );

    if (saveButton) {
      saveButton.disabled = false;
    }

    setText(
      "categoryModalMessage",
      "Select the complaint categories this staff member handles.",
    );

    saveButton.onclick = () => saveStaffCategories(staffId);
  } catch (error) {
    console.error("Category loading failed:", error);

    if (list) {
      list.innerHTML = `
        <div class="category-error">
          ${escapeHtml(error.message || "Unable to load categories.")}
        </div>
      `;
    }

    setText("categoryModalMessage", "Unable to load category information.");
  }
}

function renderCategoryOptions(categories, assignedCategoryIds) {
  const list = document.getElementById("categoryModalList");

  if (!list) {
    return;
  }

  const assigned = new Set(assignedCategoryIds.map(Number));

  if (!categories.length) {
    list.innerHTML = `
      <div class="category-empty">
        No active categories are available.
      </div>
    `;

    return;
  }

  list.innerHTML = categories
    .map((category) => {
      const categoryId = Number(category.category_id);

      const checked = assigned.has(categoryId) ? "checked" : "";

      return `
        <label class="category-option">
          <input
            type="checkbox"
            value="${categoryId}"
            ${checked}
          />

          <span class="category-check"></span>

          <span class="category-option-name">
            ${escapeHtml(category.category_name)}
          </span>
        </label>
      `;
    })
    .join("");
}

async function saveStaffCategories(staffId) {
  const saveButton = document.getElementById("saveCategoryButton");

  const checkboxes = document.querySelectorAll(
    "#categoryModalList input[type='checkbox']",
  );

  const categoryIds = Array.from(checkboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => Number(checkbox.value));

  if (!csrfToken) {
    setText(
      "categoryModalMessage",
      "Security token is unavailable. Please refresh the page.",
    );

    return;
  }

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
  }

  try {
    const response = await fetch("../php/admin-staff-categories.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
      },
      credentials: "same-origin",
      body: JSON.stringify({
        staff_id: staffId,
        category_ids: categoryIds,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to save category assignments.");
    }

    setText("categoryModalMessage", "Category assignments saved successfully.");

    setTimeout(() => {
      closeCategoryModal();
      loadStaff();
    }, 700);
  } catch (error) {
    console.error("Category save failed:", error);

    setText(
      "categoryModalMessage",
      error.message || "Unable to save category assignments.",
    );
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = "Save Changes";
    }
  }
}

function getOrCreateCategoryModal() {
  let modal = document.getElementById("categoryManagementModal");

  if (modal) {
    return modal;
  }

  modal = document.createElement("div");

  modal.id = "categoryManagementModal";
  modal.className = "category-management-modal";

  modal.innerHTML = `
    <div
      class="category-modal-overlay"
      id="categoryModalOverlay"
    ></div>

    <div
      class="category-modal-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="categoryModalStaffName"
    >
      <div class="category-modal-header">
        <div>
          <div class="category-modal-eyebrow">
            STAFF CATEGORIES
          </div>

          <h2 id="categoryModalStaffName">
            Staff
          </h2>
        </div>

        <button
          type="button"
          class="category-modal-close"
          id="closeCategoryModal"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div
        id="categoryModalMessage"
        class="category-modal-message"
      >
        Select the complaint categories this staff member handles.
      </div>

      <div
        id="categoryModalList"
        class="category-modal-list"
      ></div>

      <div class="category-modal-footer">
        <button
          type="button"
          class="category-cancel-button"
          id="cancelCategoryButton"
        >
          Cancel
        </button>

        <button
          type="button"
          class="category-save-button"
          id="saveCategoryButton"
        >
          Save Changes
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document
    .getElementById("closeCategoryModal")
    .addEventListener("click", closeCategoryModal);

  document
    .getElementById("cancelCategoryButton")
    .addEventListener("click", closeCategoryModal);

  document
    .getElementById("categoryModalOverlay")
    .addEventListener("click", closeCategoryModal);

  return modal;
}

function closeCategoryModal() {
  const modal = document.getElementById("categoryManagementModal");

  if (modal) {
    modal.classList.remove("open");
  }
}

function injectCategoryModalStyles() {
  if (document.getElementById("adminStaffCategoryStyles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "adminStaffCategoryStyles";

  style.textContent = `
    .staff-manage-button {
      border: 0;
      border-radius: 8px;
      padding: 8px 12px;
      background: var(--primary);
      color: #ffffff;
      cursor: pointer;
      font-family: inherit;
      font-size: 11px;
      font-weight: 650;
      white-space: nowrap;
    }

    .staff-manage-button:hover {
      background: var(--primary-dark);
    }

    .staff-manage-button:focus {
      outline: none;
      box-shadow:
        0 0 0 3px
        rgba(69, 104, 232, 0.15);
    }

    .category-management-modal {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .category-management-modal.open {
      display: flex;
    }

    .category-modal-overlay {
      position: absolute;
      inset: 0;
      background: rgba(20, 28, 50, 0.45);
      backdrop-filter: blur(3px);
    }

    .category-modal-card {
      position: relative;
      z-index: 1;
      width: min(520px, 100%);
      max-height: 90vh;
      overflow-y: auto;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: #ffffff;
      box-shadow:
        0 20px 60px
        rgba(25, 38, 75, 0.2);
    }

    .category-modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      padding: 22px 24px 16px;
      border-bottom: 1px solid var(--border);
    }

    .category-modal-eyebrow {
      margin-bottom: 5px;
      color: var(--primary);
      font-size: 10px;
      font-weight: 750;
      letter-spacing: 0.08em;
    }

    .category-modal-header h2 {
      margin: 0;
      color: var(--text-dark);
      font-size: 19px;
    }

    .category-modal-close {
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: 8px;
      background: #f5f7fb;
      color: var(--text);
      cursor: pointer;
      font-size: 22px;
      line-height: 1;
    }

    .category-modal-close:hover {
      background: #edf1ff;
      color: var(--primary);
    }

    .category-modal-message {
      padding: 15px 24px;
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.5;
    }

    .category-modal-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      padding: 0 24px 22px;
    }

    .category-option {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 48px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #ffffff;
      cursor: pointer;
    }

    .category-option:hover {
      border-color: #cbd4ef;
      background: #fafbff;
    }

    .category-option input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .category-check {
      width: 17px;
      height: 17px;
      flex-shrink: 0;
      border: 1.5px solid #c7cedd;
      border-radius: 5px;
      background: #ffffff;
    }

    .category-option input:checked
      + .category-check {
      border-color: var(--primary);
      background: var(--primary);
      box-shadow:
        inset 0 0 0 3px #ffffff;
    }

    .category-option:has(
      input:checked
    ) {
      border-color: #c9d3f8;
      background: #f5f7ff;
    }

    .category-option-name {
      color: var(--text);
      font-size: 12px;
      font-weight: 550;
      line-height: 1.3;
    }

    .category-loading,
    .category-empty,
    .category-error {
      grid-column: 1 / -1;
      padding: 20px;
      border-radius: 10px;
      background: #f8f9fc;
      color: var(--text-muted);
      font-size: 12px;
      text-align: center;
    }

    .category-error {
      background: #fff0f0;
      color: #b33a3a;
    }

    .category-modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 24px 20px;
      border-top: 1px solid var(--border);
    }

    .category-cancel-button,
    .category-save-button {
      min-width: 110px;
      height: 38px;
      padding: 0 15px;
      border-radius: 8px;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
      font-weight: 650;
    }

    .category-cancel-button {
      border: 1px solid var(--border);
      background: #ffffff;
      color: var(--text);
    }

    .category-save-button {
      border: 0;
      background: var(--primary);
      color: #ffffff;
    }

    .category-save-button:hover {
      background: var(--primary-dark);
    }

    .category-save-button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    @media (max-width: 600px) {
      .category-modal-list {
        grid-template-columns: 1fr;
      }

      .category-modal-footer {
        flex-direction: column-reverse;
      }

      .category-cancel-button,
      .category-save-button {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
}

function setupNotifications() {
  const notificationButton = document.getElementById("notificationButton");

  const notificationDropdown = document.getElementById("notificationDropdown");

  const markAllRead = document.getElementById("markAllRead");

  if (notificationButton && notificationDropdown) {
    notificationButton.addEventListener("click", (event) => {
      event.stopPropagation();

      notificationDropdown.classList.toggle("show");
    });

    notificationDropdown.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    document.addEventListener("click", () => {
      notificationDropdown.classList.remove("show");
    });
  }

  if (markAllRead) {
    markAllRead.addEventListener("click", markAllNotificationsAsRead);
  }

  loadNotifications();
}

async function loadNotifications() {
  try {
    const response = await fetch("../php/notifications.php", {
      credentials: "same-origin",
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();

    if (!data.success) {
      return;
    }

    const notifications = Array.isArray(data.notifications)
      ? data.notifications
      : [];

    renderNotifications(notifications);
  } catch (error) {
    console.error("Unable to load notifications:", error);
  }
}

function renderNotifications(notifications) {
  const notificationList = document.getElementById("notificationList");

  const notificationBadge = document.getElementById("notificationBadge");

  if (!notificationList) {
    return;
  }

  if (!notifications.length) {
    notificationList.innerHTML = `
      <div class="notification-empty">
        No notifications
      </div>
    `;

    if (notificationBadge) {
      notificationBadge.style.display = "none";
    }

    return;
  }

  const unreadCount = notifications.filter(
    (notification) => Number(notification.is_read) === 0,
  ).length;

  if (notificationBadge) {
    if (unreadCount > 0) {
      notificationBadge.textContent = unreadCount > 99 ? "99+" : unreadCount;

      notificationBadge.style.display = "flex";
    } else {
      notificationBadge.style.display = "none";
    }
  }

  notificationList.innerHTML = notifications
    .map((notification) => {
      const unread = Number(notification.is_read) === 0;

      const complaintCode = notification.complaint_code
        ? `
              <div class="notification-complaint">
                ${escapeHtml(notification.complaint_code)}
              </div>
            `
        : "";

      return `
        <div
          class="notification-item ${unread ? "unread" : ""}"
          data-notification-id="${Number(notification.notification_id)}"
        >
          <div class="notification-content">
            <div class="notification-message">
              ${escapeHtml(notification.message || "")}
            </div>

            ${complaintCode}

            <div class="notification-time">
              ${formatDate(notification.created_at)}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  setupNotificationReadHandlers();
}

function setupNotificationReadHandlers() {
  const notificationItems = document.querySelectorAll(
    ".notification-item[data-notification-id]",
  );

  notificationItems.forEach((item) => {
    item.addEventListener("click", async () => {
      const notificationId = item.dataset.notificationId;

      if (!notificationId) {
        return;
      }

      await markNotificationAsRead(notificationId);

      item.classList.remove("unread");

      loadNotifications();
    });
  });
}

async function markNotificationAsRead(notificationId) {
  if (!csrfToken) {
    console.error(
      "Unable to mark notification as read: CSRF token unavailable.",
    );
    return;
  }

  try {
    const response = await fetch("../php/mark-notification-read.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
      },
      credentials: "same-origin",
      body: JSON.stringify({
        notification_id: Number(notificationId),
      }),
    });

    if (!response.ok) {
      console.error("Unable to mark notification as read.");
    }
  } catch (error) {
    console.error("Unable to mark notification as read:", error);
  }
}

async function markAllNotificationsAsRead() {
  if (!csrfToken) {
    console.error(
      "Unable to mark notifications as read: CSRF token unavailable.",
    );
    return;
  }

  try {
    const response = await fetch("../php/mark-all-notifications-read.php", {
      method: "POST",
      headers: {
        "X-CSRF-TOKEN": csrfToken,
      },
      credentials: "same-origin",
    });

    if (!response.ok) {
      return;
    }

    loadNotifications();
  } catch (error) {
    console.error("Unable to mark all notifications as read:", error);
  }
}

function setupLogout() {
  const logoutButton = document.getElementById("logoutButton");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", async () => {
    if (!csrfToken) {
      console.error("Unable to logout: CSRF token unavailable.");
      return;
    }

    try {
      await fetch("../php/logout.php", {
        method: "POST",
        headers: {
          "X-CSRF-TOKEN": csrfToken,
        },
        credentials: "same-origin",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    }

    window.location.href = "../index.html";
  });
}

function getInitials(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);

  if (!words.length) {
    return "A";
  }

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Unknown time";
  }

  const date = new Date(String(dateValue).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
