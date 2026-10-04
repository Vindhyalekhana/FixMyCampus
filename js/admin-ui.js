(function () {
  "use strict";

  const adminNavigation = [
    {
      href: "dashboard.html",
      label: "Dashboard",
      icon: "⌂",
      key: "dashboard",
    },
    {
      href: "staff.html",
      label: "Staff Monitoring",
      icon: "♙",
      key: "staff",
    },
    {
      href: "reports.html",
      label: "Reports & Analytics",
      icon: "▥",
      key: "reports",
    },
    {
      href: "dashboard.html#complaintManagement",
      label: "Complaint Management",
      icon: "▤",
      key: "complaints",
    },
    {
      href: "notifications.html",
      label: "Notifications",
      icon: "♧",
      key: "notifications",
    },
    {
      href: "profile.html",
      label: "Profile",
      icon: "◉",
      key: "profile",
    },
    {
      href: "settings.html",
      label: "Settings",
      icon: "⚙",
      key: "settings",
    },
  ];

  function getCurrentPage() {
    const path = window.location.pathname.toLowerCase();

    if (path.endsWith("/staff.html")) {
      return "staff";
    }

    if (path.endsWith("/reports.html")) {
      return "reports";
    }

    if (path.endsWith("/notifications.html")) {
      return "notifications";
    }

    if (path.endsWith("/profile.html")) {
      return "profile";
    }

    if (path.endsWith("/settings.html")) {
      return "settings";
    }

    return "dashboard";
  }

  function buildSidebar() {
    const sidebarNav = document.querySelector(
      ".dashboard-sidebar .sidebar-nav",
    );

    if (!sidebarNav) {
      return;
    }

    const currentPage = getCurrentPage();

    sidebarNav.innerHTML = "";

    adminNavigation.forEach(function (item) {
      const link = document.createElement("a");

      link.href = item.href;
      link.className = "sidebar-link";

      if (item.key === currentPage) {
        link.classList.add("active");
      }

      const icon = document.createElement("span");
      icon.className = "sidebar-icon";
      icon.textContent = item.icon;

      const label = document.createElement("span");
      label.textContent = item.label;

      link.appendChild(icon);
      link.appendChild(label);

      sidebarNav.appendChild(link);
    });
  }

  function normalizeAdminName() {
    const nameElements = [
      document.getElementById("adminName"),
      document.getElementById("headerUserName"),
      document.getElementById("sidebarAdminName"),
      document.getElementById("sidebarUserName"),
    ];

    nameElements.forEach(function (element) {
      if (element) {
        element.textContent = "Admin";
      }
    });

    const userNameContainers = document.querySelectorAll(
      ".dashboard-layout .user-name",
    );

    userNameContainers.forEach(function (container) {
      const strong = container.querySelector("strong");

      if (strong) {
        strong.textContent = "Admin";
      }

      const roleText = container.querySelector("span");

      if (roleText) {
        roleText.remove();
      }
    });
  }

  function normalizeSidebarAdmin() {
    const sidebarUserInfo = document.querySelector(
      ".dashboard-layout .sidebar-user-info",
    );

    if (!sidebarUserInfo) {
      return;
    }

    const name = sidebarUserInfo.querySelector("strong");

    if (name) {
      name.textContent = "Admin";
    }

    const role = sidebarUserInfo.querySelector("span");

    if (role) {
      role.textContent = "Admin";
    }
  }

  function initialize() {
    buildSidebar();
    normalizeAdminName();
    normalizeSidebarAdmin();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
