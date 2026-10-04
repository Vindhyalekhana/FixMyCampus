const auth = {
  user_id: null,
  name: null,
  role: null,
};

let complaintId = null;

document.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(window.location.search);

  complaintId = params.get("complaint_id") || params.get("id");

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
    const response = await fetch("../php/auth.php", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Authentication request failed.");
    }

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
    await fetch("../php/logout.php", {
      method: "POST",
    });
  } finally {
    window.location.href = "../login.html";
  }
}

function updateProfileAvatars(name) {
  if (!name) {
    return;
  }

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
      {
        cache: "no-store",
      },
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      showError(data.message || "Unable to load complaint details.");
      return;
    }

    const loadingMessage = document.getElementById("loadingMessage");
    const complaintContent = document.getElementById("complaintContent");

    if (loadingMessage) {
      loadingMessage.style.display = "none";
    }

    if (complaintContent) {
      complaintContent.style.display = "block";
    }

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
  const complaintTitle = document.getElementById("complaintTitle");
  const complaintCode = document.getElementById("complaintCode");
  const complaintCodeDisplay = document.getElementById("complaintCodeDisplay");
  const categoryName = document.getElementById("categoryName");
  const category = document.getElementById("category");
  const priority = document.getElementById("priority");
  const location = document.getElementById("location");
  const createdAt = document.getElementById("createdAt");
  const submittedAt = document.getElementById("submittedAt");
  const updatedAt = document.getElementById("updatedAt");
  const complaintDescription = document.getElementById("complaintDescription");

  if (complaintTitle) {
    complaintTitle.textContent = complaint.title || "Complaint";
  }

  if (complaintCode) {
    complaintCode.textContent = complaint.complaint_code || "-";
  }

  if (complaintCodeDisplay) {
    complaintCodeDisplay.textContent = complaint.complaint_code || "-";
  }

  if (categoryName) {
    categoryName.textContent = complaint.category_name || "-";
  }

  if (category) {
    category.textContent = complaint.category_name || "-";
  }

  if (priority) {
    priority.textContent = complaint.priority || "-";
  }

  const locationParts = [
    complaint.building,
    complaint.floor,
    complaint.room,
  ].filter(Boolean);

  if (location) {
    location.textContent =
      locationParts.length > 0 ? locationParts.join(", ") : "-";
  }

  if (createdAt) {
    createdAt.textContent = formatDate(complaint.created_at);
  }

  if (submittedAt) {
    submittedAt.textContent = formatDate(complaint.created_at);
  }

  if (updatedAt) {
    updatedAt.textContent = formatDate(complaint.updated_at);
  }

  if (complaintDescription) {
    complaintDescription.textContent = complaint.description || "-";
  }

  const statusDisplay = document.getElementById("statusDisplay");

  if (statusDisplay) {
    statusDisplay.innerHTML = `
      <span class="status-badge ${getStatusClass(complaint.status)}">
        ${escapeHtml(complaint.status)}
      </span>
    `;
  }
}

