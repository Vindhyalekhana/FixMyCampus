document.addEventListener("DOMContentLoaded", function () {
  setupLogout();
  setupProfileForm();
  setupProfilePictureUpload();
  checkAuthentication();
});

async function checkAuthentication() {
  try {
    const response = await fetch("../php/auth.php", {
      cache: "no-store",
    });

    const data = await response.json();

    if (!data.authenticated || data.role !== "student") {
      window.location.href = "../login.html";
      return;
    }

    await loadProfile();
  } catch (error) {
    console.error("Authentication error:", error);

    showProfileMessage(
      "Unable to verify authentication. Please refresh the page.",
      "error",
    );
  }
}

async function loadProfile() {
  try {
    const response = await fetch("../php/profile.php", {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load profile.");
    }

    renderProfile(data.user);
  } catch (error) {
    console.error("Profile loading error:", error);

    showProfileMessage(
      error.message || "Unable to load your profile.",
      "error",
    );
  }
}

function renderProfile(user) {
  const name = user.name || "";
  const email = user.email || "";
  const phone = user.phone || "";
  const role = user.role || "student";

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

  const studentName = document.getElementById("studentName");
  const sidebarUserName = document.getElementById("sidebarUserName");
  const photoName = document.getElementById("photoName");

  if (studentName) {
    studentName.textContent = name;
  }

  if (sidebarUserName) {
    sidebarUserName.textContent = name;
  }

  if (photoName) {
    photoName.textContent = name;
  }

  const roleInput = document.getElementById("role");
  const accountRole = document.getElementById("accountRole");

  if (roleInput) {
    roleInput.value = formatRole(role);
  }

  if (accountRole) {
    accountRole.textContent = formatRole(role);
  }

  const accountStatus = document.getElementById("accountStatus");

  if (accountStatus) {
    accountStatus.textContent = formatStatus(user.status);
  }

  const accountCreated = document.getElementById("accountCreated");

  if (accountCreated) {
    accountCreated.textContent = formatDate(user.created_at);
  }

  const userId = document.getElementById("userId");

  if (userId) {
    userId.textContent = "#" + user.user_id;
  }

  updateProfileAvatars(name, user.profile_picture);
}

function updateProfileAvatars(name, profilePicture) {
  const initials = getInitials(name);

  const avatars = [
    document.getElementById("profileAvatar"),
    document.getElementById("sidebarAvatar"),
    document.getElementById("largeProfileAvatar"),
  ];

  avatars.forEach(function (avatar) {
    if (!avatar) {
      return;
    }

    avatar.innerHTML = "";

    if (profilePicture) {
      const image = document.createElement("img");

      image.src = "../" + profilePicture + "?v=" + Date.now();
      image.alt = "Profile picture";
      image.onerror = function () {
        avatar.textContent = initials;
      };

      avatar.appendChild(image);
    } else {
      avatar.textContent = initials;
    }
  });
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
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to upload profile picture.");
      }

      updateProfileAvatars(
        document.getElementById("name").value,
        data.profile_picture,
      );

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
  if (!role) {
    return "Student";
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

  const date = new Date(dateString.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
