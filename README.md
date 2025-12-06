

# Sport Sync (Balayan Smasher Hub) - Backend API

   

## 📋 Project Overview

**Sport Sync** is a robust backend REST API designed to power the Point of Sale (POS) and Inventory Management System for *Balayan Smasher Hub*. Built with Node.js and Express, this system manages real-time inventory tracking, sales transactions, automated reporting, role-based user authentication, and audit logging to ensure operational efficiency and data integrity.

This system addresses critical business problems such as inventory shrinkage, manual reporting errors, and inefficient sales tracking through automated workflows and robust data architectural design.

-----

## 🎓 Academic Submission Statement

This software project is submitted in partial fulfillment of the requirements for the following courses under the supervision of **Sir TALAOC, IVAN GABRIEL B.** and **Engr. CASTILLO, JEAN KARLA M.**:

| Course Code | Course Title | Requirement Fulfillment |
| :--- | :--- | :--- |
| **IT 313** | **System Analysis and Design** | Implements logical data modeling and business rules via **Role-Based Access Control (RBAC)** and automated logic analysis (Scheduler Service). |
| **IT 312** | **Systems Integration and Architecture** | Demonstrates **MVC Architecture** integrating disparate systems: Database (MySQL), Web Server (Express), and File Systems (PDF/Excel generation). |
| **IT 314** | **Web Systems and Technologies** | Features a secure **RESTful API** utilizing standard HTTP methods, stateless **JWT Authentication**, and dynamic JSON payload processing. |

-----

## ✨ Key Features

### 🔐 Authentication & Security (IT 314)

  * **Role-Based Access Control (RBAC):** Distinct permissions/middleware for `Admin`, `Staff`, and `Cashier`.
  * **Secure Auth:** Stateless JWT (JSON Web Tokens) with Refresh Token rotation stored in secure HTTP-only cookies.
  * **Defense Depth:** Account lockout after multiple failed login attempts, dynamic session timeouts, and password hashing using `bcryptjs`.

### 📦 Inventory Management (IT 313)

  * **Product Tracking:** Complete CRUD operations for products and categories.
  * **Real-time Updates:** Automatic stock deductions upon transaction completion.
  * **Smart Alerts:** Automated system notifications for `Low Stock` and `Critical Stock` levels based on configurable thresholds.
  * **Barcode Support:** Optimized lookup endpoints for hardware POS scanners.

### 💰 Point of Sale & Transactions

  * **Transaction Processing:** Support for mixed payment methods (Cash, Card, GCash) with validation.
  * **Receipt Generation:** Automated PDF receipt generation using `pdfkit` integration.
  * **Validation Logic:** Prevents sales of out-of-stock items and validates total calculations server-side.

### 📊 Reporting & Analytics (IT 312)

  * **Dashboard:** Aggregates real-time KPIs (Total Revenue, Transactions, Top Products).
  * **Automated Scheduling:** `node-cron` jobs generate Daily, Weekly, and Monthly sales reports automatically without user intervention.
  * **Export Capabilities:** Download reports in **PDF** or **Excel** formats using file stream integration.

### 🛡️ Auditing & Logs

  * **Audit Trail:** Database-level tracking of all critical system actions (User creation, Stock adjustments, Deletions).
  * **System Logs:** File-based logging for scheduler events and error tracking.

-----

## 🛠️ Technology Stack

  * **Runtime Environment:** Node.js
  * **Web Framework:** Express.js (MVC Pattern)
  * **Database:** MySQL (via `mysql2` with connection pooling)
  * **Authentication:** `jsonwebtoken`, `bcryptjs`, `cookie-parser`
  * **Validation:** `express-validator`
  * **File Generation:** `pdfkit` (PDFs), `exceljs` (Spreadsheets)
  * **Scheduling:** `node-cron`

-----

## 🚀 Getting Started

### Prerequisites

  * Node.js (v14 or higher)
  * MySQL Server
  * npm (Node Package Manager)

