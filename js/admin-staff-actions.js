document.addEventListener("DOMContentLoaded", () => {
  initializeStaffActions();
});

function initializeStaffActions() {
  injectStaffActionStyles();
  setupStaffActionObserver();
  addStaffActionButtons();
}

function setupStaffActionObserver() {
  const tableBody = document.getElementById("staffTableBody");

  if (!tableBody) {
    return;
  }

  const observer = new MutationObserver(() => {
    addStaffActionButtons();
  });

  observer.observe(tableBody, {
    childList: true,
    subtree: true,
  });
}

function addStaffActionButtons() {
  const tableBody = document.getElementById("staffTableBody");

  if (!tableBody) {
    return;
  }

  const manageButtons = tableBody.querySelectorAll(".staff-manage-button");

  manageButtons.forEach((manageButton) => {
    const staffId = Number(manageButton.dataset.staffId);

    if (!staffId) {
      return;
    }

    const actionCell = manageButton.closest("td");

    if (!actionCell) {
      return;
    }

    if (
      actionCell.querySelector(`.staff-edit-button[data-staff-id="${staffId}"]`)
    ) {
      return;
    }

    const staff = findStaffById(staffId);

    if (!staff) {
      return;
    }

    addEditButton(actionCell, staff);
    addStatusButton(actionCell, staff);
    addResetPasswordButton(actionCell, staff);
  });
}

function findStaffById(staffId) {
  if (typeof allStaff === "undefined" || !Array.isArray(allStaff)) {
    return null;
  }

  return (
    allStaff.find((staff) => Number(staff.user_id) === Number(staffId)) || null
  );
}

function addEditButton(actionCell, staff) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "staff-action-button staff-edit-button";
  button.dataset.staffId = staff.user_id;
  button.textContent = "Edit";

  button.addEventListener("click", () => {
    openEditStaffModal(staff);
  });

  actionCell.appendChild(button);
}

function addStatusButton(actionCell, staff) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "staff-action-button staff-status-button";
  button.dataset.staffId = staff.user_id;

  updateStatusButtonText(button, staff);

  button.addEventListener("click", () => {
    toggleStaffStatus(staff);
  });

  actionCell.appendChild(button);
}

function updateStatusButtonText(button, staff) {
  const status = String(staff.status || "").toLowerCase();

  if (status === "active") {
    button.textContent = "Deactivate";
    button.classList.add("danger");
    button.classList.remove("success");
  } else {
    button.textContent = "Activate";
    button.classList.add("success");
    button.classList.remove("danger");
  }
}

function addResetPasswordButton(actionCell, staff) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "staff-action-button staff-reset-password-button";
  button.dataset.staffId = staff.user_id;
  button.textContent = "Reset Password";

  button.addEventListener("click", () => {
    openPasswordResetModal(staff.user_id);
  });

  actionCell.appendChild(button);
}

