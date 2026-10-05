let csrfToken = "";

document.addEventListener("DOMContentLoaded", function () {
  initializeNotifications();
});

async function initializeNotifications() {
  setupLogout();
  setupPageActions();

  try {
    const authData = await getAuthentication();

    if (!authData || !authData.authenticated) {
      window.location.href = "../login.html";
      return;
    }

    if (authData.role !== "student") {
      redirectByRole(authData.role);
      return;
    }

    updateStudentIdentity(authData.name);

    await loadCsrfToken();

    loadProfile();
    await loadNotifications();
  } catch (error) {
    console.error("Notifications initialization error:", error);

    showNotificationError(
      "Unable to load notifications. Please refresh the page.",
    );
  }
}

async function getAuthentication() {
  const response = await fetch("../php/auth.php", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to verify authentication.");
  }

  const data = await response.json();

  if (!data || typeof data !== "object") {
    throw new Error("Invalid authentication response.");
  }

  return data;
}

function redirectByRole(role) {
  if (role === "admin") {
    window.location.href = "../admin/dashboard.html";
    return;
  }

  if (role === "staff") {
    window.location.href = "../staff/dashboard.html";
    return;
  }

  window.location.href = "../login.html";
}

function updateStudentIdentity(name) {
  const studentName = name || "Student";

  const studentNameElement = document.getElementById("studentName");
  const sidebarUserName = document.getElementById("sidebarUserName");

  if (studentNameElement) {
    studentNameElement.textContent = studentName;
  }

  if (sidebarUserName) {
    sidebarUserName.textContent = studentName;
  }

  updateProfileAvatars(studentName, "");
}

async function loadCsrfToken() {
  try {
    const response = await fetch("../php/csrf-token.php", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Unable to load security token.");
    }

    const data = await response.json();

    if (!data.success || !data.csrf_token) {
      throw new Error(data.message || "Security token unavailable.");
    }

    csrfToken = data.csrf_token;
  } catch (error) {
    console.error("CSRF token loading error:", error);
  }
}

async function loadProfile() {
  try {
    const response = await fetch("../php/profile.php", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Unable to load profile.");
    }

    const data = await response.json();

    if (!data.success || !data.user) {
      throw new Error(data.message || "Unable to load profile.");
    }

    renderProfile(data.user);
  } catch (error) {
    console.error("Profile loading error:", error);
  }
}

