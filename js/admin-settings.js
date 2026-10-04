document.addEventListener("DOMContentLoaded", function () {
  initializeAdminSettings();
});

let csrfToken = "";

async function initializeAdminSettings() {
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
  setupPasswordForm();
  setupPasswordToggles();
  setupInterfacePreferences();
  setupLogout();
}

async function checkAdminAuthentication() {
  try {
    const response = await fetch("../php/auth.php", {
      credentials: "same-origin",
      cache: "no-store",
    });

    const data = await response.json();

    if (!data.authenticated) {
      window.location.href = "../login.html";
      return false;
    }

    if (data.role !== "admin") {
      window.location.href = "../login.html";
      return false;
    }

    return true;
  } catch (error) {
    console.error("Authentication check failed:", error);

    window.location.href = "../login.html";

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

async function updateAdminProfile() {
  try {
    const response = await fetch("../php/auth.php", {
      credentials: "same-origin",
      cache: "no-store",
    });

    const data = await response.json();

    if (!data.authenticated) {
      return;
    }

    const name = data.name || "Admin";
    const initials = getInitials(name);

    setText("adminName", name);
    setText("sidebarUserName", name);
    setText("sidebarAdminName", name);

    setText("profileAvatar", initials);
    setText("sidebarAvatar", initials);
  } catch (error) {
    console.error("Unable to load admin profile:", error);
  }
}

function setupPasswordForm() {
  const form = document.getElementById("passwordForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const currentPassword = document.getElementById("currentPassword").value;

    const newPassword = document.getElementById("newPassword").value;

    const confirmPassword = document.getElementById("confirmPassword").value;

    clearPasswordMessage();

    if (!currentPassword) {
      showPasswordMessage("Please enter your current password.", "error");

      return;
    }

    if (newPassword.length < 8) {
      showPasswordMessage(
        "New password must contain at least 8 characters.",
        "error",
      );

      return;
    }

    if (newPassword !== confirmPassword) {
      showPasswordMessage("New passwords do not match.", "error");

      return;
    }

    if (!csrfToken) {
      showPasswordMessage(
        "Security token is not available. Please refresh the page.",
        "error",
      );

      return;
    }

    const button = document.getElementById("changePasswordButton");

    if (button) {
      button.disabled = true;
      button.textContent = "Changing...";
    }

    try {
      const response = await fetch("../php/admin-change-password.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken,
        },
        credentials: "same-origin",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to change password.");
      }

      form.reset();

      showPasswordMessage("Password changed successfully.", "success");
    } catch (error) {
      console.error("Password change error:", error);

      showPasswordMessage(
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

function setupPasswordToggles() {
  const toggleButtons = document.querySelectorAll(".password-toggle");

  toggleButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const inputId = button.dataset.target;
      const input = document.getElementById(inputId);

      if (!input) {
        return;
      }

      const isPassword = input.type === "password";

      input.type = isPassword ? "text" : "password";

      button.textContent = isPassword ? "Hide" : "Show";
    });
  });
}

function setupInterfacePreferences() {
  const compactMode = document.getElementById("compactMode");

  const storedCompactMode = localStorage.getItem(
    "fixmycampus_admin_compact_mode",
  );

  if (compactMode) {
    compactMode.checked = storedCompactMode === "true";

    applyCompactMode(compactMode.checked);

    compactMode.addEventListener("change", function () {
      localStorage.setItem(
        "fixmycampus_admin_compact_mode",
        compactMode.checked,
      );

      applyCompactMode(compactMode.checked);
    });
  }
}

function applyCompactMode(enabled) {
  document.body.classList.toggle("admin-compact-mode", enabled);
}

function setupLogout() {
  const logoutButton = document.getElementById("logoutButton");

  const sidebarLogoutButton = document.getElementById("sidebarLogoutButton");

  [logoutButton, sidebarLogoutButton]
    .filter(Boolean)
    .forEach(function (button) {
      button.addEventListener("click", async function () {
        if (!csrfToken) {
          window.location.href = "../login.html";
          return;
        }

        try {
          await fetch("../php/logout.php", {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "X-CSRF-TOKEN": csrfToken,
            },
          });
        } finally {
          window.location.href = "../login.html";
        }
      });
    });
}

function showPasswordMessage(message, type) {
  const element = document.getElementById("passwordMessage");

  if (!element) {
    return;
  }

  element.textContent = message;

  element.className = "settings-message " + type;

  element.style.display = "block";
}

function clearPasswordMessage() {
  const element = document.getElementById("passwordMessage");

  if (!element) {
    return;
  }

  element.textContent = "";
  element.className = "settings-message";
  element.style.display = "none";
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = String(value ?? "");
  }
}

function getInitials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "AD";
  }

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
