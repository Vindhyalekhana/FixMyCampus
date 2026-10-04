document.addEventListener("DOMContentLoaded", function () {
  loadDashboardProfile();
});

async function loadDashboardProfile() {
  try {
    const response = await fetch("../php/profile.php", {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || !data.success || !data.user) {
      return;
    }

    updateDashboardProfile(data.user);
  } catch (error) {
    console.error("Dashboard profile loading error:", error);
  }
}

function updateDashboardProfile(user) {
  const name = user.name || "Student";
  const profilePicture = user.profile_picture || "";

  const studentName = document.getElementById("studentName");
  const sidebarUserName = document.getElementById("sidebarUserName");

  if (studentName) {
    studentName.textContent = name;
  }

  if (sidebarUserName) {
    sidebarUserName.textContent = name;
  }

  updateDashboardAvatars(name, profilePicture);
}

function updateDashboardAvatars(name, profilePicture) {
  const initials = getInitials(name);

  const avatars = [
    document.getElementById("profileAvatar"),
    document.getElementById("sidebarAvatar"),
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

      image.onload = function () {
        avatar.classList.add("has-profile-image");
      };

      image.onerror = function () {
        avatar.classList.remove("has-profile-image");
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
