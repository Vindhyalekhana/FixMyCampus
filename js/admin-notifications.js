let allNotifications = [];
let csrfToken = "";

document.addEventListener("DOMContentLoaded", function () {
  initializeAdminNotifications();
});

async function initializeAdminNotifications() {
  const authenticated = await checkAdminAuthentication();

  if (!authenticated) {
    return;
  }

  try {
    await loadCsrfToken();
  } catch (error) {
    console.error("CSRF token initialization failed:", error);
    return;
  }

  setupSidebarLogout();
  setupNotificationPanel();
  setupSearch();
  setupMarkAllButtons();

  await loadAdminNotifications();
}

async function loadCsrfToken() {
  const response = await fetch("../php/csrf-token.php", {
    credentials: "same-origin",
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok || !data.success || !data.csrf_token) {
    throw new Error(data.message || "Unable to initialize security token.");
  }

  csrfToken = data.csrf_token;
}

async function checkAdminAuthentication() {
  try {
    const response = await fetch("../php/auth.php", {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Authentication request failed.");
    }

    const data = await response.json();

    if (!data.authenticated) {
      window.location.href = "../login.html";
      return false;
    }

    if (data.role !== "admin") {
      redirectByRole(data.role);
      return false;
    }

    updateAdminIdentity(data.name);

    return true;
  } catch (error) {
    console.error("Authentication check failed:", error);

    window.location.href = "../login.html";

    return false;
  }
}

function redirectByRole(role) {
  if (role === "student") {
    window.location.href = "../student/dashboard.html";
    return;
  }

  if (role === "staff") {
    window.location.href = "../staff/dashboard.html";
    return;
  }

  window.location.href = "../login.html";
}

function updateAdminIdentity(name) {
  const adminName = String(name || "Admin").trim();

  const adminNameElement = document.getElementById("adminName");
  const sidebarUserName = document.getElementById("sidebarUserName");

  if (adminNameElement) {
    adminNameElement.textContent = adminName;
  }

  if (sidebarUserName) {
    sidebarUserName.textContent = adminName;
  }

  const initials = getInitials(adminName);

  const profileAvatar = document.getElementById("profileAvatar");
  const sidebarAvatar = document.getElementById("sidebarAvatar");

  if (profileAvatar) {
    profileAvatar.textContent = initials;
  }

  if (sidebarAvatar) {
    sidebarAvatar.textContent = initials;
  }
}

async function loadAdminNotifications() {
  try {
    const response = await fetch("../php/notifications.php", {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Unable to load notifications.");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Unable to load notifications.");
    }

    allNotifications = Array.isArray(data.notifications)
      ? data.notifications
      : [];

    renderSummary(data.unread_count);
    renderNotifications(allNotifications);
    renderHeaderNotifications(allNotifications);
  } catch (error) {
    console.error("Notification loading error:", error);

    showNotificationError(
      "Unable to load notifications. Please refresh the page.",
    );
  }
}

function renderSummary(unreadCount) {
  const totalElement = document.getElementById("totalNotificationCount");

  const unreadElement = document.getElementById("unreadNotificationCount");

  const statusElement = document.getElementById("notificationListStatus");

  const total = allNotifications.length;
  const unread = Number(unreadCount) || 0;

  if (totalElement) {
    totalElement.textContent = total;
  }

  if (unreadElement) {
    unreadElement.textContent = unread;
  }

  if (statusElement) {
    statusElement.textContent =
      total === 1 ? "1 notification" : `${total} notifications`;
  }

  updateNotificationBadge(unread);
}

function renderNotifications(notifications) {
  const notificationList = document.getElementById("adminNotificationList");

  if (!notificationList) {
    return;
  }

  if (!notifications.length) {
    notificationList.innerHTML = `
      <div class="notification-empty-state">
        <div class="notification-empty-icon">âœ“</div>

        <h3 class="notification-empty-title">
          You're all caught up
        </h3>

        <p class="notification-empty-text">
          There are no notifications to display.
        </p>
      </div>
    `;

    return;
  }

  notificationList.innerHTML = notifications
    .map(function (notification) {
      const unread = Number(notification.is_read) === 0;

      const complaintId = notification.complaint_id
        ? Number(notification.complaint_id)
        : "";

      const complaintCode = notification.complaint_code
        ? `
            <span class="admin-notification-complaint">
              ${escapeHtml(notification.complaint_code)}
            </span>
          `
        : "";

      const readLabel = unread
        ? ""
        : `
            <span class="notification-read-label">
              Read
            </span>
          `;

      return `
        <button
          type="button"
          class="admin-notification-item ${unread ? "unread" : ""}"
          data-notification-id="${Number(notification.notification_id)}"
          data-complaint-id="${complaintId}"
        >
          <span class="notification-indicator"></span>

          <span class="admin-notification-content">
            <span class="admin-notification-message">
              ${escapeHtml(notification.message || "")}
            </span>

            <span class="admin-notification-meta">
              <span class="admin-notification-time">
                ${formatNotificationDate(notification.created_at)}
              </span>

              ${complaintCode}

              ${readLabel}
            </span>
          </span>
        </button>
      `;
    })
    .join("");

  setupNotificationItemHandlers();
}

function setupNotificationItemHandlers() {
  const items = document.querySelectorAll(".admin-notification-item");

  items.forEach(function (item) {
    item.addEventListener("click", function (event) {
      event.preventDefault();

      const notificationId = item.dataset.notificationId;

      const complaintId = item.dataset.complaintId;

      if (!notificationId) {
        return;
      }

      handleNotificationClick(notificationId, complaintId);
    });
  });
}

function handleNotificationClick(notificationId, complaintId) {
  if (complaintId) {
    markNotificationAsReadInBackground(notificationId);

    openComplaint(complaintId);

    return;
  }

  markNotificationAsReadInBackground(notificationId);
}

function openComplaint(complaintId) {
  const numericComplaintId = Number(complaintId);

  if (!Number.isInteger(numericComplaintId) || numericComplaintId <= 0) {
    console.error("Invalid complaint ID:", complaintId);

    return;
  }

  const url =
    "complaint-details.html?id=" + encodeURIComponent(numericComplaintId);

  window.location.assign(url);
}

function markNotificationAsReadInBackground(notificationId) {
  const numericNotificationId = Number(notificationId);

  if (!Number.isInteger(numericNotificationId) || numericNotificationId <= 0) {
    return;
  }

  if (!csrfToken) {
    console.error("CSRF token is not available.");

    return;
  }

  fetch("../php/mark-notification-read.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": csrfToken,
    },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify({
      notification_id: numericNotificationId,
    }),
  }).catch(function (error) {
    console.error("Unable to mark notification as read:", error);
  });
}

