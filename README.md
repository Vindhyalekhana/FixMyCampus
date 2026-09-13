Absolutely. Below is the **complete text content** of all six FixMyCampus documents, so you can copy them directly into Word/VS Code.

---

# 1. README DOCUMENT

# FixMyCampus

**Campus Issue Reporting & Resolution Platform**

**Version:** 1.0
**Date:** 06 September 2026
**Local URL:** `http://localhost/FixMyCampus/`

---

## 1. Overview

FixMyCampus is a role-based web application designed for reporting, assigning, tracking, resolving, and closing campus infrastructure complaints.

The system connects three primary roles:

- Students
- Maintenance Staff
- Administrators

Students can report infrastructure problems and track their complaints. Administrators review complaints and assign them to appropriate staff members. Staff members process assigned complaints and update their status. Once a complaint is marked **Resolved**, the student can confirm the resolution and close the complaint.

The system also provides:

- Complaint timelines
- Notifications
- Student–Staff complaint-specific chat
- Feedback after closure
- XML complaint export
- XSD validation
- DTD validation
- Role-based access control
- Server-side authorization

---

## 2. Objectives

The main objectives of FixMyCampus are:

- Provide students with a simple method to report campus infrastructure problems.
- Allow administrators to review and assign complaints.
- Allow maintenance staff to manage assigned complaints.
- Allow students to track complaint progress.
- Maintain a complete complaint status history.
- Enable communication between students and assigned staff.
- Notify users about important complaint events.
- Collect feedback after complaint resolution.
- Demonstrate XML, XSD, and DTD technologies.

---

## 3. User Roles

### 3.1 Student

Students can:

- Register and log in.
- Create complaints.
- View their own complaints.
- View complaint details.
- Track complaint status.
- View complaint timeline.
- View assigned staff information where applicable.
- Communicate with assigned staff.
- Confirm resolution.
- Close resolved complaints.
- Submit feedback after closure.

Students cannot:

- View other students' complaints.
- Assign complaints.
- Access staff-only complaints.
- Access administrator functionality.
- Close complaints before they are resolved.

---

### 3.2 Staff

Staff members can:

- Log in.
- View complaints assigned to them.
- View complaint details.
- Update complaint status.
- Add remarks.
- Mark complaints as Resolved.
- Communicate with the complaint owner.

Staff cannot:

- View complaints assigned to other staff members.
- Close complaints.
- Access administrator functionality.
- View student phone numbers through staff complaint views.

---

### 3.3 Admin

Administrators can:

- Log in.
- View all complaints.
- View complaint details.
- View student contact information.
- Assign complaints to staff.
- Monitor complaint progress.
- View complaint timelines.
- Manage operational assignment.

---

# 4. Complaint Lifecycle

The main complaint workflow is:

```text
Submitted
     ↓
Under Review
     ↓
Assigned
     ↓
In Progress
     ↓
Resolved
     ↓
Closed
```

Additional database-supported statuses include:

```text
Rejected
Duplicate
```

### Important Workflow Rule

Staff members are responsible for marking complaints **Resolved**.

The student is responsible for confirming the resolution and moving the complaint to **Closed**.

Therefore:

```text
Staff → Resolved
Student → Closed
```

---

# 5. Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript

### Backend

- PHP

### Database

- MySQL 9.7.1

### Web Server

- Apache through XAMPP

### Data Technologies

- XML
- XSD
- DTD

### Authentication

- PHP Sessions
- `password_hash()`
- `password_verify()`

### Operating Environment

- Windows

---

# 6. Project Structure

