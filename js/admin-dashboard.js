let allComplaints = [];

document.addEventListener("DOMContentLoaded", function () {
  initializeAdminDashboard();
  setupNotifications();
  setupComplaintSearch();
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
    renderComplaints(allComplaints);
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

  const progress = complaints.filter(function (complaint) {
    return complaint.status === "In Progress";
  }).length;

  const resolved = complaints.filter(function (complaint) {
    return ["Resolved", "Closed"].includes(complaint.status);
  }).length;

  document.getElementById("totalComplaints").textContent = total;

  document.getElementById("pendingComplaints").textContent = pending;

  document.getElementById("progressComplaints").textContent = progress;

  document.getElementById("resolvedComplaints").textContent = resolved;
}

function renderComplaints(complaints) {
  const tableBody = document.getElementById("complaintsTableBody");

  if (!tableBody) {
    return;
  }

  if (complaints.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            No complaints found.
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
            <strong>
              ${escapeHtml(complaint.complaint_code)}
            </strong>
            <br>
            ${escapeHtml(complaint.title)}
          </td>

          <td>
            ${escapeHtml(complaint.student_name)}
          </td>

          <td>
            ${escapeHtml(complaint.category_name)}
          </td>

          <td>
            ${escapeHtml(complaint.priority)}
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
              href="complaint-details.html?id=${encodeURIComponent(
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

function setupComplaintSearch() {
  const searchInput = document.getElementById("complaintSearch");

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", function () {
    const searchTerm = searchInput.value.trim().toLowerCase();

    if (!searchTerm) {
      renderComplaints(allComplaints);
      return;
    }

    const filteredComplaints = allComplaints.filter(function (complaint) {
      const searchableText = [
        complaint.complaint_code,
        complaint.title,
        complaint.student_name,
        complaint.category_name,
        complaint.priority,
        complaint.status,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(searchTerm);
    });

    renderComplaints(filteredComplaints);
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
        <td colspan="7">
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
