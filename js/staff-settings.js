document.addEventListener("DOMContentLoaded", function () {
  setupLogout();
  setupPasswordToggles();
  setupChangePasswordForm();
  checkAuthentication();
});

async function checkAuthentication() {
  try {
    const response = await fetch("../php/auth.php", {
      cache: "no-store",
    });

    const data = await response.json();

    if (!data.authenticated || data.role !== "staff") {
      window.location.href = "../login.html";
      return;
    }

    updateStaffIdentity(data.name);
  } catch (error) {
    console.error("Staff settings authentication error:", error);

    showSettingsMessage(
      "Unable to verify authentication. Please refresh the page.",
      "error",
    );
  }
}

function updateStaffIdentity(name) {
  const staffName = name || "Staff";
  const initials = getInitials(staffName);

  const headerName = document.getElementById("staffName");

  const sidebarName = document.getElementById("sidebarUserName");

  const profileAvatar = document.getElementById("profileAvatar");

  const sidebarAvatar = document.getElementById("sidebarAvatar");

  if (headerName) {
    headerName.textContent = staffName;
  }

  if (sidebarName) {
    sidebarName.textContent = staffName;
  }

  if (profileAvatar) {
    profileAvatar.textContent = initials;
  }

  if (sidebarAvatar) {
    sidebarAvatar.textContent = initials;
  }
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "ST";
  }

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function setupPasswordToggles() {
  const buttons = document.querySelectorAll(".staff-password-toggle");

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      const targetId = button.dataset.target;

      const input = document.getElementById(targetId);

      if (!input) {
        return;
      }

      if (input.type === "password") {
        input.type = "text";
        button.textContent = "Hide";
      } else {
        input.type = "password";
        button.textContent = "Show";
      }
    });
  });
}

function setupChangePasswordForm() {
  const form = document.getElementById("changePasswordForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const currentPassword = document.getElementById("currentPassword").value;

    const newPassword = document.getElementById("newPassword").value;

    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!currentPassword) {
      showSettingsMessage("Please enter your current password.", "error");
      return;
    }

    if (newPassword.length < 8) {
      showSettingsMessage(
        "New password must contain at least 8 characters.",
        "error",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showSettingsMessage(
        "New password and confirmation password do not match.",
        "error",
      );
      return;
    }

    if (currentPassword === newPassword) {
      showSettingsMessage(
        "New password must be different from your current password.",
        "error",
      );
      return;
    }

    const button = document.getElementById("changePasswordButton");

    if (button) {
      button.disabled = true;
      button.textContent = "Updating...";
    }

    try {
      const response = await fetch("../php/change-password.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to change password.");
      }

      form.reset();

      document
        .querySelectorAll(".staff-password-toggle")
        .forEach(function (toggle) {
          toggle.textContent = "Show";
        });

      showSettingsMessage(
        "Your password has been changed successfully.",
        "success",
      );
    } catch (error) {
      console.error("Password change error:", error);

      showSettingsMessage(
        error.message || "Unable to change password.",
        "error",
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Change Password";
      }
    }
  });
}

function setupLogout() {
  const logoutButton = document.getElementById("logoutButton");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", async function () {
    try {
      await fetch("../php/logout.php", {
        method: "POST",
      });
    } finally {
      window.location.href = "../login.html";
    }
  });
}

function showSettingsMessage(message, type) {
  const messageBox = document.getElementById("settingsMessage");

  if (!messageBox) {
    return;
  }

  messageBox.textContent = message;
  messageBox.className = "profile-message " + type;
  messageBox.style.display = "block";

  window.clearTimeout(showSettingsMessage.timeout);

  showSettingsMessage.timeout = window.setTimeout(function () {
    messageBox.style.display = "none";
  }, 5000);
}
