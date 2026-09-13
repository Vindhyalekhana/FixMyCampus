const auth = {
  user_id: null,
  name: null,
  role: null,
};

let complaintId = null;

document.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(window.location.search);

  complaintId = params.get("complaint_id");

  setupLogout();
  setupNotifications();
  setupSidebarNavigation();

  if (!complaintId) {
    showError("Complaint ID is missing.");
    return;
  }

  checkAuthentication();
});

async function checkAuthentication() {
  try {
    const response = await fetch("../php/auth.php");
    const data = await response.json();

    if (!data.authenticated || data.role !== "student") {
      window.location.href = "../login.html";
      return;
    }

    auth.user_id = data.user_id;
    auth.name = data.name;
    auth.role = data.role;

    const studentName = document.getElementById("studentName");
    const sidebarUserName = document.getElementById("sidebarUserName");

    if (studentName) {
      studentName.textContent = data.name;
    }

    if (sidebarUserName) {
      sidebarUserName.textContent = data.name;
    }

    updateProfileAvatars(data.name);

    await loadComplaint();
    await loadNotifications();
  } catch (error) {
    console.error("Authentication error:", error);
    showError("Unable to verify authentication.");
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

function setupSidebarNavigation() {
  const sidebarNotificationButton = document.getElementById(
    "sidebarNotificationButton",
  );

  if (!sidebarNotificationButton) {
    return;
  }

  sidebarNotificationButton.addEventListener("click", function () {
    const notificationButton = document.getElementById("notificationButton");

    const notificationPanel = document.getElementById("notificationPanel");

    if (!notificationButton || !notificationPanel) {
      return;
    }

    notificationPanel.style.display = "block";

    notificationButton.focus();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

async function loadComplaint() {
  try {
    const response = await fetch(
      `../php/complaint-details.php?complaint_id=${encodeURIComponent(
        complaintId,
      )}`,
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      showError(data.message || "Unable to load complaint details.");
      return;
    }

    document.getElementById("loadingMessage").style.display = "none";

    document.getElementById("complaintContent").style.display = "block";

    renderComplaint(data.complaint);
    renderTimeline(data.timeline);
    renderAssignedStaff(data.complaint);
    setupChatButton(data.complaint);
    setupCloseButton(data.complaint);

    if (data.complaint.status === "Closed") {
      await loadFeedback();
    }
  } catch (error) {
    console.error("Complaint loading error:", error);
    showError("Unable to load complaint details.");
  }
}

function renderComplaint(complaint) {
  document.getElementById("complaintTitle").textContent = complaint.title;

  /*
   * Display the complaint code in both locations:
   * the page header and the overview card.
   */
  document.getElementById("complaintCode").textContent =
    complaint.complaint_code;

  document.getElementById("complaintCodeDisplay").textContent =
    complaint.complaint_code;

  document.getElementById("categoryName").textContent = complaint.category_name;

  document.getElementById("priority").textContent = complaint.priority;

  const locationParts = [
    complaint.building,
    complaint.floor,
    complaint.room,
  ].filter(Boolean);

  document.getElementById("location").textContent = locationParts.join(", ");

  document.getElementById("createdAt").textContent = formatDate(
    complaint.created_at,
  );

  document.getElementById("updatedAt").textContent = formatDate(
    complaint.updated_at,
  );

  document.getElementById("complaintDescription").textContent =
    complaint.description;

  const statusDisplay = document.getElementById("statusDisplay");

  statusDisplay.innerHTML = `
    <span class="status ${getStatusClass(complaint.status)}">
      ${escapeHtml(complaint.status)}
    </span>
  `;
}

function renderAssignedStaff(complaint) {
  const assignedStaff = document.getElementById("assignedStaff");

  if (!complaint.staff_id) {
    assignedStaff.innerHTML = `
      <div class="staff-empty">
        <p>No staff member has been assigned yet.</p>
      </div>
    `;

    return;
  }

  assignedStaff.innerHTML = `
    <div class="staff-information">

      <p>
        <strong>Name</strong>
        <span>
          ${escapeHtml(complaint.staff_name)}
        </span>
      </p>

      <p>
        <strong>Phone</strong>
        <span>
          ${escapeHtml(complaint.staff_phone)}
        </span>
      </p>

    </div>
  `;
}

function setupChatButton(complaint) {
  const chatButton = document.getElementById("chatButton");

  if (!chatButton) {
    return;
  }

  if (!complaint.staff_id) {
    chatButton.style.display = "none";
    return;
  }

  chatButton.style.display = "inline-block";

  chatButton.onclick = function () {
    window.location.href = `chat.html?complaint_id=${encodeURIComponent(
      complaint.complaint_id,
    )}`;
  };
}

function setupCloseButton(complaint) {
  const closeButton = document.getElementById("closeComplaintButton");

  const closeMessage = document.getElementById("closeMessage");

  if (!closeButton || !closeMessage) {
    return;
  }

  closeButton.style.display = "none";
  closeMessage.style.display = "none";

  if (complaint.status !== "Resolved" || complaint.closed_at) {
    return;
  }

  closeButton.style.display = "inline-block";

  closeButton.onclick = async function () {
    const confirmed = window.confirm(
      "Are you sure you want to close this complaint?\n\n" +
        "Close it only if the issue has been resolved successfully.",
    );

    if (!confirmed) {
      return;
    }

    closeButton.disabled = true;
    closeButton.textContent = "Closing...";

    try {
      const response = await fetch("../php/close-complaint.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          complaint_id: complaint.complaint_id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to close complaint.");
      }

      closeMessage.textContent = "Complaint closed successfully.";

      closeMessage.style.display = "block";

      await loadComplaint();
    } catch (error) {
      showError(error.message);

      closeButton.disabled = false;
      closeButton.textContent = "Close Complaint";
    }
  };
}

async function loadFeedback() {
  const feedbackSection = document.getElementById("feedbackSection");

  const feedbackContent = document.getElementById("feedbackContent");

  if (!feedbackSection || !feedbackContent) {
    return;
  }

  try {
    const response = await fetch(
      `../php/get-feedback.php?complaint_id=${encodeURIComponent(complaintId)}`,
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      return;
    }

    feedbackSection.style.display = "block";

    if (data.has_feedback) {
      renderSubmittedFeedback(data.feedback);
    } else {
      renderFeedbackForm();
    }
  } catch (error) {
    console.error("Feedback loading error:", error);

    feedbackSection.style.display = "none";
  }
}

function renderSubmittedFeedback(feedback) {
  const feedbackContent = document.getElementById("feedbackContent");

  const rating = Number(feedback.rating);

  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

  feedbackContent.innerHTML = `
    <div class="submitted-feedback">

      <div class="feedback-stars">
        ${stars}
      </div>

      <p>
        <strong>Rating:</strong>
        ${escapeHtml(feedback.rating)}/5
      </p>

      <p>
        <strong>Comment:</strong>
        ${
          feedback.comment
            ? escapeHtml(feedback.comment)
            : "No comment provided."
        }
      </p>

      <small>
        Submitted on ${formatDate(feedback.created_at)}
      </small>

    </div>
  `;
}

function renderFeedbackForm() {
  const feedbackContent = document.getElementById("feedbackContent");

  feedbackContent.innerHTML = `
    <p class="feedback-intro">
      Your complaint has been closed.
      Please rate the resolution.
    </p>

    <div class="rating-options">

      <button
        type="button"
        class="rating-button"
        data-rating="1"
      >
        1
      </button>

      <button
        type="button"
        class="rating-button"
        data-rating="2"
      >
        2
      </button>

      <button
        type="button"
        class="rating-button"
        data-rating="3"
      >
        3
      </button>

      <button
        type="button"
        class="rating-button"
        data-rating="4"
      >
        4
      </button>

      <button
        type="button"
        class="rating-button"
        data-rating="5"
      >
        5
      </button>

    </div>

    <p
      id="selectedRating"
      class="selected-rating"
    >
      Select a rating from 1 to 5.
    </p>

    <textarea
      id="feedbackComment"
      class="feedback-textarea"
      rows="4"
      maxlength="1000"
      placeholder="Optional comment about the resolution..."
    ></textarea>

    <button
      id="submitFeedbackButton"
      class="btn btn-primary"
      type="button"
    >
      Submit Feedback
    </button>

    <div id="feedbackFormMessage"></div>
  `;

  let selectedRating = 0;

  const ratingButtons = document.querySelectorAll(".rating-button");

  const selectedRatingText = document.getElementById("selectedRating");

  ratingButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      selectedRating = Number(button.dataset.rating);

      ratingButtons.forEach(function (item) {
        item.classList.remove("selected");
      });

      button.classList.add("selected");

      selectedRatingText.textContent = `You selected ${selectedRating}/5`;
    });
  });

  document
    .getElementById("submitFeedbackButton")
    .addEventListener("click", async function () {
      if (!selectedRating) {
        showFeedbackMessage("Please select a rating.", true);

        return;
      }

      const comment = document.getElementById("feedbackComment").value.trim();

      const submitButton = document.getElementById("submitFeedbackButton");

      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";

      try {
        const response = await fetch("../php/submit-feedback.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            complaint_id: Number(complaintId),
            rating: selectedRating,
            comment: comment,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to submit feedback.");
        }

        showFeedbackMessage("Feedback submitted successfully.", false);

        await loadFeedback();
      } catch (error) {
        showFeedbackMessage(error.message, true);

        submitButton.disabled = false;
        submitButton.textContent = "Submit Feedback";
      }
    });
}

