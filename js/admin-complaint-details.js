let currentComplaintId = null;

document.addEventListener("DOMContentLoaded", function () {
  setupNotifications();
  initializeAdminComplaintDetails();
});

async function initializeAdminComplaintDetails() {
  try {
    const authResponse = await fetch("../php/auth.php");

    if (!authResponse.ok) {
      throw new Error("Unable to verify authentication.");
    }

    const authData = await authResponse.json();

    if (!authData.authenticated || authData.role !== "admin") {
      window.location.href = "../login.html";
      return;
    }

    updateAdminProfile(authData.name);

    const logoutButton = document.getElementById("sidebarLogoutButton");

    if (logoutButton) {
      logoutButton.addEventListener("click", logout);
    }

    const params = new URLSearchParams(window.location.search);

    currentComplaintId = params.get("id");

    if (!currentComplaintId) {
      showError("No complaint was specified.");
      return;
    }

    await loadStaff();
    await loadComplaint(currentComplaintId);

    document
      .getElementById("assignButton")
      .addEventListener("click", function () {
        assignStaff(currentComplaintId);
      });
  } catch (error) {
    console.error("Admin complaint details error:", error);

    showError("Unable to load complaint details.");
  }
}

function updateAdminProfile(name) {
  const adminName = document.getElementById("adminName");

  const sidebarUserName = document.getElementById("sidebarUserName");

  if (adminName) {
    adminName.textContent = name;
  }

  if (sidebarUserName) {
    sidebarUserName.textContent = name;
  }

  updateProfileAvatars(name);
}

function updateProfileAvatars(name) {
  if (!name) {
    return;
  }

  const initials = name
    .trim()
    .split(/\s+/)
    .map(function (part) {
      return part.charAt(0);
    })
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const profileAvatar = document.getElementById("profileAvatar");

  const sidebarAvatar = document.getElementById("sidebarAvatar");

  if (profileAvatar) {
    profileAvatar.textContent = initials;
  }

  if (sidebarAvatar) {
    sidebarAvatar.textContent = initials;
  }
}

async function loadStaff() {
  const response = await fetch("../php/staff-list.php");

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to load staff.");
  }

  const select = document.getElementById("staff");

  select.innerHTML = `
    <option value="">
      Select staff member
    </option>
  `;

  data.staff.forEach(function (staff) {
    const option = document.createElement("option");

    option.value = staff.user_id;

    option.textContent = staff.name + " (" + staff.email + ")";

    select.appendChild(option);
  });
}

async function loadComplaint(complaintId) {
  const response = await fetch(
    "../php/admin-complaint-details.php?id=" + encodeURIComponent(complaintId),
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    showError(data.message || "Complaint not found.");

    return;
  }

  renderComplaint(data.complaint);

  renderTimeline(data.updates || []);

  renderAssignment(data.assignment);

  document.getElementById("loadingMessage").style.display = "none";

  document.getElementById("complaintContent").style.display = "flex";
}

function renderComplaint(complaint) {
  document.getElementById("complaintCode").textContent =
    complaint.complaint_code;

  document.getElementById("complaintTitle").textContent = complaint.title;

  document.getElementById("studentName").textContent = complaint.student_name;

  document.getElementById("studentEmail").textContent = complaint.student_email;

  document.getElementById("studentPhone").textContent =
    complaint.student_phone || "Not available";

  document.getElementById("category").textContent = complaint.category_name;

  const locationParts = [
    complaint.building,
    complaint.floor,
    complaint.room,
  ].filter(Boolean);

  document.getElementById("location").textContent = locationParts.length
    ? locationParts.join(", ")
    : "Not specified";

  document.getElementById("priority").textContent = complaint.priority;

  const statusElement = document.getElementById("status");

  statusElement.textContent = complaint.status;

  statusElement.className = "status " + getStatusClass(complaint.status);

  document.getElementById("createdAt").textContent = formatDate(
    complaint.created_at,
  );

  document.getElementById("resolvedAt").textContent = complaint.resolved_at
    ? formatDate(complaint.resolved_at)
    : "Not yet repaired";

  document.getElementById("closedAt").textContent = complaint.closed_at
    ? formatDate(complaint.closed_at)
    : "Not closed";

  document.getElementById("description").textContent = complaint.description;
}

