let currentAdminProfile = null;

document.addEventListener("DOMContentLoaded", function () {
  initializeAdminProfile();
});

async function initializeAdminProfile() {
  const authenticated = await checkAdminAuthentication();

  if (!authenticated) {
    return;
  }

  setupProfileForm();
  setupProfilePictureUpload();

  await loadProfile();
}

async function checkAdminAuthentication() {
  try {
    const response = await fetch("../php/auth.php", {
      credentials: "same-origin",
      cache: "no-store",
    });

    const data = await response.json();

    if (!data.authenticated || data.role !== "admin") {
      window.location.href = "../login.html";

      return false;
    }

    updateAdminIdentity(data.name);

    return true;
  } catch (error) {
    console.error("Authentication error:", error);

    window.location.href = "../login.html";

    return false;
  }
}

async function loadProfile() {
  try {
    const response = await fetch("../php/profile.php", {
      credentials: "same-origin",
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || !data.success || !data.user) {
      throw new Error(data.message || "Unable to load profile.");
    }

    currentAdminProfile = data.user;

    renderProfile(data.user);
  } catch (error) {
    console.error("Profile loading error:", error);

    showProfileMessage(error.message || "Unable to load profile.", "error");
  }
}

function renderProfile(user) {
  const name = user.name || "Administrator";

  const email = user.email || "";

  const phone = user.phone || "";

  const role = user.role || "admin";

  const status = user.status || "active";

  const profilePicture = user.profile_picture || "";

  const nameInput = document.getElementById("name");

  const emailInput = document.getElementById("email");

  const phoneInput = document.getElementById("phone");

  if (nameInput) {
    nameInput.value = name;
  }

  if (emailInput) {
    emailInput.value = email;
  }

  if (phoneInput) {
    phoneInput.value = phone;
  }

  const accountStatus = document.getElementById("accountStatus");

  const accountCreated = document.getElementById("accountCreated");

  const userId = document.getElementById("userId");

  const accountRole = document.getElementById("accountRole");

  if (accountStatus) {
    accountStatus.textContent = formatStatus(status);
  }

  if (accountCreated) {
    accountCreated.textContent = formatDate(user.created_at);
  }

  if (userId) {
    userId.textContent = user.user_id || "-";
  }

  if (accountRole) {
    accountRole.textContent = formatRole(role);
  }

  updateAdminIdentity(name);

  updateProfileAvatar("profilePageAvatar", name, profilePicture);
}

function updateAdminIdentity(name) {
  const adminName = String(name || "Administrator").trim();

  const adminNameElement = document.getElementById("adminName");

  const sidebarUserName = document.getElementById("sidebarUserName");

  if (adminNameElement) {
    adminNameElement.textContent = adminName;
  }

  if (sidebarUserName) {
    sidebarUserName.textContent = adminName;
  }

  updateProfileAvatar(
    "profileAvatar",
    adminName,
    currentAdminProfile ? currentAdminProfile.profile_picture : "",
  );

  updateProfileAvatar(
    "sidebarAvatar",
    adminName,
    currentAdminProfile ? currentAdminProfile.profile_picture : "",
  );
}

function updateProfileAvatar(elementId, name, profilePicture) {
  const avatar = document.getElementById(elementId);

  if (!avatar) {
    return;
  }

  const initials = getInitials(name);

  avatar.innerHTML = "";

  if (profilePicture) {
    const image = document.createElement("img");

    image.src = "../" + profilePicture + "?v=" + Date.now();

    image.alt = "Admin profile picture";

    image.onload = function () {
      avatar.classList.add("has-profile-image");
    };

    image.onerror = function () {
      avatar.classList.remove("has-profile-image");

      avatar.textContent = initials;
    };

    avatar.appendChild(image);

    return;
  }

  avatar.classList.remove("has-profile-image");

  avatar.textContent = initials;
}

function setupProfileForm() {
  const form = document.getElementById("profileForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    clearValidationErrors();

    const name = document.getElementById("name").value.trim();

    const email = document.getElementById("email").value.trim();

    const phone = document.getElementById("phone").value.trim();

    if (!validateProfileForm(name, email, phone)) {
      return;
    }

    const saveButton = document.getElementById("saveProfileButton");

    if (saveButton) {
      saveButton.disabled = true;

      saveButton.textContent = "Saving...";
    }

    try {
      const response = await fetch("../php/update-profile.php", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name,
          email: email,
          phone: phone,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to update profile.");
      }

      currentAdminProfile = data.user;

      renderProfile(data.user);

      showProfileMessage(
        "Your profile has been updated successfully.",
        "success",
      );
    } catch (error) {
      console.error("Profile update error:", error);

      showProfileMessage(
        error.message || "Unable to update your profile.",
        "error",
      );
    } finally {
      if (saveButton) {
        saveButton.disabled = false;

        saveButton.textContent = "Save Changes";
      }
    }
  });
}

