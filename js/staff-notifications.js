let staffNotifications = [];
let csrfToken = "";

document.addEventListener("DOMContentLoaded", function () {
  checkAuthentication();
});

async function checkAuthentication() {
  try {
    const response = await fetch("../php/auth.php", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Unable to verify authentication.");
    }

    const data = await response.json();

    if (!data.authenticated || data.role !== "staff") {
      window.location.href = "../login.html";
      return;
    }

    updateStaffProfile(data.name);

    await loadCsrfToken();

    setupLogout();
    setupHeaderNotifications();
    setupPageMarkAllRead();

    await loadNotifications();
  } catch (error) {
    console.error("Notification page authentication error:", error);

    window.location.href = "../login.html";
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
  const staffName = name || "Staff";

  const staffNameElement = document.getElementById("staffName");

  const sidebarUserName = document.getElementById("sidebarUserName");

  if (staffNameElement) {
    staffNameElement.textContent = staffName;
  }

  if (sidebarUserName) {
    sidebarUserName.textContent = staffName;
  }

  updateProfileAvatars(staffName);
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

function setupHeaderNotifications() {
  const notificationButton = document.getElementById("notificationButton");

  const notificationPanel = document.getElementById("notificationPanel");

  const markAllReadButton = document.getElementById("markAllReadButton");

  if (notificationButton && notificationPanel) {
    notificationButton.addEventListener("click", function (event) {
      event.stopPropagation();

      const visible = notificationPanel.style.display !== "none";

      notificationPanel.style.display = visible ? "none" : "block";
    });
  }

  if (markAllReadButton) {
    markAllReadButton.addEventListener("click", async function () {
      await markAllNotificationsRead();
    });
  }

  document.addEventListener("click", function (event) {
    const wrapper = document.querySelector(".notification-wrapper");

    if (wrapper && !wrapper.contains(event.target) && notificationPanel) {
      notificationPanel.style.display = "none";
    }
  });
}

function setupPageMarkAllRead() {
  const button = document.getElementById("pageMarkAllReadButton");

  if (!button) {
    return;
  }

  button.addEventListener("click", async function () {
    button.disabled = true;
    button.textContent = "Marking...";

    await markAllNotificationsRead();

    button.disabled = false;
    button.textContent = "Mark all as read";
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

    staffNotifications = Array.isArray(data.notifications)
      ? data.notifications
      : [];

    updateNotificationBadge(data.unread_count);

    renderHeaderNotifications(staffNotifications);

    renderPageNotifications(staffNotifications);
  } catch (error) {
    console.error("Notification loading error:", error);

    showNotificationError();
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

function renderHeaderNotifications(notifications) {
  const list = document.getElementById("notificationList");

  if (!list) {
    return;
  }

  if (!notifications || notifications.length === 0) {
    list.innerHTML = `
      <div class="notification-empty">
        No notifications.
      </div>
    `;

    return;
  }

  list.innerHTML = notifications
    .slice(0, 6)
    .map(function (notification) {
      return createNotificationMarkup(notification);
    })
    .join("");

  attachNotificationEvents(list);
}

function renderPageNotifications(notifications) {
  const list = document.getElementById("pageNotificationList");

  if (!list) {
    return;
  }

  if (!notifications || notifications.length === 0) {
    list.innerHTML = `
      <div class="notification-page-empty">
        <div class="notification-page-empty-icon">
          ðŸ””
        </div>

        <h3>No notifications</h3>

        <p>
          You are all caught up.
        </p>
      </div>
    `;

    return;
  }

  list.innerHTML = notifications
    .map(function (notification) {
      return createPageNotificationMarkup(notification);
    })
    .join("");

  attachNotificationEvents(list);
}

function createNotificationMarkup(notification) {
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
}

function createPageNotificationMarkup(notification) {
  const unread = Number(notification.is_read) === 0;

  const unreadClass = unread ? "page-notification-unread" : "";

  return `
    <button
      type="button"
      class="page-notification-item ${unreadClass}"
      data-notification-id="${notification.notification_id}"
      data-complaint-id="${notification.complaint_id || ""}"
    >
      <div class="page-notification-icon">
        ${unread ? "â—" : "âœ“"}
      </div>

      <div class="page-notification-content">
        <div class="page-notification-message">
          ${escapeHtml(notification.message)}
        </div>

        <div class="page-notification-meta">
          ${
            notification.complaint_id
              ? "Complaint #" +
                escapeHtml(String(notification.complaint_id)) +
                " Â· "
              : ""
          }

          ${formatNotificationDate(notification.created_at)}
        </div>
      </div>

      ${
        unread
          ? `
            <span class="page-notification-status">
              New
            </span>
          `
          : ""
      }
    </button>
  `;
}

function attachNotificationEvents(container) {
  container.querySelectorAll("[data-notification-id]").forEach(function (item) {
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

function showNotificationError() {
  const pageList = document.getElementById("pageNotificationList");

  const headerList = document.getElementById("notificationList");

  if (pageList) {
    pageList.innerHTML = `
      <div class="notification-page-error">
        Unable to load notifications.
        Please refresh the page.
      </div>
    `;
  }

  if (headerList) {
    headerList.innerHTML = `
      <div class="notification-empty">
        Unable to load notifications.
      </div>
    `;
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");

  div.textContent = value == null ? "" : String(value);

  return div.innerHTML;
}

function formatNotificationDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(String(dateString).replace(" ", "T"));

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