function renderAssignment(assignment) {
  const select = document.getElementById("staff");

  const currentAssignment = document.getElementById("currentAssignment");

  if (!assignment) {
    select.value = "";

    currentAssignment.textContent = "No staff member is currently assigned.";

    return;
  }

  select.value = assignment.staff_id;

  currentAssignment.textContent =
    "Currently assigned to: " + getAssignmentName(assignment);
}

function getAssignmentName(assignment) {
  if (assignment.staff_name) {
    return assignment.staff_name;
  }

  if (assignment.name) {
    return assignment.name;
  }

  return "Selected staff member";
}

function renderTimeline(updates) {
  const timeline = document.getElementById("timeline");

  timeline.innerHTML = "";

  if (!updates.length) {
    timeline.innerHTML = `
      <div class="empty-state">
        No tracking updates available.
      </div>
    `;

    return;
  }

  updates.forEach(function (update) {
    const item = document.createElement("div");

    item.className = "timeline-item";

    const dot = document.createElement("div");

    dot.className = "timeline-dot";

    const status = document.createElement("div");

    status.className = "timeline-status";

    status.textContent = update.new_status;

    const date = document.createElement("div");

    date.className = "timeline-date";

    date.textContent = formatDate(update.updated_at);

    const updatedBy = document.createElement("div");

    updatedBy.className = "timeline-date";

    updatedBy.textContent =
      "Updated by: " + (update.updated_by_name || "System");

    const remarks = document.createElement("div");

    remarks.className = "timeline-remarks";

    remarks.textContent = update.remarks || "Status updated.";

    item.appendChild(dot);
    item.appendChild(status);
    item.appendChild(date);
    item.appendChild(updatedBy);
    item.appendChild(remarks);

    timeline.appendChild(item);
  });
}

async function assignStaff(complaintId) {
  const staffId = document.getElementById("staff").value;

  const messageBox = document.getElementById("assignmentMessage");

  const assignButton = document.getElementById("assignButton");

  messageBox.style.display = "none";
  messageBox.textContent = "";

  if (!staffId) {
    showAssignmentMessage("Please select a staff member.", "error");

    return;
  }

  assignButton.disabled = true;
  assignButton.textContent = "Assigning...";

  try {
    const response = await fetch("../php/assign-staff.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        complaint_id: complaintId,
        staff_id: staffId,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to assign staff.");
    }

    showAssignmentMessage(
      data.message || "Complaint assigned successfully.",
      "success",
    );

    await loadComplaint(complaintId);
  } catch (error) {
    console.error("Staff assignment error:", error);

    showAssignmentMessage(error.message || "Unable to assign staff.", "error");
  } finally {
    assignButton.disabled = false;
    assignButton.textContent = "Assign Complaint";
  }
}

function showAssignmentMessage(message, type) {
  const messageBox = document.getElementById("assignmentMessage");

  messageBox.textContent = message;

  messageBox.style.display = "block";

  messageBox.className =
    type === "success" ? "success-message" : "error-message";
}

function getStatusClass(status) {
  const classes = {
    Submitted: "status-submitted",

    "Under Review": "status-review",

    Assigned: "status-assigned",

    "In Progress": "status-progress",

    Resolved: "status-resolved",

    Closed: "status-closed",

    Rejected: "status-rejected",

    Duplicate: "status-duplicate",
  };

  return classes[status] || "";
}