### Installation

1.  **Clone the Repository**

    ```bash
    git clone https://github.com/yourusername/sport-sync-backend.git
    cd sport-sync-backend
    ```

2.  **Install Dependencies**

    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory:

    ```env
    PORT=3000

    # Database Configuration
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_password
    DB_NAME=sport_sync_db
    DB_PORT=3306

    # Security Secrets
    JWT_SECRET=your_super_secret_key_here
    REFRESH_TOKEN_SECRET=your_refresh_secret_key_here

    # System Settings
    ENABLE_CRON=true
    ```

4.  **Database Setup**
    Import the provided SQL schema into your MySQL instance to create the required tables (`users`, `products`, `transactions`, `audit_log`, etc.).

5.  **Run the Server**

      * **Development Mode:** `npm run dev`
      * **Production Mode:** `npm start`

-----

## 📚 API Documentation

### 🟢 Authentication

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticate user and receive tokens. |
| `POST` | `/api/auth/register` | Admin | Create a new user account. |
| `GET` | `/api/auth/refresh` | Public | Refresh access token using cookie. |
| `GET` | `/api/auth/logout` | Public | Clear auth cookies. |

### 📦 Products & Inventory

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | All | Get all products (supports filtering). |
| `GET` | `/api/products/barcode/:code`| All | Find product by barcode scanner. |
| `POST` | `/api/products` | Admin/Staff | Add a new product to inventory. |
| `PATCH`| `/api/products/:id/stock` | Admin/Staff | Adjust stock quantity manually. |

### 💳 Transactions

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/transactions` | Cashier/Admin | Create a new sale/transaction. |
| `GET` | `/api/transactions` | Admin | View transaction history. |
| `GET` | `/api/transactions/:id/receipt`| All | Download PDF receipt. |

### 📈 Reports

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reports/sales` | Admin | Get detailed sales analytics. |
| `GET` | `/api/reports/inventory` | Admin | Get inventory valuation and low stock report. |
| `GET` | `/api/reports/download` | Admin | Download specific report (PDF/Excel). |
| `POST` | `/api/admin/trigger/daily` | Admin | Manually trigger daily report generation. |

-----

## ⚙️ Architecture Highlights

### Database Connection (`db/connection.js`)

The system utilizes a **Connection Pool** pattern to efficiently manage MySQL connections. This ensures the application can handle multiple concurrent API requests without the overhead of establishing a new connection handshake for every query, demonstrating efficient **System Architecture (IT 312)**.

### Scheduler (`config/cron.js`)

Automated maintenance tasks are handled via `node-cron`, fulfilling **System Analysis (IT 313)** requirements for automated processes.

  * **Daily Report:** Runs at 23:59 daily.
  * **Weekly Report:** Runs at 23:59 every Sunday.
  * **Monthly Report:** Runs on the 1st of every month.

### Dynamic Settings (`models/settingModel.js`)

System parameters such as `session_timeout`, `max_login_attempts`, and `stock_thresholds` are persisted in the database. This allows Administrators to configure system behavior dynamically without requiring a server restart or code deployment.

-----

## 👥 Contributors

* **[Bagunas Johnrey](https://github.com/BagunasJohnrey)** - Project Leader / Manager, Backend Developer
* **[De Castro Jeric](https://github.com/decastrojeric)** - Backend Developer
* **[Causapin Ivere Grace](https://github.com/iverene)** - Backend & Frontend Developer
* **[Manimtim Hazel Ann](https://github.com/Hazelannmanimtim02)** - Frontend Developer
* **[Pagkaliwagan Noilee](https://github.com/NoileeAnnPagkaliwagan)** - Frontend Developer

> **Note:** All members listed above actively contributed to the **Documentation** and **Quality Assurance (QA)** of this project.

-----

© 2025 Sport Sync Backend. All Rights Reserved.
