document.addEventListener("DOMContentLoaded", function () {
  loadStaffProfileImage();
});

async function loadStaffProfileImage() {
  try {
    const authResponse = await fetch("../php/auth.php", {
      cache: "no-store",
    });

    if (!authResponse.ok) {
      return;
    }

    const authData = await authResponse.json();

    if (!authData.authenticated || authData.role !== "staff") {
      return;
    }

    const profileResponse = await fetch("../php/profile.php", {
      cache: "no-store",
    });

    if (!profileResponse.ok) {
      return;
    }

    const profileData = await profileResponse.json();

    if (!profileData.success || !profileData.user) {
      return;
    }

    const user = profileData.user;
    const name = user.name || authData.name || "Staff";
    const profilePicture = user.profile_picture || "";

    updateStaffNames(name);
    updateStaffAvatars(name, profilePicture);
  } catch (error) {
    console.error("Unable to load staff profile image:", error);
  }
}

function updateStaffNames(name) {
  const elements = [
    document.getElementById("staffName"),
    document.getElementById("sidebarUserName"),
    document.getElementById("staffProfileName"),
  ];

  elements.forEach(function (element) {
    if (element) {
      element.textContent = name;
    }
  });
}

function updateStaffAvatars(name, profilePicture) {
  const initials = getStaffInitials(name);

  const avatars = [
    document.getElementById("profileAvatar"),
    document.getElementById("sidebarAvatar"),
    document.getElementById("staffAvatar"),
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

      image.loading = "eager";

      image.decoding = "async";

      image.style.width = "100%";
      image.style.height = "100%";
      image.style.display = "block";
      image.style.objectFit = "cover";
      image.style.borderRadius = "50%";

      image.onerror = function () {
        avatar.innerHTML = "";
        avatar.textContent = initials;
      };

      avatar.appendChild(image);
    } else {
      avatar.textContent = initials;
    }
  });
}

function getStaffInitials(name) {
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