function showFeedbackMessage(message, isError) {
  const messageElement = document.getElementById("feedbackFormMessage");

  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;

  messageElement.className = isError ? "feedback-error" : "feedback-success";
}

function renderTimeline(timeline) {
  const timelineContainer = document.getElementById("timeline");

  if (!timeline || timeline.length === 0) {
    timelineContainer.innerHTML = `
      <p>
        No timeline updates available.
      </p>
    `;

    return;
  }

  timelineContainer.innerHTML = timeline
    .map(function (update) {
      return `
          <div class="timeline-item">

            <div class="timeline-dot"></div>

            <div class="timeline-content">

              <strong>
                ${escapeHtml(
                  update.new_status || update.old_status || "Update",
                )}
              </strong>

              <p>
                ${escapeHtml(update.remarks || "No remarks provided.")}
              </p>

              <small>
                Updated by
                ${escapeHtml(update.updated_by_name)}
                on
                ${formatDate(update.updated_at)}
              </small>

            </div>

          </div>
        `;
    })
    .join("");
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
      throw new Error(data.message);
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

  if (Number(unreadCount) > 0) {
    badge.textContent = Number(unreadCount) > 99 ? "99+" : unreadCount;

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
    return "N/A";
  }

  const date = new Date(dateString.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString();
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

function showError(message) {
  const loadingMessage = document.getElementById("loadingMessage");

  const errorMessage = document.getElementById("errorMessage");

  if (loadingMessage) {
    loadingMessage.style.display = "none";
  }

  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
  }
}
