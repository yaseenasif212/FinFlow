

> The robust, secure Node.js backend powering the FinFlow Digital Vault fintech ecosystem. 

This repository contains the backend architecture, RESTful API, and database controllers for FinFlow. It handles secure user authentication, complex ledger mathematics, virtual credit card generation, and real-time financial analytics.

## 🚀 Tech Stack
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** Microsoft SQL Server (via `mssql`)
* **Security:** JSON Web Tokens (JWT) & bcrypt for password hashing
* **Document Generation:** `pdfkit` for dynamic PDF bank statements

## 🎯 Core Features Built
* **🔐 Secure Authentication:** Enterprise-grade password hashing and JWT-based route protection.
* **💸 Real-Time Ledger System:** Atomic transaction handling ensuring zero data loss during fund transfers.
* **💳 Virtual Credit Cards (Burner Cards):** Application logic, dynamic limit tracking, and instant secure deletion.
* **📊 Smart Analytics Engine:** Algorithmic calculation of user credit scores based on liquidity, transaction volume, and credit utilization.
* **📄 PDF Statement Generator:** On-the-fly generation of formatted, downloadable account statements.

## 🛠️ Local Setup Instructions



FinFlow
Team Members:
Talmeez ur Rehman (Roll No. 24L-2576)
M. Yaseen Asif (Roll No. 24L-2515)
Taimur Amir (Roll No. 24L-2518)

Tech Stack:
Backend: Node.js, Express.js
Frontend: React, Vite, Tailwind CSS (v4)
Database: SQL Server (MSSQL)

How to Run:
Database Setup:
Open SQL Server Management Studio (SSMS).
Execute the scripts found in the [database/] folder to set up the tables.

Backend:
cd backend
npm install --legacy-peer-deps
npx nodemon server.js

(Make sure to copy .env.example to .env and fill in your actual database credentials before running)

Frontend:
cd frontend
npm install --legacy-peer-deps
npm run dev