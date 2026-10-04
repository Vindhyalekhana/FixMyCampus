# FixMyCampus

**Campus Issue Reporting & Resolution Platform**

**Version:** 1.0  
**Date:** 06 October 2026  
**Local URL:** `http://projects.local/fixmycampus/v1/`

---

## 1. Overview

FixMyCampus is a role-based web application designed for reporting, assigning, tracking, resolving, and closing campus infrastructure complaints.

The system connects three primary roles:

- Students
- Maintenance Staff
- Administrators

Students can report infrastructure problems and track their complaints. Administrators review complaints and manage staff assignments. Staff members process assigned complaints and update their status. Once a complaint is marked **Resolved**, the student can confirm the resolution and close the complaint.

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
- CSRF protection
- Secure session handling
- Password hashing

---

## 2. Objectives

The main objectives of FixMyCampus are:

- Provide students with a simple method to report campus infrastructure problems.
- Allow administrators to review and manage complaints.
- Allow administrators to assign complaints to appropriate staff members.
- Allow maintenance staff to manage assigned complaints.
- Allow students to track complaint progress.
- Maintain a complete complaint status history.
- Enable communication between students and assigned staff.
- Notify users about important complaint events.
- Collect feedback after complaint resolution.
- Demonstrate XML, XSD, and DTD technologies.
- Implement server-side authentication and authorization.

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
- Manage their profile.
- Change their password.

Students cannot:

- View other students' complaints.
- Assign complaints.
- Access staff-only complaints.
- Access administrator functionality.
- Close complaints before they are resolved.
- Access another user's complaint-specific chat.

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
- Manage their profile.
- Change their password.

Staff cannot:

- View complaints assigned to other staff members.
- Close complaints.
- Access administrator functionality.
- Access unauthorized complaint chats.
- View restricted student information through staff complaint views.

---

### 3.3 Admin

Administrators can:

- Log in.
- View all complaints.
- View complaint details.
- View relevant student information.
- Assign complaints to staff.
- Monitor complaint progress.
- View complaint timelines.
- Manage staff accounts.
- Create staff accounts.
- Edit staff information.
- Enable or disable staff accounts.
- Reset staff passwords.
- Change administrator password.
- Manage staff categories.
- View administrative reports.

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
````

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

* HTML5
* CSS3
* JavaScript

### Backend

* PHP

### Database

* MySQL

### Web Server

* Apache through XAMPP

### Data Technologies

* XML
* XSD
* DTD

### Authentication and Security

* PHP Sessions
* `password_hash()`
* `password_verify()`
* CSRF protection
* Role-based authorization
* PDO prepared statements
* Secure session cookie configuration

### Operating Environment

