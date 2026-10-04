let csrfToken = "";

document.addEventListener("DOMContentLoaded", function () {
  initializeReportNotifications();
});

async function initializeReportNotifications() {
  setupNotificationEvents();

  try {
    await loadCsrfToken();
    await loadReportNotifications();
  } catch (error) {
    console.error("Notification initialization error:", error);
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

function setupNotificationEvents() {
  const notificationButton = document.getElementById("notificationButton");

  const markAllReadButton = document.getElementById("markAllReadButton");

  if (notificationButton) {
    notificationButton.addEventListener("click", function (event) {
      event.stopPropagation();

      const panel = document.getElementById("notificationPanel");

      const isVisible = panel.style.display !== "none";

      panel.style.display = isVisible ? "none" : "block";
    });
  }

  if (markAllReadButton) {
    markAllReadButton.addEventListener("click", async function () {
      await markAllNotificationsRead();
    });
  }

  document.addEventListener("click", function (event) {
    const wrapper = document.querySelector(".notification-wrapper");

    if (wrapper && !wrapper.contains(event.target)) {
      document.getElementById("notificationPanel").style.display = "none";
    }
  });
}

async function loadReportNotifications() {
  try {
    const response = await fetch("../php/notifications.php");

    if (!response.ok) {
      throw new Error("Unable to load notifications.");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    updateNotificationBadge(data.unread_count);

    renderNotifications(data.notifications);
  } catch (error) {
    console.error("Notification loading error:", error);

    const list = document.getElementById("notificationList");

    if (list) {
      list.innerHTML = `
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

  if (unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? "99+" : unreadCount;

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
        window.location.href = `complaint-details.html?complaint_id=${encodeURIComponent(
          complaintId,
        )}`;
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

    await loadReportNotifications();
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

    await loadReportNotifications();
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

function escapeHtml(value) {
  const div = document.createElement("div");

  div.textContent = value ?? "";

  return div.innerHTML;
}