function validateProfileForm(name, email, phone) {
  let valid = true;

  if (!name) {
    setFieldError("nameError", "Please enter your full name.");

    valid = false;
  } else if (name.length > 100) {
    setFieldError("nameError", "Name must be 100 characters or fewer.");

    valid = false;
  }

  if (!email) {
    setFieldError("emailError", "Please enter your email address.");

    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError("emailError", "Please enter a valid email address.");

    valid = false;
  }

  if (!phone) {
    setFieldError("phoneError", "Please enter your phone number.");

    valid = false;
  } else if (!/^\d{10,15}$/.test(phone)) {
    setFieldError("phoneError", "Phone number must contain 10 to 15 digits.");

    valid = false;
  }

  return valid;
}

function setFieldError(elementId, message) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = message;
  }
}

function clearValidationErrors() {
  ["nameError", "emailError", "phoneError"].forEach(function (id) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = "";
    }
  });
}

function setupProfilePictureUpload() {
  const input = document.getElementById("profilePictureInput");

  if (!input) {
    return;
  }

  input.addEventListener("change", async function () {
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    if (file.size > 5 * 1024 * 1024) {
      showProfileMessage("Profile picture must be 5 MB or smaller.", "error");

      input.value = "";

      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      showProfileMessage("Please select a JPG, PNG or WEBP image.", "error");

      input.value = "";

      return;
    }

    const formData = new FormData();

    formData.append("profile_picture", file);

    const progress = document.getElementById("uploadProgress");

    if (progress) {
      progress.style.display = "block";

      progress.textContent = "Uploading photo...";
    }

    try {
      const response = await fetch("../php/upload-profile-picture.php", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to upload profile picture.");
      }

      if (currentAdminProfile) {
        currentAdminProfile.profile_picture = data.profile_picture;
      }

      const name = document.getElementById("name").value;

      updateProfileAvatar("profilePageAvatar", name, data.profile_picture);

      updateProfileAvatar("profileAvatar", name, data.profile_picture);

      updateProfileAvatar("sidebarAvatar", name, data.profile_picture);

      showProfileMessage("Profile picture updated successfully.", "success");
    } catch (error) {
      console.error("Profile picture upload error:", error);

      showProfileMessage(
        error.message || "Unable to upload profile picture.",
        "error",
      );
    } finally {
      if (progress) {
        progress.style.display = "none";
      }

      input.value = "";
    }
  });
}

function showProfileMessage(message, type) {
  const messageBox = document.getElementById("profileMessage");

  if (!messageBox) {
    return;
  }

  messageBox.textContent = message;

  messageBox.className = "profile-message " + type;

  messageBox.style.display = "block";

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  window.clearTimeout(showProfileMessage.timeout);

  showProfileMessage.timeout = window.setTimeout(function () {
    messageBox.style.display = "none";
  }, 5000);
}

function formatRole(role) {
  if (role === "admin") {
    return "Administrator";
  }

  if (!role) {
    return "Administrator";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatStatus(status) {
  if (!status) {
    return "Unknown";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(dateString) {
  if (!dateString) {
    return "Not available";
  }

  const date = new Date(String(dateString).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "AD";
  }

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