function openEditStaffModal(staff) {
  removeExistingModal("staffEditModal");

  const modal = document.createElement("div");

  modal.id = "staffEditModal";
  modal.className = "staff-action-modal-overlay";

  modal.innerHTML = `
    <div class="staff-action-modal">

      <div class="staff-action-modal-header">
        <div>
          <h2>Edit Staff</h2>
          <p>Update staff account information.</p>
        </div>

        <button
          type="button"
          class="staff-action-modal-close"
          id="closeStaffEditModal"
        >
          ×
        </button>
      </div>

      <form id="staffEditForm">

        <div class="staff-action-form-group">
          <label for="editStaffName">Name</label>

          <input
            type="text"
            id="editStaffName"
            value="${escapeStaffActionHtml(staff.name || "")}"
            maxlength="100"
            required
          >
        </div>

        <div class="staff-action-form-group">
          <label for="editStaffEmail">Email</label>

          <input
            type="email"
            id="editStaffEmail"
            value="${escapeStaffActionHtml(staff.email || "")}"
            maxlength="150"
            required
          >
        </div>

        <div class="staff-action-form-group">
          <label for="editStaffPhone">Phone</label>

          <input
            type="text"
            id="editStaffPhone"
            value="${escapeStaffActionHtml(staff.phone || "")}"
            maxlength="15"
          >
        </div>

        <div
          id="staffEditMessage"
          class="staff-action-form-message"
        ></div>

        <div class="staff-action-modal-footer">

          <button
            type="button"
            class="staff-action-secondary-button"
            id="cancelStaffEdit"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="staff-action-primary-button"
          >
            Save Changes
          </button>

        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document
    .getElementById("closeStaffEditModal")
    .addEventListener("click", closeEditStaffModal);

  document
    .getElementById("cancelStaffEdit")
    .addEventListener("click", closeEditStaffModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeEditStaffModal();
    }
  });

  document
    .getElementById("staffEditForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      saveStaffEdit(staff.user_id);
    });
}

function closeEditStaffModal() {
  removeExistingModal("staffEditModal");
}

async function saveStaffEdit(staffId) {
  const name = document.getElementById("editStaffName").value.trim();

  const email = document.getElementById("editStaffEmail").value.trim();

  const phone = document.getElementById("editStaffPhone").value.trim();

  const message = document.getElementById("staffEditMessage");

  const saveButton = document.querySelector(
    "#staffEditForm .staff-action-primary-button",
  );

  if (!name || !email) {
    showStaffActionMessage(message, "Name and email are required.", "error");

    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = "Saving...";

  try {
    const response = await fetch("../php/admin-edit-staff.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        staff_id: staffId,
        name: name,
        email: email,
        phone: phone,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to update staff.");
    }

    showStaffActionMessage(message, result.message, "success");

    setTimeout(() => {
      closeEditStaffModal();

      if (typeof loadStaff === "function") {
        loadStaff();
      }
    }, 700);
  } catch (error) {
    showStaffActionMessage(
      message,
      error.message || "Unable to update staff.",
      "error",
    );

    saveButton.disabled = false;
    saveButton.textContent = "Save Changes";
  }
}

async function toggleStaffStatus(staff) {
  const currentStatus = String(staff.status || "").toLowerCase();

  const newStatus = currentStatus === "active" ? "inactive" : "active";

  const actionText = newStatus === "active" ? "activate" : "deactivate";

  const confirmed = window.confirm(
    `Are you sure you want to ${actionText} ${staff.name}?`,
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch("../php/admin-toggle-staff.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        staff_id: Number(staff.user_id),
        status: newStatus,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || `Unable to ${actionText} staff.`);
    }

    showStaffActionToast(result.message, "success");

    if (typeof loadStaff === "function") {
      loadStaff();
    }
  } catch (error) {
    showStaffActionToast(
      error.message || `Unable to ${actionText} staff.`,
      "error",
    );
  }
}

function openPasswordResetModal(staffId) {
  removeExistingModal("staffPasswordResetModal");

  const staff = findStaffById(staffId);

  const staffName = staff && staff.name ? staff.name : "Staff";

  const modal = document.createElement("div");

  modal.id = "staffPasswordResetModal";
  modal.className = "staff-action-modal-overlay";

  modal.innerHTML = `
    <div class="staff-action-modal">

      <div class="staff-action-modal-header">
        <div>
          <h2>Reset Staff Password</h2>

          <p>
            Update the login password for
            ${escapeStaffActionHtml(staffName)}
          </p>
        </div>

        <button
          type="button"
          class="staff-action-modal-close"
          id="closeStaffPasswordModal"
        >
          ×
        </button>
      </div>

      <form id="staffPasswordResetForm">

        <div class="staff-action-form-group">
          <label for="staffNewPassword">
            New Password
          </label>

          <input
            type="password"
            id="staffNewPassword"
            minlength="8"
            autocomplete="new-password"
            required
          >

          <small>
            Minimum 8 characters.
          </small>
        </div>

        <div class="staff-action-form-group">
          <label for="staffConfirmPassword">
            Confirm Password
          </label>

          <input
            type="password"
            id="staffConfirmPassword"
            minlength="8"
            autocomplete="new-password"
            required
          >
        </div>

        <div
          id="staffPasswordResetMessage"
          class="staff-action-form-message"
        ></div>

        <div class="staff-action-modal-footer">

          <button
            type="button"
            class="staff-action-secondary-button"
            id="cancelStaffPasswordReset"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="staff-action-primary-button"
          >
            Reset Password
          </button>

        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document
    .getElementById("closeStaffPasswordModal")
    .addEventListener("click", closePasswordResetModal);

  document
    .getElementById("cancelStaffPasswordReset")
    .addEventListener("click", closePasswordResetModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closePasswordResetModal();
    }
  });

  document
    .getElementById("staffPasswordResetForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      resetStaffPassword(staffId);
    });

  document.getElementById("staffNewPassword").focus();
}

function closePasswordResetModal() {
  removeExistingModal("staffPasswordResetModal");
}