function setupMarkAllButtons() {
  const markAllButton = document.getElementById("markAllButton");

  const headerMarkAllButton = document.getElementById("headerMarkAllRead");

  if (markAllButton) {
    markAllButton.addEventListener("click", markAllNotificationsAsRead);
  }

  if (headerMarkAllButton && headerMarkAllButton !== markAllButton) {
    headerMarkAllButton.addEventListener("click", markAllNotificationsAsRead);
  }
}

async function markAllNotificationsAsRead() {
  const markAllButton = document.getElementById("markAllButton");

  const headerMarkAllButton = document.getElementById("headerMarkAllRead");

  if (markAllButton) {
    markAllButton.disabled = true;
  }

  if (headerMarkAllButton) {
    headerMarkAllButton.disabled = true;
  }

  try {
    if (!csrfToken) {
      throw new Error("CSRF token is not available.");
    }

    const response = await fetch("../php/mark-all-notifications-read.php", {
      method: "POST",
      headers: {
        "X-CSRF-TOKEN": csrfToken,
      },
      credentials: "same-origin",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to mark notifications as read.");
    }

    await loadAdminNotifications();
  } catch (error) {
    console.error("Mark all notifications read error:", error);
  } finally {
    if (markAllButton) {
      markAllButton.disabled = false;
    }

    if (headerMarkAllButton) {
      headerMarkAllButton.disabled = false;
    }
  }
}

function setupSearch() {
  const searchInput = document.getElementById("notificationSearch");

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", function () {
    const searchTerm = searchInput.value.trim().toLowerCase();

    if (!searchTerm) {
      renderNotifications(allNotifications);

      return;
    }

    const filteredNotifications = allNotifications.filter(
      function (notification) {
        const message = String(notification.message || "").toLowerCase();

        const complaintCode = String(
          notification.complaint_code || "",
        ).toLowerCase();

        return (
          message.includes(searchTerm) || complaintCode.includes(searchTerm)
        );
      },
    );

    renderNotifications(filteredNotifications);
  });
}

