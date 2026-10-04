let complaintId = null;
let csrfToken = "";

document.addEventListener("DOMContentLoaded", function () {
  initializeComplaintDetails();
  setupNotifications();
  setupSidebarNotifications();
});

async function initializeComplaintDetails() {
  try {
    const authResponse = await fetch("../php/auth.php", {
      cache: "no-store",
    });

    if (!authResponse.ok) {
      throw new Error("Authentication request failed.");
    }

    const authData = await authResponse.json();

    if (!authData.authenticated || authData.role !== "staff") {
      window.location.href = "../login.html";
      return;
    }

    await loadCsrfToken();

    complaintId = new URLSearchParams(window.location.search).get("id");

    if (!complaintId || !/^\d+$/.test(complaintId)) {
      showError("Invalid complaint ID.");
      return;
    }

    updateStaffProfile(authData.name);

    setupLogout();

    await loadComplaint(complaintId);
    await loadNotifications();
  } catch (error) {
    console.error("Complaint details initialization error:", error);

    showError("Unable to load complaint details. Please refresh the page.");
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

function updateStaffProfile(name) {
  const staffName = document.getElementById("staffName");
  const sidebarUserName = document.getElementById("sidebarUserName");

  if (staffName) {
    staffName.textContent = name;
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

async function loadComplaint(id) {
  try {
    const response = await fetch(
      "../php/staff-complaint-details.php?id=" + encodeURIComponent(id),
      {
        cache: "no-store",
      },
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      showError(data.message || "Complaint could not be found.");

      return;
    }

    if (!data.complaint) {
      showError("Complaint data was not returned.");

      return;
    }

    renderComplaint(data.complaint);

    renderTimeline(Array.isArray(data.updates) ? data.updates : []);

    setupStatusOptions(data.complaint.status);

    setupChatButton(data.complaint);

    const loadingMessage = document.getElementById("loadingMessage");
    const complaintContent = document.getElementById("complaintContent");

    if (loadingMessage) {
      loadingMessage.style.display = "none";
    }

    if (complaintContent) {
      complaintContent.style.display = "flex";
    }
  } catch (error) {
    console.error("Complaint loading error:", error);

    showError("Unable to load complaint details.");
  }
}

function renderComplaint(complaint) {
  setText("complaintCode", complaint.complaint_code);

  setText("complaintCodeDisplay", complaint.complaint_code);

  setText("complaintTitle", complaint.title);

  setText("category", complaint.category_name);

  setText("priority", complaint.priority);

  const locationParts = [
    complaint.building,
    complaint.floor,
    complaint.room,
  ].filter(Boolean);

  setText("location", locationParts.join(", ") || "Not available");

  setText("createdAt", formatDate(complaint.created_at));

  setText("updatedAt", formatDate(complaint.updated_at));

  setText(
    "resolvedAt",
    complaint.resolved_at
      ? formatDate(complaint.resolved_at)
      : "Not yet repaired",
  );

  setText(
    "closedAt",
    complaint.closed_at ? formatDate(complaint.closed_at) : "Not closed",
  );

  setText("description", complaint.description);

  setText("studentName", complaint.student_name);

  setText("studentEmail", complaint.student_email);

  renderStatus(complaint.status);
}

function renderStatus(status) {
  const statusDisplay = document.getElementById("statusDisplay");

  if (!statusDisplay) {
    return;
  }

  statusDisplay.innerHTML = "";

  const statusElement = document.createElement("span");

  statusElement.className = "status " + getStatusClass(status);

  statusElement.textContent = status;

  statusDisplay.appendChild(statusElement);
}

function setupChatButton(complaint) {
  const chatButton = document.getElementById("chatButton");

  if (!chatButton) {
    return;
  }

  if (!complaint.complaint_id) {
    chatButton.style.display = "none";
    return;
  }

  chatButton.href =
    "chat.html?complaint_id=" + encodeURIComponent(complaint.complaint_id);

  chatButton.style.display = "inline-flex";
}

function setupStatusOptions(currentStatus) {
  const statusSelect = document.getElementById("status");

  const updateCard = document.getElementById("updateCard");

  if (!statusSelect || !updateCard) {
    return;
  }

  statusSelect.innerHTML = "";

  let nextStatus = null;

  if (currentStatus === "Assigned") {
    nextStatus = "In Progress";
  } else if (currentStatus === "In Progress") {
    nextStatus = "Resolved";
  }

  if (!nextStatus) {
    updateCard.style.display = "none";
    return;
  }

  updateCard.style.display = "block";

  const option = document.createElement("option");

  option.value = nextStatus;
  option.textContent = nextStatus;

  statusSelect.appendChild(option);
}

async function updateComplaintStatus(event) {
  event.preventDefault();

  const statusSelect = document.getElementById("status");

  const remarksInput = document.getElementById("remarks");

  const updateButton = document.getElementById("updateButton");

  const updateMessage = document.getElementById("updateMessage");

  if (!statusSelect || !remarksInput || !updateButton || !updateMessage) {
    return;
  }

  const status = statusSelect.value;

  const remarks = remarksInput.value.trim();

  if (!remarks) {
    updateMessage.textContent = "Please enter remarks before updating.";

    return;
  }

  if (!csrfToken) {
    updateMessage.textContent =
      "Security token is unavailable. Please refresh the page.";

    return;
  }

  updateButton.disabled = true;

  updateMessage.textContent = "Updating complaint...";

  try {
    const response = await fetch("../php/update-status.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
      },
      body: JSON.stringify({
        complaint_id: complaintId,
        status: status,
        remarks: remarks,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to update complaint.");
    }

    updateMessage.textContent = "Complaint updated successfully.";

    remarksInput.value = "";

    await loadComplaint(complaintId);
    await loadNotifications();
  } catch (error) {
    console.error("Complaint status update error:", error);

    updateMessage.textContent = error.message;
  } finally {
    updateButton.disabled = false;
  }
}

function renderTimeline(updates) {
  const timeline = document.getElementById("timeline");

  if (!timeline) {
    return;
  }

  timeline.innerHTML = "";

  if (!updates || updates.length === 0) {
    timeline.innerHTML =
      '<p class="timeline-empty">No tracking updates available.</p>';

    return;
  }

  updates.forEach(function (update) {
    const item = document.createElement("div");

    item.className = "timeline-item";

    const dot = document.createElement("div");

    dot.className = "timeline-dot";

    const content = document.createElement("div");

    content.className = "timeline-content";

    const status = document.createElement("strong");

    status.className = "timeline-status";

    status.textContent = update.new_status || update.old_status || "Update";

    const remarks = document.createElement("p");

    remarks.className = "timeline-remarks";

    remarks.textContent = update.remarks || "Status updated.";

    const meta = document.createElement("small");

    meta.className = "timeline-meta";

    meta.textContent =
      "Updated by " +
      (update.updated_by_name || "System") +
      " on " +
      formatDate(update.updated_at);

    content.appendChild(status);
    content.appendChild(remarks);
    content.appendChild(meta);

    item.appendChild(dot);
    item.appendChild(content);

    timeline.appendChild(item);
  });
}

function setupNotifications() {
  const notificationButton = document.getElementById("notificationButton");

  const notificationPanel = document.getElementById("notificationPanel");

  const markAllReadButton = document.getElementById("markAllReadButton");

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

function setupSidebarNotifications() {
  const sidebarButton = document.getElementById("sidebarNotificationButton");

  const notificationButton = document.getElementById("notificationButton");

  const notificationPanel = document.getElementById("notificationPanel");

  if (!sidebarButton || !notificationButton || !notificationPanel) {
    return;
  }

  sidebarButton.addEventListener("click", function () {
    notificationPanel.style.display = "block";

    notificationButton.focus();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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
      notificationList.innerHTML =
        '<div class="notification-empty">Unable to load notifications.</div>';
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
    notificationList.innerHTML =
      '<div class="notification-empty">No notifications.</div>';

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

      const relatedComplaintId = item.dataset.complaintId;

      await markNotificationRead(notificationId);

      if (relatedComplaintId) {
        window.location.href =
          "complaint-details.html?id=" + encodeURIComponent(relatedComplaintId);
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

function setText(elementId, value) {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  element.textContent = value ?? "-";
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

function escapeHtml(value) {
  const div = document.createElement("div");

  div.textContent = value ?? "";

  return div.innerHTML;
}

function showError(message) {
  const loadingMessage = document.getElementById("loadingMessage");

  const errorMessage = document.getElementById("errorMessage");

  const complaintContent = document.getElementById("complaintContent");

  if (loadingMessage) {
    loadingMessage.style.display = "none";
  }

  if (complaintContent) {
    complaintContent.style.display = "none";
  }

  if (errorMessage) {
    errorMessage.textContent = message;

    errorMessage.style.display = "block";
  }
}

document.addEventListener("submit", function (event) {
  if (event.target.id === "statusForm") {
    updateComplaintStatus(event);
  }
});