async function resetStaffPassword(staffId) {
  const password = document.getElementById("staffNewPassword").value;

  const confirmPassword = document.getElementById("staffConfirmPassword").value;

  const message = document.getElementById("staffPasswordResetMessage");

  const submitButton = document.querySelector(
    "#staffPasswordResetForm .staff-action-primary-button",
  );

  if (password.length < 8) {
    showStaffActionMessage(
      message,
      "Password must contain at least 8 characters.",
      "error",
    );

    return;
  }

  if (password !== confirmPassword) {
    showStaffActionMessage(message, "Passwords do not match.", "error");

    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Updating...";

  try {
    const response = await fetch("../php/admin-reset-staff-password.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        staff_id: Number(staffId),
        password: password,
        confirm_password: confirmPassword,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to reset password.");
    }

    showStaffActionMessage(message, result.message, "success");

    setTimeout(() => {
      closePasswordResetModal();
    }, 1000);
  } catch (error) {
    showStaffActionMessage(
      message,
      error.message || "Unable to reset password.",
      "error",
    );

    submitButton.disabled = false;
    submitButton.textContent = "Reset Password";
  }
}

function showStaffActionMessage(element, text, type) {
  if (!element) {
    return;
  }

  element.textContent = text;

  element.className =
    "staff-action-form-message " + (type === "success" ? "success" : "error");
}

function showStaffActionToast(text, type) {
  const existing = document.getElementById("staffActionToast");

  if (existing) {
    existing.remove();
  }

  const toast = document.createElement("div");

  toast.id = "staffActionToast";
  toast.className =
    "staff-action-toast " + (type === "success" ? "success" : "error");

  toast.textContent = text;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

function removeExistingModal(id) {
  const modal = document.getElementById(id);

  if (modal) {
    modal.remove();
  }
}

function escapeStaffActionHtml(value) {
  const div = document.createElement("div");

  div.textContent = String(value ?? "");

  return div.innerHTML;
}

function injectStaffActionStyles() {
  if (document.getElementById("staffActionStyles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "staffActionStyles";

  style.textContent = `
    .staff-action-button {
      border: 1px solid var(--border, #e6eaf2);
      background: #ffffff;
      color: var(--text, #34415c);
      border-radius: 7px;
      padding: 7px 10px;
      margin: 2px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .staff-action-button:hover {
      border-color: var(--primary, #4568e8);
      color: var(--primary, #4568e8);
      background: var(--primary-soft, #edf1ff);
    }

    .staff-action-button.danger {
      color: #b33a3a;
    }

    .staff-action-button.danger:hover {
      border-color: #d96b6b;
      background: #fff2f2;
      color: #a52d2d;
    }

    .staff-action-button.success {
      color: #18864b;
    }

    .staff-action-button.success:hover {
      border-color: #62b98a;
      background: #effaf4;
      color: #147541;
    }

    .staff-action-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(27, 37, 65, 0.48);
    }

    .staff-action-modal {
      width: 100%;
      max-width: 500px;
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 20px 60px rgba(20, 35, 70, 0.2);
      overflow: hidden;
    }

    .staff-action-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      padding: 22px 24px;
      border-bottom: 1px solid var(--border, #e6eaf2);
    }

    .staff-action-modal-header h2 {
      margin: 0 0 5px;
      color: var(--text-dark, #1b2541);
      font-size: 20px;
    }

    .staff-action-modal-header p {
      margin: 0;
      color: var(--text-muted, #7a879f);
      font-size: 13px;
    }

    .staff-action-modal-close {
      border: none;
      background: transparent;
      color: #7a879f;
      font-size: 28px;
      line-height: 1;
      cursor: pointer;
    }

    .staff-action-modal-close:hover {
      color: #1b2541;
    }

    #staffEditForm,
    #staffPasswordResetForm {
      padding: 24px;
    }

    .staff-action-form-group {
      margin-bottom: 18px;
    }

    .staff-action-form-group label {
      display: block;
      margin-bottom: 7px;
      color: var(--text-dark, #1b2541);
      font-size: 13px;
      font-weight: 600;
    }

    .staff-action-form-group input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--border, #e6eaf2);
      border-radius: 8px;
      padding: 11px 12px;
      color: var(--text-dark, #1b2541);
      background: #ffffff;
      font-size: 14px;
      outline: none;
    }

    .staff-action-form-group input:focus {
      border-color: var(--primary, #4568e8);
      box-shadow: 0 0 0 3px var(--primary-soft, #edf1ff);
    }

    .staff-action-form-group small {
      display: block;
      margin-top: 6px;
      color: var(--text-muted, #7a879f);
      font-size: 12px;
    }

    .staff-action-form-message {
      min-height: 20px;
      margin-bottom: 12px;
      font-size: 13px;
      font-weight: 600;
    }

    .staff-action-form-message.success {
      color: #18864b;
    }

    .staff-action-form-message.error {
      color: #c63c3c;
    }

    .staff-action-modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 8px;
    }

    .staff-action-secondary-button,
    .staff-action-primary-button {
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .staff-action-secondary-button {
      background: #f1f3f7;
      color: #4d5870;
    }

    .staff-action-primary-button {
      background: var(--primary, #4568e8);
      color: #ffffff;
    }

    .staff-action-primary-button:hover {
      background: var(--primary-dark, #3558d4);
    }

    .staff-action-primary-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .staff-action-toast {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 10000;
      max-width: 380px;
      padding: 13px 16px;
      border-radius: 9px;
      background: #ffffff;
      box-shadow: 0 10px 30px rgba(30, 45, 80, 0.16);
      font-size: 13px;
      font-weight: 600;
    }

    .staff-action-toast.success {
      color: #18864b;
      border: 1px solid #bfe5cf;
    }

    .staff-action-toast.error {
      color: #b33a3a;
      border: 1px solid #efc2c2;
    }

    @media (max-width: 700px) {
      .staff-action-modal {
        max-width: 100%;
      }

      .staff-action-modal-footer {
        flex-direction: column-reverse;
      }

      .staff-action-secondary-button,
      .staff-action-primary-button {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
}
