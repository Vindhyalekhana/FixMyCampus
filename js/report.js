document.addEventListener("DOMContentLoaded", function () {
  initializeReportPage();
});

let csrfToken = "";

async function initializeReportPage() {
  try {
    const authResponse = await fetch("../php/auth.php", {
      cache: "no-store",
    });

    const authData = await authResponse.json();

    if (!authData.authenticated || authData.role !== "student") {
      window.location.href = "../login.html";
      return;
    }

    await loadCsrfToken();

    await loadStudentProfile();

    await loadCategories();
    await loadLocations();

    const complaintForm = document.getElementById("complaintForm");

    if (complaintForm) {
      complaintForm.addEventListener("submit", submitComplaint);
    }

    setupLogout();
  } catch (error) {
    console.error("Report page initialization error:", error);
  }
}

async function loadCsrfToken() {
  const response = await fetch("../php/csrf-token.php", {
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok || !data.success || !data.csrf_token) {
    throw new Error(data.message || "Unable to initialize security token.");
  }

  csrfToken = data.csrf_token;
}

async function loadStudentProfile() {
  try {
    const response = await fetch("../php/profile.php", {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || !data.success || !data.user) {
      throw new Error(data.message || "Unable to load student profile.");
    }

    renderStudentProfile(data.user);
  } catch (error) {
    console.error("Student profile loading error:", error);
  }
}

function renderStudentProfile(user) {
  const name = user.name || "Student";
  const profilePicture = user.profile_picture || "";

  const studentNameElement = document.getElementById("studentName");

  const sidebarUserName = document.getElementById("sidebarUserName");

  if (studentNameElement) {
    studentNameElement.textContent = name;
  }

  if (sidebarUserName) {
    sidebarUserName.textContent = name;
  }

  updateProfileAvatars(name, profilePicture);
}

function updateProfileAvatars(name, profilePicture) {
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

function setupLogout() {
  const logoutButton = document.getElementById("logoutButton");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", async function () {
    logoutButton.disabled = true;

    try {
      await fetch("../php/logout.php", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      window.location.href = "../login.html";
    }
  });
}

async function loadCategories() {
  const response = await fetch("../php/categories.php", {
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to load categories.");
  }

  const select = document.getElementById("category");

  if (!select) {
    throw new Error("Category field not found.");
  }

  select.innerHTML = '<option value="">Select a category</option>';

  data.categories.forEach(function (category) {
    const option = document.createElement("option");

    option.value = category.category_id;

    option.textContent = category.category_name;

    select.appendChild(option);
  });
}

async function loadLocations() {
  const response = await fetch("../php/locations.php", {
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to load locations.");
  }

  const select = document.getElementById("location");

  if (!select) {
    throw new Error("Location field not found.");
  }

  select.innerHTML = '<option value="">Select a location</option>';

  data.locations.forEach(function (location) {
    const option = document.createElement("option");

    option.value = location.location_id;

    const building = location.building || "";
    const floor = location.floor || "";
    const room = location.room || "";

    const parts = [building, floor, room].filter(function (value) {
      return value !== "";
    });

    option.textContent = parts.join(" - ");

    select.appendChild(option);
  });
}

async function submitComplaint(event) {
  event.preventDefault();

  const form = event.target;

  const messageBox = document.getElementById("complaintMessage");

  if (!messageBox) {
    return;
  }

  messageBox.innerHTML = "";

  const categoryId = document.getElementById("category").value;

  const locationId = document.getElementById("location").value;

  const title = document.getElementById("title").value.trim();

  const description = document.getElementById("description").value.trim();

  const priority = document.getElementById("priority").value;

  if (!categoryId || !locationId || !title || !description || !priority) {
    showFormError(messageBox, "Please complete all required fields.");

    return;
  }

  if (title.length < 5) {
    showFormError(messageBox, "Complaint title must be at least 5 characters.");

    return;
  }

  if (description.length < 10) {
    showFormError(messageBox, "Please provide a more detailed description.");

    return;
  }

  if (!csrfToken) {
    showFormError(
      messageBox,
      "Security token is unavailable. Please refresh the page.",
    );

    return;
  }

  const submitButton = document.getElementById("submitComplaintButton");

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";
  }

  try {
    const response = await fetch("../php/create-complaint.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
      },
      body: JSON.stringify({
        category_id: categoryId,
        location_id: locationId,
        title: title,
        description: description,
        priority: priority,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to submit the complaint.");
    }

    let successMessage = data.message || "Complaint submitted successfully.";

    if (data.assigned_staff) {
      successMessage +=
        "<br>Assigned staff: <strong>" +
        escapeHtml(data.assigned_staff) +
        "</strong>";
    }

    if (data.complaint_code) {
      successMessage +=
        "<br>Complaint ID: <strong>" +
        escapeHtml(data.complaint_code) +
        "</strong>";
    }

    messageBox.innerHTML = '<p class="form-success">' + successMessage + "</p>";

    form.reset();

    setTimeout(function () {
      if (data.complaint_id) {
        window.location.href =
          "complaint-details.html?id=" + encodeURIComponent(data.complaint_id);
      }
    }, 1800);
  } catch (error) {
    console.error("Complaint submission error:", error);

    showFormError(
      messageBox,
      error.message || "Unable to submit the complaint.",
    );

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Submit Complaint";
    }
  }
}

function showFormError(messageBox, message) {
  messageBox.innerHTML = "";

  const errorElement = document.createElement("p");

  errorElement.className = "form-error";

  errorElement.textContent = message;

  messageBox.appendChild(errorElement);
}

function escapeHtml(value) {
  const div = document.createElement("div");

  div.textContent = String(value ?? "");

  return div.innerHTML;
}
