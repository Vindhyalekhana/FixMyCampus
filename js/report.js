document.addEventListener("DOMContentLoaded", function () {
  initializeReportPage();
});

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

    updateStudentProfile(authData.name);

    await loadCategories();
    await loadLocations();

    document
      .getElementById("complaintForm")
      .addEventListener("submit", submitComplaint);
  } catch (error) {
    console.error("Report page initialization error:", error);
    window.location.href = "../login.html";
  }
}

function updateStudentProfile(name) {
  const studentName = name || "Student";

  const studentNameElement = document.getElementById("studentName");

  const sidebarUserName = document.getElementById("sidebarUserName");

  if (studentNameElement) {
    studentNameElement.textContent = studentName;
  }

  if (sidebarUserName) {
    sidebarUserName.textContent = studentName;
  }

  updateProfileAvatars(studentName);
}

function updateProfileAvatars(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  let initials = "ST";

  if (parts.length === 1) {
    initials = parts[0].substring(0, 2);
  } else if (parts.length > 1) {
    initials = parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
  }

  initials = initials.toUpperCase();

  const profileAvatar = document.getElementById("profileAvatar");

  const sidebarAvatar = document.getElementById("sidebarAvatar");

  if (profileAvatar) {
    profileAvatar.textContent = initials;
  }

  if (sidebarAvatar) {
    sidebarAvatar.textContent = initials;
  }
}

async function loadCategories() {
  const response = await fetch("../php/categories.php");

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message);
  }

  const select = document.getElementById("category");

  data.categories.forEach(function (category) {
    const option = document.createElement("option");

    option.value = category.category_id;

    option.textContent = category.category_name;

    select.appendChild(option);
  });
}

async function loadLocations() {
  const response = await fetch("../php/locations.php");

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message);
  }

  const select = document.getElementById("location");

  data.locations.forEach(function (location) {
    const option = document.createElement("option");

    option.value = location.location_id;

    option.textContent =
      location.building +
      " - " +
      (location.floor || "") +
      " - " +
      (location.room || "");

    select.appendChild(option);
  });
}

async function submitComplaint(event) {
  event.preventDefault();

  const form = event.target;

  const messageBox = document.getElementById("complaintMessage");

  messageBox.innerHTML = "";

  const categoryId = document.getElementById("category").value;

  const locationId = document.getElementById("location").value;

  const title = document.getElementById("title").value.trim();

  const description = document.getElementById("description").value.trim();

  const priority = document.getElementById("priority").value;

  if (!categoryId || !locationId || !title || !description) {
    messageBox.innerHTML =
      '<p class="form-error">' +
      "Please complete all required fields." +
      "</p>";

    return;
  }

  if (title.length < 5) {
    messageBox.innerHTML =
      '<p class="form-error">' +
      "Complaint title must be at least 5 characters." +
      "</p>";

    return;
  }

  if (description.length < 10) {
    messageBox.innerHTML =
      '<p class="form-error">' +
      "Please provide a more detailed description." +
      "</p>";

    return;
  }

  try {
    const response = await fetch("../php/create-complaint.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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

    if (data.success) {
      messageBox.innerHTML = '<p class="form-success">' + data.message + "</p>";

      form.reset();

      setTimeout(function () {
        window.location.href =
          "complaint-details.html?complaint_id=" +
          encodeURIComponent(data.complaint_id);
      }, 1200);
    } else {
      messageBox.innerHTML = '<p class="form-error">' + data.message + "</p>";
    }
  } catch (error) {
    console.error("Complaint submission error:", error);

    messageBox.innerHTML =
      '<p class="form-error">' + "Unable to submit the complaint." + "</p>";
  }
}
