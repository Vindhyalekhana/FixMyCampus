let complaintId = null;
let currentUserId = null;
let chatClosed = false;

document.addEventListener("DOMContentLoaded", function () {
  setupNotifications();
  setupLogout();
  initializeChat();
});

async function initializeChat() {
  try {
    const authResponse = await fetch("../php/auth.php", {
      cache: "no-store",
    });

    if (!authResponse.ok) {
      throw new Error("Unable to verify authentication.");
    }

    const authData = await authResponse.json();

    if (!authData.authenticated) {
      window.location.href = "../login.html";
      return;
    }

    if (authData.role !== "staff") {
      window.location.href = "../login.html";
      return;
    }

    currentUserId = Number(authData.user_id);

    updateStaffProfile(authData.name);

    const params = new URLSearchParams(window.location.search);

    complaintId = params.get("complaint_id");

    if (!complaintId) {
      showError("No complaint was specified.");
      return;
    }

    await loadChat();
    await loadNotifications();
  } catch (error) {
    console.error("Chat initialization error:", error);

    showError("Unable to load chat.");
  }
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

async function loadChat() {
  try {
    const response = await fetch(
      "../php/chat-messages.php?complaint_id=" +
        encodeURIComponent(complaintId),
      {
        cache: "no-store",
      },
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      showError(data.message || "Unable to load chat.");
      return;
    }

    renderChat(data);

    const loadingMessage = document.getElementById("loadingMessage");

    const chatContent = document.getElementById("chatContent");

    if (loadingMessage) {
      loadingMessage.style.display = "none";
    }

    if (chatContent) {
      chatContent.classList.remove("hidden");
      chatContent.style.display = "block";
    }
  } catch (error) {
    console.error("Chat loading error:", error);

    showError("Unable to load chat.");
  }
}

function renderChat(data) {
  const complaint = data.complaint;

  chatClosed = Boolean(data.chat_closed);

  const complaintInfo = document.getElementById("complaintInfo");

  const studentName = document.getElementById("studentName");

  const studentAvatar = document.getElementById("studentAvatar");

  const chatStatus = document.getElementById("chatStatus");

  if (complaintInfo) {
    complaintInfo.textContent = getComplaintCode(complaint);
  }

  if (studentName) {
    studentName.textContent = complaint.student_name || "Student";
  }

  if (studentAvatar) {
    studentAvatar.textContent = getInitials(
      complaint.student_name || "Student",
    );
  }

  if (chatStatus) {
    chatStatus.textContent = chatClosed ? "Chat Closed" : "Chat Open";

    chatStatus.classList.toggle("chat-status-closed", chatClosed);
  }

  const backButton = document.getElementById("backButton");

  if (backButton) {
    backButton.href =
      "complaint-details.html?complaint_id=" +
      encodeURIComponent(complaint.complaint_id);
  }

  renderMessages(data.messages || []);

  updateChatControls();
}

function renderMessages(messages) {
  const container = document.getElementById("messagesContainer");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!messages || messages.length === 0) {
    const emptyMessage = document.createElement("div");

    emptyMessage.className = "empty-chat";

    emptyMessage.textContent = "No messages yet. Start the conversation.";

    container.appendChild(emptyMessage);

    return;
  }

  messages.forEach(function (message) {
    const wrapper = document.createElement("div");

    wrapper.className =
      "message " +
      (Number(message.sender_id) === currentUserId ? "sent" : "received");

    const bubble = document.createElement("div");

    bubble.className = "message-bubble";

    const sender = document.createElement("div");

    sender.className = "message-sender";

    sender.textContent = message.sender_name || "User";

    const text = document.createElement("p");

    text.className = "message-text";

    text.textContent = message.message || "";

    const time = document.createElement("div");

    time.className = "message-time";

    time.textContent = formatDate(message.created_at);

    bubble.appendChild(sender);
    bubble.appendChild(text);
    bubble.appendChild(time);

    wrapper.appendChild(bubble);

    container.appendChild(wrapper);
  });

  container.scrollTop = container.scrollHeight;
}

function updateChatControls() {
  const messageForm = document.getElementById("messageForm");

  const messageInput = document.getElementById("messageInput");

  const sendButton = document.getElementById("sendButton");

  const closedMessage = document.getElementById("closedMessage");

  if (!messageForm || !messageInput || !sendButton || !closedMessage) {
    return;
  }

  if (chatClosed) {
    messageInput.disabled = true;

    sendButton.disabled = true;

    messageForm.style.display = "none";

    closedMessage.classList.remove("hidden");

    closedMessage.style.display = "block";
  } else {
    messageInput.disabled = false;

    sendButton.disabled = false;

    messageForm.style.display = "flex";

    closedMessage.classList.add("hidden");

    closedMessage.style.display = "none";
  }
}

document.addEventListener("submit", function (event) {
  if (event.target.id === "messageForm") {
    sendMessage(event);
  }
});

async function sendMessage(event) {
  event.preventDefault();

  if (chatClosed) {
    return;
  }

  const input = document.getElementById("messageInput");

  const sendButton = document.getElementById("sendButton");

  if (!input || !sendButton) {
    return;
  }

  const message = input.value.trim();

  if (!message) {
    return;
  }

  sendButton.disabled = true;

  sendButton.textContent = "Sending...";

  try {
    const response = await fetch("../php/send-message.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        complaint_id: Number(complaintId),
        message: message,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to send message.");
    }

    input.value = "";

    await loadChat();
  } catch (error) {
    console.error("Send message error:", error);

    alert(error.message);
  } finally {
    if (!chatClosed) {
      sendButton.disabled = false;

      sendButton.textContent = "Send Message";
    }
  }
}

function setupNotifications() {
  const notificationButton = document.getElementById("notificationButton");

  const markAllReadButton = document.getElementById("markAllReadButton");

  const notificationPanel = document.getElementById("notificationPanel");

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

async function loadNotifications() {
  try {
    const response = await fetch("../php/notifications.php", {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load notifications.");
    }

    updateNotificationBadge(data.unread_count);

    renderNotifications(data.notifications);
  } catch (error) {
    console.error("Notification loading error:", error);
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

      const complaintIdFromNotification = item.dataset.complaintId;

      await markNotificationRead(notificationId);

      if (complaintIdFromNotification) {
        window.location.href =
          "complaint-details.html?complaint_id=" +
          encodeURIComponent(complaintIdFromNotification);
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

function setupLogout() {
  const sidebarLogoutButton = document.getElementById("sidebarLogoutButton");

  if (sidebarLogoutButton) {
    sidebarLogoutButton.addEventListener("click", logout);
  }
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

function getComplaintCode(complaint) {
  if (complaint && complaint.complaint_code) {
    return complaint.complaint_code;
  }

  return "FMC-" + String(complaint.complaint_id).padStart(6, "0");
}

function getInitials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "ST";
  }

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
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

function showError(message) {
  const loadingMessage = document.getElementById("loadingMessage");

  const errorMessage = document.getElementById("errorMessage");

  if (loadingMessage) {
    loadingMessage.style.display = "none";
  }

  if (errorMessage) {
    errorMessage.textContent = message;

    errorMessage.classList.remove("hidden");

    errorMessage.style.display = "block";
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");

  div.textContent = value ?? "";

  return div.innerHTML;
}
