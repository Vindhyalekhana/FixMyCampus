let allComplaints = [];
let csrfToken = "";

document.addEventListener("DOMContentLoaded", function () {
  initializeAdminDashboard();
  setupNotifications();
  setupComplaintSearch();
  setupStatusFilter();
});

async function initializeAdminDashboard() {
  try {
    const response = await fetch("../php/auth.php");

    if (!response.ok) {
      throw new Error("Unable to verify authentication.");
    }

    const data = await response.json();

    if (!data.authenticated || data.role !== "admin") {
      window.location.href = "../login.html";
      return;
    }

    updateAdminProfile(data.name);
    await loadCsrfToken();

    const logoutButton = document.getElementById("sidebarLogoutButton");

    if (logoutButton) {
      logoutButton.addEventListener("click", logout);
    }

    await loadAdminComplaints();
    await loadNotifications();
  } catch (error) {
    console.error("Admin dashboard initialization error:", error);

    showDashboardError(
      "Unable to load the dashboard. Please refresh the page.",
    );
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

function updateAdminProfile(name) {
  const adminName = document.getElementById("adminName");
  const sidebarUserName = document.getElementById("sidebarUserName");
  const welcomeMessage = document.getElementById("welcomeMessage");

  if (adminName) {
    adminName.textContent = name;
  }

  if (sidebarUserName) {
    sidebarUserName.textContent = name;
  }

  if (welcomeMessage) {
    welcomeMessage.textContent = "Welcome back, " + name + "!";
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

async function loadAdminComplaints() {
  try {
    const response = await fetch("../php/admin-complaints.php");

    if (!response.ok) {
      throw new Error("Unable to load complaints.");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Unable to load complaints.");
    }

    allComplaints = data.complaints || [];

    updateStatistics(allComplaints);
    updateAssignmentSummary(allComplaints);
    applyComplaintFilters();
  } catch (error) {
    console.error("Complaint loading error:", error);

    showDashboardError("Unable to load complaints.");
  }
}

function updateStatistics(complaints) {
  const total = complaints.length;

  const pending = complaints.filter(function (complaint) {
    return ["Submitted", "Under Review"].includes(complaint.status);
  }).length;

  const assigned = complaints.filter(function (complaint) {
    return complaint.status === "Assigned";
  }).length;

  const progress = complaints.filter(function (complaint) {
    return complaint.status === "In Progress";
  }).length;

  const resolved = complaints.filter(function (complaint) {
    return complaint.status === "Resolved";
  }).length;

  const closed = complaints.filter(function (complaint) {
    return complaint.status === "Closed";
  }).length;

  setElementText("totalComplaints", total);
  setElementText("pendingComplaints", pending);
  setElementText("assignedComplaints", assigned);
  setElementText("progressComplaints", progress);
  setElementText("resolvedComplaints", resolved);
  setElementText("closedComplaints", closed);
}

function updateAssignmentSummary(complaints) {
  const automatic = complaints.filter(function (complaint) {
    return complaint.assignment_type === "automatic";
  }).length;

  const unassigned = complaints.filter(function (complaint) {
    return !complaint.staff_id;
  }).length;

  setElementText("automaticAssignmentCount", automatic);
  setElementText("unassignedComplaintCount", unassigned);
}

function setupComplaintSearch() {
  const searchInput = document.getElementById("complaintSearch");

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", function () {
    applyComplaintFilters();
  });
}

function setupStatusFilter() {
  const statusFilter = document.getElementById("statusFilter");

  if (!statusFilter) {
    return;
  }

  statusFilter.addEventListener("change", function () {
    applyComplaintFilters();
  });
}

function applyComplaintFilters() {
  const searchInput = document.getElementById("complaintSearch");
  const statusFilter = document.getElementById("statusFilter");

  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

  const selectedStatus = statusFilter ? statusFilter.value : "all";

  const filteredComplaints = allComplaints.filter(function (complaint) {
    const searchableText = [
      complaint.complaint_code,
      complaint.title,
      complaint.student_name,
      complaint.category_name,
      complaint.priority,
      complaint.status,
      complaint.staff_name,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !searchTerm || searchableText.includes(searchTerm);

    const matchesStatus =
      selectedStatus === "all" || complaint.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  renderComplaints(filteredComplaints);

  setElementText("visibleComplaintCount", filteredComplaints.length);
}

function renderComplaints(complaints) {
  const tableBody = document.getElementById("complaintsTableBody");

  if (!tableBody) {
    return;
  }

  if (complaints.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="empty-state">
            No complaints match the current filters.
          </div>
        </td>
      </tr>
    `;

    return;
  }

  tableBody.innerHTML = complaints
    .map(function (complaint) {
      return `
        <tr>
          <td>
            <div class="complaint-primary">
              <strong>
                ${escapeHtml(complaint.complaint_code)}
              </strong>

              <span>
                ${escapeHtml(complaint.title)}
              </span>
            </div>
          </td>

          <td>
            <span class="table-primary-text">
              ${escapeHtml(complaint.student_name)}
            </span>
          </td>

          <td>
            ${escapeHtml(complaint.category_name)}
          </td>

          <td>
            <span class="priority-badge ${getPriorityClass(
              complaint.priority,
            )}">
              ${escapeHtml(complaint.priority)}
            </span>
          </td>

          <td>
            <span class="status ${getStatusClass(complaint.status)}">
              ${escapeHtml(complaint.status)}
            </span>
          </td>

          <td>
            ${renderStaffCell(complaint)}
          </td>

          <td>
            ${renderAssignmentCell(complaint)}
          </td>

          <td>
            <span class="table-date">
              ${formatDate(complaint.created_at)}
            </span>
          </td>

          <td>
            <a
              href="complaint-details.html?id=${encodeURIComponent(
                complaint.complaint_id,
              )}"
              class="btn btn-secondary admin-view-button"
            >
              View
            </a>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderStaffCell(complaint) {
  if (!complaint.staff_id || !complaint.staff_name) {
    return `
      <div class="staff-cell staff-cell-empty">
        <span class="staff-status-dot"></span>
        <span>Not assigned</span>
      </div>
    `;
  }

  return `
    <div class="staff-cell">
      <span class="staff-status-dot assigned"></span>

      <div>
        <strong>
          ${escapeHtml(complaint.staff_name)}
        </strong>

        <span>
          Staff
        </span>
      </div>
    </div>
  `;
}

function renderAssignmentCell(complaint) {
  if (!complaint.staff_id) {
    return `
      <span class="assignment-badge assignment-unassigned">
        Unassigned
      </span>
    `;
  }

  if (complaint.assignment_type === "automatic") {
    return `
      <span class="assignment-badge assignment-automatic">
        Automatic
      </span>
    `;
  }

  return `
    <span class="assignment-badge assignment-existing">
      Existing
    </span>
  `;
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

function getPriorityClass(priority) {
  const classes = {
    Low: "priority-low",
    Medium: "priority-medium",
    High: "priority-high",
  };

  return classes[priority] || "";
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
        "X-CSRF-TOKEN": csrfToken,
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
      headers: {
        "X-CSRF-TOKEN": csrfToken,
      },
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
    return "—";
  }

  const date = new Date(dateString.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString();
}

function setElementText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function showDashboardError(message) {
  const tableBody = document.getElementById("complaintsTableBody");

  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="empty-state">
            ${escapeHtml(message)}
          </div>
        </td>
      </tr>
    `;
  }
}

async function logout() {
  try {
    await fetch("../php/logout.php", {
      method: "POST",
      headers: {
        "X-CSRF-TOKEN": csrfToken,
      },
    });
  } finally {
    window.location.href = "../login.html";
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");

  div.textContent = value ?? "";

  return div.innerHTML;
}