function renderProfile(user) {
  const name = user.name || "Student";

  const studentName = document.getElementById("studentName");
  const sidebarUserName = document.getElementById("sidebarUserName");

  if (studentName) {
    studentName.textContent = name;
  }

  if (sidebarUserName) {
    sidebarUserName.textContent = name;
  }

  updateProfileAvatars(name, user.profile_picture || "");
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
    avatar.classList.remove("has-profile-image");

    if (!profilePicture) {
      avatar.textContent = initials;
      return;
    }

    const image = document.createElement("img");

    image.src = "../" + profilePicture + "?v=" + Date.now();
    image.alt = "Profile picture";

    image.onload = function () {
      avatar.classList.add("has-profile-image");
    };

    image.onerror = function () {
      avatar.innerHTML = "";
      avatar.classList.remove("has-profile-image");
      avatar.textContent = initials;
    };

    avatar.appendChild(image);
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

async function loadNotifications() {
  const pageList = document.getElementById("notificationsPageList");

  if (pageList) {
    pageList.innerHTML = `
      <div class="notifications-loading">
        Loading notifications...
      </div>
    `;
  }

  try {
    const response = await fetch("../php/notifications.php", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        "Notification request failed with status " + response.status,
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Unable to load notifications.");
    }

    const notifications = Array.isArray(data.notifications)
      ? data.notifications
      : [];

    updateNotificationBadge(data.unread_count);
    renderFullNotifications(notifications);
    renderNotificationDropdown(notifications);
  } catch (error) {
    console.error("Notification loading error:", error);

    showNotificationError(
      "Unable to load notifications. Please refresh the page.",
    );
  }
}

function renderFullNotifications(notifications) {
  const list = document.getElementById("notificationsPageList");

  if (!list) {
    return;
  }

  if (!notifications.length) {
    list.innerHTML = `
      <div class="notifications-empty">
        <div class="notifications-empty-icon">✓</div>

        <h3>No notifications</h3>

        <p>
          You're all caught up. New complaint updates will appear here.
        </p>
      </div>
    `;

    return;
  }

  list.innerHTML = notifications
    .map(function (notification) {
      return createNotificationCard(notification);
    })
    .join("");

  attachNotificationClickHandlers(list);
}

function createNotificationCard(notification) {
  const notificationId = notification.notification_id;
  const complaintId = notification.complaint_id || "";
  const isUnread = Number(notification.is_read) === 0;

  const unreadClass = isUnread ? "is-unread" : "is-read";

  const complaintCode =
    notification.complaint_code || getComplaintCode(complaintId);

  const message = notification.message || "You have a new notification.";

  const formattedDate = formatNotificationDate(notification.created_at);

  return `
    <button
      type="button"
      class="notification-page-item ${unreadClass}"
      data-notification-id="${escapeHtml(notificationId)}"
      data-complaint-id="${escapeHtml(complaintId)}"
    >
      <div class="notification-page-icon">
        ${isUnread ? "!" : "✓"}
      </div>

      <div class="notification-page-content">
        <div class="notification-page-header-row">
          <span class="notification-page-code">
            ${escapeHtml(complaintCode)}
          </span>

          ${
            isUnread
              ? `
                <span class="notification-page-status">
                  New
                </span>
              `
              : `
                <span class="notification-page-status read">
                  Read
                </span>
              `
          }
        </div>

        <p class="notification-page-message">
          ${escapeHtml(message)}
        </p>

        <span class="notification-page-time">
          ${escapeHtml(formattedDate)}
        </span>
      </div>

      <span class="notification-page-arrow">
        →
      </span>
    </button>
  `;
}

function attachNotificationClickHandlers(container) {
  const items = container.querySelectorAll(".notification-page-item");

  items.forEach(function (item) {
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

function renderNotificationDropdown(notifications) {
  const list = document.getElementById("notificationList");

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

  list.innerHTML = notifications
    .slice(0, 5)
    .map(function (notification) {
      const unreadClass =
        Number(notification.is_read) === 0 ? "notification-unread" : "";

      const complaintId = notification.complaint_id || "";

      return `
        <button
          type="button"
          class="notification-item ${unreadClass}"
          data-notification-id="${escapeHtml(notification.notification_id)}"
          data-complaint-id="${escapeHtml(complaintId)}"
        >
          <div class="notification-message">
            ${escapeHtml(notification.message)}
          </div>

          <div class="notification-time">
            ${escapeHtml(formatNotificationDate(notification.created_at))}
          </div>
        </button>
      `;
    })
    .join("");

  list.querySelectorAll(".notification-item").forEach(function (item) {
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
      await loadCsrfToken();
    }

    if (!csrfToken) {
      throw new Error("Security token is unavailable.");
    }

    const response = await fetch("../php/mark-notification-read.php", {
      method: "POST",
      credentials: "same-origin",
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
      await loadCsrfToken();
    }

    if (!csrfToken) {
      throw new Error("Security token is unavailable.");
    }

    const response = await fetch("../php/mark-all-notifications-read.php", {
      method: "POST",
      credentials: "same-origin",
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
    console.error("Mark all notifications error:", error);
  }
}

function setupPageActions() {
  const markAllButton = document.getElementById("markAllReadPageBtn");

  if (markAllButton) {
    markAllButton.addEventListener("click", async function () {
      markAllButton.disabled = true;
      markAllButton.textContent = "Marking as read...";

      await markAllNotificationsRead();

      markAllButton.disabled = false;
      markAllButton.textContent = "Mark All as Read";
    });
  }

  const notificationButton = document.getElementById("notificationButton");

  const notificationPanel = document.getElementById("notificationPanel");

  if (notificationButton && notificationPanel) {
    notificationButton.addEventListener("click", function (event) {
      event.stopPropagation();

      const isVisible = notificationPanel.style.display === "block";

      notificationPanel.style.display = isVisible ? "none" : "block";
    });

    notificationPanel.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  }

  document.addEventListener("click", function (event) {
    const wrapper = document.querySelector(".notification-wrapper");

    if (wrapper && !wrapper.contains(event.target) && notificationPanel) {
      notificationPanel.style.display = "none";
    }
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

function showNotificationError(message) {
  const pageList = document.getElementById("notificationsPageList");

  if (pageList) {
    pageList.innerHTML = `
      <div class="notifications-error">
        <h3>Unable to load notifications</h3>

        <p>
          ${escapeHtml(message || "Please refresh the page and try again.")}
        </p>

        <button
          type="button"
          class="notification-retry-button"
          id="notificationRetryButton"
        >
          Try Again
        </button>
      </div>
    `;

    const retryButton = document.getElementById("notificationRetryButton");

    if (retryButton) {
      retryButton.addEventListener("click", loadNotifications);
    }
  }

  const dropdownList = document.getElementById("notificationList");

  if (dropdownList) {
    dropdownList.innerHTML = `
      <div class="notification-empty">
        Unable to load notifications.
      </div>
    `;
  }
}

function setupLogout() {
  const logoutButton = document.getElementById("logoutButton");

  const sidebarLogoutButton = document.getElementById("sidebarLogoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }

  if (sidebarLogoutButton && sidebarLogoutButton !== logoutButton) {
    sidebarLogoutButton.addEventListener("click", logout);
  }
}

async function logout() {
  try {
    let token = csrfToken;

    if (!token) {
      await loadCsrfToken();
      token = csrfToken;
    }

    const headers = {};

    if (token) {
      headers["X-CSRF-TOKEN"] = token;
    }

    await fetch("../php/logout.php", {
      method: "POST",
      credentials: "same-origin",
      headers: headers,
    });
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    window.location.href = "../login.html";
  }
}

function getComplaintCode(complaintId) {
  if (!complaintId) {
    return "Complaint Update";
  }

  return "FMC-" + String(complaintId).padStart(6, "0");
}

function formatNotificationDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(String(dateString).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return String(dateString);
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