```text
FixMyCampus/
│
├── admin/
│   ├── dashboard.html
│   └── complaint-details.html
│
├── css/
│   ├── auth.css
│   ├── style.css
│   ├── dashboard.css
│   ├── complaint-details.css
│   ├── chat.css
│   └── notifications.css
│
├── database/
│   └── fixmycampus.sql
│
├── js/
│   ├── auth.js
│   ├── dashboard.js
│   ├── report.js
│   ├── report-notifications.js
│   ├── complaint-details.js
│   ├── student-chat.js
│   ├── staff-dashboard.js
│   ├── staff-complaint-details.js
│   ├── staff-chat.js
│   ├── admin-dashboard.js
│   └── admin-complaint-details.js
│
├── php/
│   ├── auth.php
│   ├── login.php
│   ├── logout.php
│   ├── register.php
│   ├── db.php
│   ├── create-complaint.php
│   ├── student-complaints.php
│   ├── complaint-details.php
│   ├── close-complaint.php
│   ├── staff-complaints.php
│   ├── staff-complaint-details.php
│   ├── update-status.php
│   ├── admin-complaints.php
│   ├── admin-complaint-details.php
│   ├── assign-staff.php
│   ├── staff-list.php
│   ├── chat-messages.php
│   ├── send-message.php
│   ├── mark-message-read.php
│   ├── notifications.php
│   ├── mark-notification-read.php
│   ├── mark-all-notifications-read.php
│   ├── submit-feedback.php
│   ├── get-feedback.php
│   ├── categories.php
│   ├── locations.php
│   ├── export-complaint-xml.php
│   └── validate-complaint-xml.php
│
├── staff/
│
├── student/
│
├── xml/
│   ├── complaint.xml
│   ├── complaint.xsd
│   └── complaint.dtd
│
├── index.html
├── login.html
└── register.html
```

---

# 7. Database Tables

The system contains the following major tables:

### users

Stores authentication and user information.

### categories

Stores complaint categories.

### locations

Stores campus locations.

### complaints

Stores complaint information.

### complaint_updates

Stores complaint status history and remarks.

### staff_assignments

Stores staff assignment information.

### messages

Stores complaint-specific chat messages.

### notifications

Stores user notifications.

### feedback

Stores student feedback after complaint closure.

---

# 8. Security

FixMyCampus implements server-side security controls.

These include:

- Session-based authentication.
- Role-based authorization.
- Complaint ownership validation.
- Staff assignment validation.
- Complaint-specific chat authorization.
- Server-side closure validation.
- Closed-chat message blocking.
- Password hashing.
- Parameterized database operations.
- Foreign-key constraints.

Security is not dependent only on frontend buttons or hidden pages.

---

# 9. XML, XSD and DTD

The system supports complaint XML export.

Example endpoint:

```text
php/export-complaint-xml.php?complaint_id=<id>
```

XML validation uses:

```text
xml/complaint.xsd
xml/complaint.dtd
```

The system validates complaint XML against both:

- XSD
- DTD

---

# 10. Local Setup

### Step 1

Install XAMPP.

### Step 2

Start Apache from XAMPP.

### Step 3

Start MySQL 9.7.1.

### Step 4

Create/import the database:

```text
fixmycampus
```

using:

```text
database/fixmycampus.sql
```

### Step 5

Verify the database configuration in:

```text
php/db.php
```

### Step 6

Place the project in:

```text
C:\xampp\htdocs\FixMyCampus
```

### Step 7

Open:

```text
http://localhost/FixMyCampus/
```

---

# 11. Testing

The following should be tested:

- Registration
- Login
- Logout
- Complaint creation
- Complaint visibility
- Admin assignment
- Staff complaint access
- Staff status updates
- Resolution
- Student closure
- Feedback
- Notifications
- Student–Staff chat
- Closed-chat restriction
- XML export
- XSD validation
- DTD validation
- Unauthorized access attempts

---

# 12. Academic Scope

The project demonstrates:

- HTML
- CSS
- JavaScript
- PHP
- MySQL
- XML
- XSD
- DTD
- Authentication
- Authorization
- CRUD operations
- Database relationships
- Form validation
- Notifications
- Chat functionality
- Role-based workflows

---