function renderAssignedStaff(complaint) {
  const assignedStaff = document.getElementById("assignedStaff");

  if (!assignedStaff) {
    return;
  }

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
          ${escapeHtml(complaint.staff_name || "Assigned Staff")}
        </span>
      </p>

      <p>
        <strong>Phone</strong>
        <span>
          ${escapeHtml(complaint.staff_phone || "Contact unavailable")}
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

/* Feedback */

async function loadFeedback() {
  const feedbackSection = document.getElementById("feedbackSection");

  const feedbackContent = document.getElementById("feedbackContent");

  if (!feedbackSection || !feedbackContent) {
    return;
  }

  try {
    const response = await fetch(
      `../php/get-feedback.php?complaint_id=${encodeURIComponent(complaintId)}`,
      {
        cache: "no-store",
      },
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

  if (!feedbackContent) {
    return;
  }

  const rating = Math.max(0, Math.min(5, Number(feedback.rating) || 0));

  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

  feedbackContent.innerHTML = `
    <div class="submitted-feedback">

      <div class="feedback-stars" aria-label="${rating} out of 5 stars">
        ${stars}
      </div>

      <p>
        <strong>Rating:</strong>
        ${rating}/5
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

  if (!feedbackContent) {
    return;
  }

  feedbackContent.innerHTML = `
    <p class="feedback-intro">
      Your complaint has been closed.
      Please rate the resolution.
    </p>

    <form id="feedbackForm">

      <div class="rating-wrapper">

        <label class="rating-label">
          How would you rate the resolution?
        </label>

        <div
          class="rating-options"
          role="radiogroup"
          aria-label="Rate the resolution from 1 to 5"
        >

          <button
            type="button"
            class="rating-button"
            data-rating="1"
            aria-label="1 out of 5 stars"
            aria-pressed="false"
          >
            ★
          </button>

          <button
            type="button"
            class="rating-button"
            data-rating="2"
            aria-label="2 out of 5 stars"
            aria-pressed="false"
          >
            ★
          </button>

          <button
            type="button"
            class="rating-button"
            data-rating="3"
            aria-label="3 out of 5 stars"
            aria-pressed="false"
          >
            ★
          </button>

          <button
            type="button"
            class="rating-button"
            data-rating="4"
            aria-label="4 out of 5 stars"
            aria-pressed="false"
          >
            ★
          </button>

          <button
            type="button"
            class="rating-button"
            data-rating="5"
            aria-label="5 out of 5 stars"
            aria-pressed="false"
          >
            ★
          </button>

        </div>

        <div
          id="selectedRating"
          class="selected-rating"
          aria-live="polite"
        >
          Select a rating from 1 to 5.
        </div>

        <input
          type="hidden"
          id="feedbackRating"
          name="rating"
          value=""
        />

      </div>

      <div class="feedback-comment-group">

        <label
          for="feedbackComment"
          class="feedback-comment-label"
        >
          Additional comments
        </label>

        <textarea
          id="feedbackComment"
          name="comment"
          class="feedback-textarea"
          maxlength="1000"
          placeholder="Optional comment about the resolution..."
        ></textarea>

        <p class="feedback-character-note">
          Optional. Maximum 1000 characters.
        </p>

      </div>

      <button
        id="submitFeedbackButton"
        type="submit"
      >
        Submit Feedback
      </button>

      <div
        id="feedbackFormMessage"
        aria-live="polite"
      ></div>

    </form>
  `;

  setupRatingButtons();

  const feedbackForm = document.getElementById("feedbackForm");

  if (feedbackForm) {
    feedbackForm.addEventListener("submit", submitFeedback);
  }
}

function setupRatingButtons() {
  const ratingButtons = document.querySelectorAll(".rating-button");

  const ratingInput = document.getElementById("feedbackRating");

  const selectedRating = document.getElementById("selectedRating");

  if (!ratingButtons.length || !ratingInput) {
    return;
  }

  ratingButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const rating = Number(button.dataset.rating);

      if (!rating || rating < 1 || rating > 5) {
        return;
      }

      ratingInput.value = String(rating);

      ratingButtons.forEach(function (item) {
        const itemRating = Number(item.dataset.rating);
        const selected = itemRating <= rating;

        item.classList.toggle("selected", selected);

        item.setAttribute("aria-pressed", selected ? "true" : "false");
      });

      if (selectedRating) {
        selectedRating.textContent = getRatingText(rating);
      }
    });

    button.addEventListener("mouseenter", function () {
      const hoverRating = Number(button.dataset.rating);

      ratingButtons.forEach(function (item) {
        const itemRating = Number(item.dataset.rating);

        item.style.color = itemRating <= hoverRating ? "#f2b632" : "";
      });
    });

    button.addEventListener("mouseleave", function () {
      const currentRating = Number(ratingInput.value) || 0;

      ratingButtons.forEach(function (item) {
        const itemRating = Number(item.dataset.rating);

        item.style.color = itemRating <= currentRating ? "#f2b632" : "";
      });
    });
  });
}

function getRatingText(rating) {
  const labels = {
    1: "1/5 — Very poor",
    2: "2/5 — Needs improvement",
    3: "3/5 — Satisfactory",
    4: "4/5 — Good",
    5: "5/5 — Excellent",
  };

  return labels[rating] || "Select a rating from 1 to 5.";
}

async function submitFeedback(event) {
  event.preventDefault();

  const ratingInput = document.getElementById("feedbackRating");

  const commentInput = document.getElementById("feedbackComment");

  const feedbackMessage = document.getElementById("feedbackFormMessage");

  const submitButton = document.getElementById("submitFeedbackButton");

  const rating = Number(ratingInput ? ratingInput.value : 0);

  if (!rating || rating < 1 || rating > 5) {
    if (feedbackMessage) {
      feedbackMessage.className = "feedback-error";
      feedbackMessage.textContent = "Please select a rating before submitting.";
    }

    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";
  }

  if (feedbackMessage) {
    feedbackMessage.className = "";
    feedbackMessage.textContent = "";
  }

  try {
    const response = await fetch("../php/submit-feedback.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        complaint_id: Number(complaintId),
        rating: rating,
        comment: commentInput ? commentInput.value.trim() : "",
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to submit feedback.");
    }

    if (feedbackMessage) {
      feedbackMessage.className = "feedback-success";
      feedbackMessage.textContent = "Feedback submitted successfully.";
    }

    await loadFeedback();
  } catch (error) {
    console.error("Feedback submission error:", error);

    if (feedbackMessage) {
      feedbackMessage.className = "feedback-error";
      feedbackMessage.textContent = error.message;
    }

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Submit Feedback";
    }
  }
}

/* Timeline */

function renderTimeline(timeline) {
  const timelineElement = document.getElementById("timeline");

  if (!timelineElement) {
    return;
  }

  if (!Array.isArray(timeline) || timeline.length === 0) {
    timelineElement.innerHTML = `
      <div class="empty-state">
        No complaint history available.
      </div>
    `;

    return;
  }

  timelineElement.innerHTML = timeline
    .map(function (item) {
      return `
        <div class="timeline-item">

          <div class="timeline-dot"></div>

          <div class="timeline-content">

            <h3 class="timeline-status">
              ${escapeHtml(item.new_status || "-")}
            </h3>

            <p class="timeline-remarks">
              ${escapeHtml(item.remarks || "")}
            </p>

            <p class="timeline-date">
              ${formatDate(item.updated_at)}
            </p>

          </div>

        </div>
      `;
    })
    .join("");
}

/* Notifications */

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
          "complaint-details.html?id=" +
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

/* Helpers */

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

function formatNotificationDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(String(dateString).replace(" ", "T"));

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