function setupNotificationPanel() {
  const notificationButton = document.getElementById("notificationButton");

  const notificationPanel = document.getElementById("notificationPanel");

  const notificationWrapper = document.querySelector(".notification-wrapper");

  if (!notificationButton || !notificationPanel) {
    return;
  }

  notificationButton.addEventListener("click", function (event) {
    event.stopPropagation();

    const isVisible = notificationPanel.style.display !== "none";

    notificationPanel.style.display = isVisible ? "none" : "block";

    if (!isVisible) {
      renderHeaderNotifications(allNotifications);
    }
  });

  notificationPanel.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  document.addEventListener("click", function (event) {
    if (notificationWrapper && !notificationWrapper.contains(event.target)) {
      notificationPanel.style.display = "none";
    }
  });
}

function renderHeaderNotifications(notifications) {
  const list = document.getElementById("headerNotificationList");

  if (!list) {
    return;
  }

  if (!notifications.length) {
    list.innerHTML = `
      <div class="notification-empty">
        No notifications.
      </div>
    `;

    return;
  }

  const recentNotifications = notifications.slice(0, 5);

  list.innerHTML = recentNotifications
    .map(function (notification) {
      const unread = Number(notification.is_read) === 0;

      const complaintId = notification.complaint_id
        ? Number(notification.complaint_id)
        : "";

      return `
          <button
            type="button"
            class="notification-item ${unread ? "notification-unread" : ""}"
            data-header-notification-id="${Number(
              notification.notification_id,
            )}"
            data-header-complaint-id="${complaintId}"
          >
            <div class="notification-message">
              ${escapeHtml(notification.message || "")}
            </div>

            <div class="notification-time">
              ${formatNotificationDate(notification.created_at)}
            </div>
          </button>
        `;
    })
    .join("");

  list
    .querySelectorAll("[data-header-notification-id]")
    .forEach(function (item) {
      item.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        const notificationId = item.dataset.headerNotificationId;

        const complaintId = item.dataset.headerComplaintId;

        handleNotificationClick(notificationId, complaintId);
      });
    });
}

function updateNotificationBadge(unreadCount) {
  const badge = document.getElementById("notificationBadge");

  if (!badge) {
    return;
  }

  const count = Number(unreadCount) || 0;

  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : String(count);

    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

function setupSidebarLogout() {
  const logoutButton = document.getElementById("sidebarLogoutButton");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", logout);
}

async function logout() {
  try {
    if (!csrfToken) {
      throw new Error("CSRF token is not available.");
    }

    await fetch("../php/logout.php", {
      method: "POST",
      headers: {
        "X-CSRF-TOKEN": csrfToken,
      },
      credentials: "same-origin",
    });
  } catch (error) {
    console.error("Logout request failed:", error);
  } finally {
    window.location.href = "../login.html";
  }
}

function showNotificationError(message) {
  const notificationList = document.getElementById("adminNotificationList");

  if (!notificationList) {
    return;
  }

  notificationList.innerHTML = `
    <div class="notification-error">
      ${escapeHtml(message)}
    </div>
  `;

  const statusElement = document.getElementById("notificationListStatus");

  if (statusElement) {
    statusElement.textContent = "Unable to load";
  }
}

function formatNotificationDate(dateString) {
  if (!dateString) {
    return "Unknown time";
  }

  const date = new Date(String(dateString).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return String(dateString);
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getInitials(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);

  if (!words.length) {
    return "AD";
  }

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
