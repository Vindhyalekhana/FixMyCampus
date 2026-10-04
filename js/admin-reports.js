document.addEventListener("DOMContentLoaded", () => {
  initializeReports();
});

let csrfToken = "";

async function initializeReports() {
  try {
    const authResponse = await fetch("../php/auth.php", {
      credentials: "same-origin",
    });

    const auth = await authResponse.json();

    if (!auth.authenticated || auth.role !== "admin") {
      window.location.href = "../login.html";
      return;
    }

    setupUser(auth);

    await loadCsrfToken();

    setupLogout();
    setupNotifications();

    await loadReports();
  } catch (error) {
    console.error("Reports initialization failed:", error);

    showReportError("Unable to initialize the reports page.");
  }
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

async function loadReports() {
  try {
    const response = await fetch("../php/admin-reports.php", {
      credentials: "same-origin",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load reports.");
    }

    renderSummary(data.summary);
    renderStatusBars(data.status);
    renderPriorityBars(data.priority);
    renderCategoryBars(data.categories);
    renderResolution(data.resolution);
    renderMonthlyBars(data.monthly);
    renderStaff(data.staff);
    renderRecentComplaints(data.recent);

    const loading = document.getElementById("reportLoading");

    const content = document.getElementById("reportContent");

    if (loading) {
      loading.style.display = "none";
    }

    if (content) {
      content.style.display = "block";
    }
  } catch (error) {
    console.error("Report loading failed:", error);

    showReportError(error.message || "Unable to load reports.");
  }
}

function renderSummary(summary) {
  setText("totalComplaints", summary.total_complaints);

  setText("pendingComplaints", summary.pending_complaints);

  setText("inProgressComplaints", summary.in_progress_complaints);

  setText("closedComplaints", summary.closed_complaints);
}

function renderStatusBars(rows) {
  renderBars("statusBars", rows, "status", "total");
}

function renderPriorityBars(rows) {
  renderBars("priorityBars", rows, "priority", "total");
}

function renderCategoryBars(rows) {
  renderBars("categoryBars", rows, "category_name", "total");
}

function renderBars(containerId, rows, labelKey, valueKey) {
  const container = document.getElementById(containerId);

  if (!container) {
    return;
  }

  if (!rows || rows.length === 0) {
    container.innerHTML = `
      <div class="report-empty">
        No data available.
      </div>
    `;

    return;
  }

  const maximum = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 1);

  container.innerHTML = rows
    .map((row) => {
      const label = String(row[labelKey] || "");

      const value = Number(row[valueKey]) || 0;

      const percentage = (value / maximum) * 100;

      return `
        <div class="report-bar-row">

          <div
            class="report-bar-label"
            title="${escapeHtml(label)}"
          >
            ${escapeHtml(label)}
          </div>

          <div class="report-bar-track">
            <div
              class="report-bar-fill"
              style="width: ${percentage}%"
            ></div>
          </div>

          <div class="report-bar-value">
            ${value}
          </div>

        </div>
      `;
    })
    .join("");
}

function renderResolution(resolution) {
  const hours = Number(resolution.average_resolution_hours) || 0;

  setText("averageResolution", `${hours} hours`);

  setText("resolvedTotal", resolution.resolved_total || 0);
}

function renderMonthlyBars(rows) {
  const container = document.getElementById("monthlyBars");

  if (!container) {
    return;
  }

  if (!rows || rows.length === 0) {
    container.innerHTML = `
      <div class="report-empty">
        No monthly complaint data available.
      </div>
    `;

    return;
  }

  const maximum = Math.max(...rows.map((row) => Number(row.total) || 0), 1);

  container.innerHTML = rows
    .map((row) => {
      const value = Number(row.total) || 0;

      const percentage = (value / maximum) * 100;

      return `
        <div class="report-month-row">

          <div class="report-bar-label">
            ${escapeHtml(formatMonth(row.month))}
          </div>

          <div class="report-bar-track">
            <div
              class="report-bar-fill"
              style="width: ${percentage}%"
            ></div>
          </div>

          <div class="report-bar-value">
            ${value}
          </div>

        </div>
      `;
    })
    .join("");
}

function renderStaff(rows) {
  const body = document.getElementById("staffReportBody");

  if (!body) {
    return;
  }

  if (!rows || rows.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="report-empty">
            No staff data available.
          </div>
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = rows
    .map((staff) => {
      const status = String(staff.status || "");

      const statusClass =
        status.toLowerCase() === "active" ? "active" : "inactive";

      return `
        <tr>

          <td>
            <strong>
              ${escapeHtml(staff.name || "Unknown")}
            </strong>
          </td>

          <td>
            <span
              class="report-status ${statusClass}"
            >
              ${escapeHtml(status)}
            </span>
          </td>

          <td>
            ${Number(staff.active_workload || 0)}
          </td>

          <td>
            ${Number(staff.resolved_count || 0)}
          </td>

          <td>
            ${Number(staff.closed_count || 0)}
          </td>

        </tr>
      `;
    })
    .join("");
}

function renderRecentComplaints(rows) {
  const body = document.getElementById("recentReportBody");

  if (!body) {
    return;
  }

  if (!rows || rows.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="report-empty">
            No complaints available.
          </div>
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = rows
    .map((complaint) => {
      return `
        <tr>

          <td>
            <strong>
              ${escapeHtml(complaint.complaint_code || "")}
            </strong>

            <div>
              ${escapeHtml(complaint.title || "")}
            </div>
          </td>

          <td>
            ${escapeHtml(complaint.student_name || "")}
          </td>

          <td>
            ${escapeHtml(complaint.category_name || "")}
          </td>

          <td>
            ${escapeHtml(complaint.priority || "")}
          </td>

          <td>
            <span class="report-status">
              ${escapeHtml(complaint.status || "")}
            </span>
          </td>

          <td>
            ${formatDate(complaint.created_at)}
          </td>

        </tr>
      `;
    })
    .join("");
}

function setupUser(auth) {
  const name = auth.name || "Administrator";

  const initials = getInitials(name);

  setText("sidebarUserName", name);

  setText("headerUserName", name);

  setText("sidebarAvatar", initials);

  setText("profileAvatar", initials);
}

function setupLogout() {
  const button = document.getElementById("logoutButton");

  if (!button) {
    return;
  }

  button.addEventListener("click", async () => {
    if (!csrfToken) {
      console.error("CSRF token is not available.");
      window.location.href = "../login.html";
      return;
    }

    try {
      await fetch("../php/logout.php", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRF-TOKEN": csrfToken,
        },
      });
    } finally {
      window.location.href = "../login.html";
    }
  });
}

function setupNotifications() {
  const button = document.getElementById("notificationButton");

  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    const panel = document.getElementById("notificationPanel");

    if (!panel) {
      return;
    }

    panel.classList.toggle("show");
  });
}

function showReportError(message) {
  const error = document.getElementById("reportError");

  const loading = document.getElementById("reportLoading");

  if (error) {
    error.textContent = message;
    error.style.display = "block";
  }

  if (loading) {
    loading.style.display = "none";
  }
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = String(value ?? "");
  }
}

function getInitials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "AD";
  }

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatMonth(value) {
  if (!value) {
    return "";
  }

  const parts = String(value).split("-");

  if (parts.length !== 2) {
    return value;
  }

  const year = Number(parts[0]);

  const month = Number(parts[1]);

  if (!year || !month) {
    return value;
  }

  const date = new Date(year, month - 1, 1);

  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function escapeHtml(value) {
  const div = document.createElement("div");

  div.textContent = String(value ?? "");

  return div.innerHTML;
}