function setupNotifications() {
  const notificationButton = document.getElementById("notificationButton");

  const markAllReadButton = document.getElementById("markAllReadButton");

  const notificationPanel = document.getElementById("notificationPanel");

  if (!notificationButton || !notificationPanel) {
    return;
  }

  notificationButton.addEventListener("click", function (event) {
    event.stopPropagation();

    const isVisible = notificationPanel.style.display !== "none";

    notificationPanel.style.display = isVisible ? "none" : "block";
  });

  if (markAllReadButton) {
    markAllReadButton.addEventListener("click", async function () {
      await markAllNotificationsRead();
    });
  }

  document.addEventListener("click", function (event) {
    const wrapper = document.querySelector(".notification-wrapper");

    if (wrapper && !wrapper.contains(event.target)) {
      notificationPanel.style.display = "none";
    }
  });
}

async function loadNotifications() {
  try {
    const response = await fetch("../php/notifications.php");

    if (!response.ok) {
      throw new Error("Unable to load notifications.");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Unable to load notifications.");
    }

    updateNotificationBadge(data.unread_count);

    renderNotifications(data.notifications);
  } catch (error) {
    console.error("Notification loading error:", error);

    const notificationList = document.getElementById("notificationList");

    if (notificationList) {
      notificationList.innerHTML = `
        <div class="notification-empty">
          Unable to load notifications.
        </div>
      `;
    }
  }
}

function updateNotificationBadge(unreadCount) {
  const badge = document.getElementById("notificationBadge");

  if (!badge) {
    return;
  }

  const count = Number(unreadCount) || 0;

  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : count;

    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

function renderNotifications(notifications) {
  const notificationList = document.getElementById("notificationList");

  if (!notificationList) {
    return;
  }

  if (!notifications || notifications.length === 0) {
    notificationList.innerHTML = `
      <div class="notification-empty">
        No notifications.
      </div>
    `;

    return;
  }

  notificationList.innerHTML = notifications
    .map(function (notification) {
      const unreadClass =
        Number(notification.is_read) === 0 ? "notification-unread" : "";

      return `
          <button
            type="button"
            class="notification-item ${unreadClass}"
            data-notification-id="${notification.notification_id}"
            data-complaint-id="${notification.complaint_id || ""}"
          >
            <div class="notification-message">
              ${escapeHtml(notification.message)}
            </div>

            <div class="notification-time">
              ${formatNotificationDate(notification.created_at)}
            </div>
          </button>
        `;
    })
    .join("");

  document.querySelectorAll(".notification-item").forEach(function (item) {
    item.addEventListener("click", async function () {
      const notificationId = item.dataset.notificationId;

      const complaintId = item.dataset.complaintId;

      await markNotificationRead(notificationId);

      if (complaintId) {
        window.location.href =
          "complaint-details.html?id=" + encodeURIComponent(complaintId);
      }
    });
  });
}

async function markNotificationRead(notificationId) {
  try {
    const response = await fetch("../php/mark-notification-read.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notification_id: Number(notificationId),
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to mark notification as read.");
    }

    await loadNotifications();
  } catch (error) {
    console.error("Mark notification read error:", error);
  }
}

async function markAllNotificationsRead() {
  try {
    const response = await fetch("../php/mark-all-notifications-read.php", {
      method: "POST",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to mark notifications as read.");
    }

    await loadNotifications();
  } catch (error) {
    console.error("Mark all notifications read error:", error);
  }
}

function formatNotificationDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString();
}

function formatDate(dateString) {
  if (!dateString) {
    return "Not available";
  }

  const date = new Date(dateString.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function logout() {
  try {
    await fetch("../php/logout.php", {
      method: "POST",
    });
  } finally {
    window.location.href = "../login.html";
  }
}

function showError(message) {
  const loadingMessage = document.getElementById("loadingMessage");

  const errorBox = document.getElementById("errorMessage");

  if (loadingMessage) {
    loadingMessage.style.display = "none";
  }

  if (errorBox) {
    errorBox.textContent = message;

    errorBox.style.display = "block";
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");

  div.textContent = value ?? "";

  return div.innerHTML;
}
