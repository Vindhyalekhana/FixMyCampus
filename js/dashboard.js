let csrfToken = "";

document.addEventListener("DOMContentLoaded", function () {
  initializeDashboard();
  setupNotifications();
  setupSearch();
  setupLogout();
});

async function initializeDashboard() {
  try {
    const authResponse = await fetch("../php/auth.php", {
      cache: "no-store",
    });

    if (!authResponse.ok) {
      throw new Error("Unable to verify authentication.");
    }

    const authData = await authResponse.json();

    if (!authData.authenticated || authData.role !== "student") {
      window.location.href = "../login.html";
      return;
    }

    updateStudentProfile(authData.name);

    await loadCsrfToken();
    await loadStudentComplaints();
    await loadNotifications();
  } catch (error) {
    console.error("Dashboard initialization error:", error);

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

function updateStudentProfile(name) {
  const studentName = name || "Student";

  const studentNameElement = document.getElementById("studentName");

  const sidebarUserName = document.getElementById("sidebarUserName");

  const welcomeName = document.getElementById("welcomeName");

  if (studentNameElement) {
    studentNameElement.textContent = studentName;
  }

  if (sidebarUserName) {
    sidebarUserName.textContent = studentName;
  }

  if (welcomeName) {
    welcomeName.textContent = studentName + "!";
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

async function loadStudentComplaints() {
  const tableBody = document.getElementById("complaintsTableBody");

  try {
    const response = await fetch("../php/student-complaints.php", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Unable to load complaints.");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Unable to load complaints.");
    }

    const complaints = Array.isArray(data.complaints) ? data.complaints : [];

    updateStatistics(complaints);
    renderComplaints(complaints);
  } catch (error) {
    console.error("Complaint loading error:", error);

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              Unable to load your complaints.
              Please refresh the page.
            </div>
          </td>
        </tr>
      `;
    }
  }
}

function updateStatistics(complaints) {
  const total = complaints.length;

  const active = complaints.filter(function (complaint) {
    return !["Resolved", "Closed", "Rejected", "Duplicate"].includes(
      complaint.status,
    );
  }).length;

  const resolved = complaints.filter(function (complaint) {
    return ["Resolved", "Closed"].includes(complaint.status);
  }).length;

  document.getElementById("totalComplaints").textContent = total;

  document.getElementById("activeComplaints").textContent = active;

  document.getElementById("resolvedComplaints").textContent = resolved;
}

function renderComplaints(complaints) {
  const tableBody = document.getElementById("complaintsTableBody");

  if (!tableBody) {
    return;
  }

  if (!complaints.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            You have not submitted any complaints yet.
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
            ${escapeHtml(complaint.complaint_code)}
          </td>

          <td>
            ${escapeHtml(complaint.title)}
          </td>

          <td>
            ${escapeHtml(complaint.category_name)}
          </td>

          <td>
            <span class="status ${getStatusClass(complaint.status)}">
              ${escapeHtml(complaint.status)}
            </span>
          </td>

          <td>
            ${escapeHtml(complaint.created_at)}
          </td>

          <td>
            <a
              href="complaint-details.html?complaint_id=${encodeURIComponent(
                complaint.complaint_id,
              )}"
              class="btn btn-secondary"
            >
              View
            </a>
          </td>
        </tr>
      `;
    })
    .join("");
}

function setupSearch() {
  const searchInput = document.getElementById("complaintSearch");

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", function () {
    const searchTerm = searchInput.value.trim().toLowerCase();

    const rows = document.querySelectorAll("#complaintsTableBody tr");

    rows.forEach(function (row) {
      const text = row.textContent.toLowerCase();

      row.style.display =
        !searchTerm || text.includes(searchTerm) ? "" : "none";
    });
  });
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

    const visible = notificationPanel.style.display !== "none";

    notificationPanel.style.display = visible ? "none" : "block";
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
    const response = await fetch("../php/notifications.php", {
      cache: "no-store",
    });

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
          "complaint-details.html?complaint_id=" +
          encodeURIComponent(complaintId);
      }
    });
  });
}

async function markNotificationRead(notificationId) {
  try {
    if (!csrfToken) {
      throw new Error("Security token is not available.");
    }

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
    if (!csrfToken) {
      throw new Error("Security token is not available.");
    }

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

function setupLogout() {
  const logoutButton = document.getElementById("logoutButton");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", logout);
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

function showDashboardError(message) {
  const tableBody = document.getElementById("complaintsTableBody");

  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            ${escapeHtml(message)}
          </div>
        </td>
      </tr>
    `;
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");

  div.textContent = value ?? "";

  return div.innerHTML;
}
