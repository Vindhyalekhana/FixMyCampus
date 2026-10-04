document.addEventListener("DOMContentLoaded", function () {
  setupLogout();
  checkAuthentication();
  setupSettingsForms();
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
    showSettingsMessage("Unable to verify authentication.", "error");
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
  }
}

function renderProfile(user) {
  const name = user.name || "";
  
  const studentName = document.getElementById("studentName");
  const sidebarUserName = document.getElementById("sidebarUserName");
  
  if (studentName) studentName.textContent = name;
  if (sidebarUserName) sidebarUserName.textContent = name;
  
  const initials = getInitials(name);
  const avatars = [
    document.getElementById("profileAvatar"),
    document.getElementById("sidebarAvatar"),
  ];

  avatars.forEach(function (avatar) {
    if (!avatar) return;
    avatar.innerHTML = "";

    if (user.profile_picture) {
      const image = document.createElement("img");
      image.src = "../" + user.profile_picture + "?v=" + Date.now();
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
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function setupLogout() {
  const logoutButton = document.getElementById("logoutButton");
  if (!logoutButton) return;

  logoutButton.addEventListener("click", async function () {
    try {
      await fetch("../php/logout.php", { method: "POST" });
    } finally {
      window.location.href = "../login.html";
    }
  });
}

function showSettingsMessage(message, type) {
  const messageBox = document.getElementById("settingsMessage");
  if (!messageBox) return;

  messageBox.textContent = message;
  messageBox.className = "profile-message " + type;
  messageBox.style.display = "block";

  window.scrollTo({ top: 0, behavior: "smooth" });
  window.clearTimeout(showSettingsMessage.timeout);

  showSettingsMessage.timeout = window.setTimeout(function () {
    messageBox.style.display = "none";
  }, 5000);
}

function setupSettingsForms() {
  const showPasswordFormBtn = document.getElementById("showPasswordFormBtn");
  const passwordFormContainer = document.getElementById("passwordFormContainer");
  const cancelPasswordBtn = document.getElementById("cancelPasswordBtn");
  const passwordForm = document.getElementById("passwordForm");

  if (showPasswordFormBtn && passwordFormContainer) {
    showPasswordFormBtn.addEventListener("click", () => {
      passwordFormContainer.style.display = "block";
      showPasswordFormBtn.style.display = "none";
    });
    
    cancelPasswordBtn.addEventListener("click", () => {
      passwordFormContainer.style.display = "none";
      showPasswordFormBtn.style.display = "inline-block";
      passwordForm.reset();
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      
      const currentPassword = document.getElementById("currentPassword").value;
      const newPassword = document.getElementById("newPassword").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
      
      if (newPassword !== confirmPassword) {
        showSettingsMessage("New passwords do not match.", "error");
        return;
      }
      
      const submitBtn = passwordForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Saving...";
      submitBtn.disabled = true;
      
      try {
        const response = await fetch("../php/change-password.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword
          })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          showSettingsMessage(data.message, "success");
          passwordForm.reset();
          passwordFormContainer.style.display = "none";
          showPasswordFormBtn.style.display = "inline-block";
        } else {
          showSettingsMessage(data.message || "Failed to update password.", "error");
        }
      } catch (err) {
        showSettingsMessage("An error occurred. Please try again.", "error");
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  const showPrefsFormBtn = document.getElementById("showPrefsFormBtn");
  const notificationPrefsContainer = document.getElementById("notificationPrefsContainer");
  const cancelPrefsBtn = document.getElementById("cancelPrefsBtn");
  const notificationPrefsForm = document.getElementById("notificationPrefsForm");

  if (showPrefsFormBtn && notificationPrefsContainer) {
    showPrefsFormBtn.addEventListener("click", () => {
      notificationPrefsContainer.style.display = "block";
      showPrefsFormBtn.style.display = "none";
    });
    
    cancelPrefsBtn.addEventListener("click", () => {
      notificationPrefsContainer.style.display = "none";
      showPrefsFormBtn.style.display = "inline-block";
    });
  }

  if (notificationPrefsForm) {
    notificationPrefsForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const submitBtn = notificationPrefsForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Saving...";
      submitBtn.disabled = true;
      
      // Simulate API call for saving preferences
      setTimeout(() => {
        showSettingsMessage("Notification preferences saved.", "success");
        notificationPrefsContainer.style.display = "none";
        showPrefsFormBtn.style.display = "inline-block";
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }, 500);
    });
  }
}