* Windows

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
│   ├── notifications.css
│   └── admin-fixes.css
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
│   ├── security.php
│   ├── csrf-token.php
│   │
│   ├── create-complaint.php
│   ├── student-complaints.php
│   ├── complaint-details.php
│   ├── close-complaint.php
│   │
│   ├── staff-complaints.php
│   ├── staff-complaint-details.php
│   ├── staff-list.php
│   ├── update-status.php
│   │
│   ├── admin-complaints.php
│   ├── admin-complaint-details.php
│   ├── admin-staff.php
│   ├── admin-create-staff.php
│   ├── admin-edit-staff.php
│   ├── admin-toggle-staff.php
│   ├── admin-reset-staff-password.php
│   ├── admin-change-password.php
│   ├── admin-staff-categories.php
│   └── admin-reports.php
│
│   ├── change-password.php
│   ├── profile.php
│   ├── update-profile.php
│   ├── upload-profile-picture.php
│   │
│   ├── chat-messages.php
│   ├── send-message.php
│   ├── notifications.php
│   ├── mark-notification-read.php
│   ├── mark-all-notifications-read.php
│   │
│   ├── submit-feedback.php
│   ├── get-feedback.php
│   ├── categories.php
│   ├── locations.php
│   │
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
├── .env
├── .gitignore
├── index.html
├── login.html
├── register.html
└── README.md
```

> The `.env` file contains local database configuration and must not be committed to the public repository.

---

# 7. Database

The application uses the `fixmycampus` MySQL database.

The database schema is provided in:

```text
database/fixmycampus.sql
```

Major tables include:

### users

Stores authentication, role, and user information.

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

The database uses relationships and foreign-key constraints to maintain data integrity.

---

# 8. Security

FixMyCampus implements server-side security controls.

These include:

* Session-based authentication.
* Role-based authorization.
* CSRF protection.
* Secure session cookie configuration.
* Complaint ownership validation.
* Staff assignment validation.
* Complaint-specific chat authorization.
* Server-side closure validation.
* Closed-chat message blocking.
* Password hashing.
* Password verification.
* PDO prepared statements.
* Parameterized database operations.
* Foreign-key constraints.
* Input validation.
* Authentication checks on protected endpoints.

Security is not dependent only on frontend buttons, hidden pages, or JavaScript checks.

The centralized security functionality is implemented in:

```text
php/security.php
```

Database configuration is loaded from:

```text
.env
```

The `.env` file is excluded from version control through:

```text
.gitignore
```

---

# 9. XML, XSD and DTD

The system supports complaint XML export and validation.

### XML Export

Example endpoint:

```text
php/export-complaint-xml.php?complaint_id=<id>
```

### XML Validation Files

```text
xml/complaint.xsd
xml/complaint.dtd
```

The project demonstrates validation using both:

* XSD
* DTD

The validation endpoint is:

```text
php/validate-complaint-xml.php
```

---

# 10. Environment Configuration

Database credentials are stored in the `.env` file.

Example structure:

```text
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fixmycampus
DB_USER=root
DB_PASSWORD=your_database_password
```

Do not commit real database credentials to GitHub.

The `.env` file is excluded through:

```text
.gitignore
```

Database connections are handled by:

```text
php/db.php
```

---

# 11. Local Setup

### Step 1 — Install XAMPP

Install XAMPP with Apache and MySQL.

### Step 2 — Start Apache

Open the XAMPP Control Panel and start:

```text
Apache
```

### Step 3 — Start MySQL

Start:

```text
MySQL
```

### Step 4 — Create the Database

Create a database named:

```text
fixmycampus
```

Import:

```text
database/fixmycampus.sql
```

using phpMyAdmin or the MySQL command line.

### Step 5 — Configure Environment Variables

Create the local `.env` file in the project root:

```text
.env
```

Configure:

```text
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fixmycampus
DB_USER=root
DB_PASSWORD=your_database_password
```

Use the actual local MySQL password for your environment.

### Step 6 — Configure Apache

Place the project in the Apache web root or configure an Apache VirtualHost/Alias pointing to the project directory.

For a standard XAMPP installation, the project can be placed at:

```text
C:\Users\vindh\Desktop\projects\fixmycampus\v1
```

### Step 7 — Open the Application

Open:

```text
http://projects.local/fixmycampus/v1/
```

---

# 12. Testing

The following functionality should be tested:

### Authentication

* Registration
* Login
* Logout
* Password verification
* Authentication of protected endpoints
* Unauthorized access attempts

### Student Features

* Complaint creation
* Complaint visibility
* Complaint details
* Complaint timeline
* Assigned staff information
* Resolution confirmation
* Complaint closure
* Feedback submission
* Profile management
* Password change

### Staff Features

* Staff login
* Assigned complaint access
* Complaint details
* Status updates
* Remarks
* Resolution
* Student–Staff chat
* Profile management
* Password change

### Admin Features

* View all complaints
* Complaint details
* Staff management
* Create staff
* Edit staff
* Enable/disable staff
* Reset staff password
* Staff category management
* Administrative reports
* Complaint assignment

### Communication

* Notifications
* Notification read status
* Student–Staff chat
* Complaint-specific chat authorization
* Closed-chat restrictions

### XML

* Complaint XML export
* XML validation
* XSD validation
* DTD validation

### Security

* Role-based authorization
* CSRF protection
* Complaint ownership checks
* Staff assignment checks
* Protected endpoint access
* Session security

---

# 13. Academic Scope

The project demonstrates:

* HTML
* CSS
* JavaScript
* PHP
* MySQL
* XML
* XSD
* DTD
* Authentication
* Authorization
* Role-Based Access Control
* CRUD operations
* Database relationships
* Form validation
* Session management
* CSRF protection
* Password hashing
* Notifications
* Chat functionality
* Complaint workflows
* Server-side security
* XML validation

---

# 14. Future Enhancements

Possible future enhancements include:

* Email notifications.
* Mobile application.
* Advanced analytics dashboards.
* Real-time chat using WebSockets.
* Cloud deployment.
* File and image attachments for complaints.
* Advanced complaint search and filtering.
* Automated SLA monitoring.
* Additional reporting and analytics.

---

# 15. Project Status

FixMyCampus is developed as an academic web application demonstrating a complete campus complaint management workflow with:

* Student complaint reporting
* Administrative complaint management
* Staff assignment and resolution
* Complaint-specific communication
* Notifications
* Feedback
* XML processing
* Role-based access control
* Server-side security

