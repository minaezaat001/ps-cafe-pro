# 🎮 PS Cafe Pro - Premium Management Suite

A modern, high-performance, full-stack application for managing PC and PlayStation Cafes. Built with **Next.js 15**, **Prisma ORM**, and **SQLite**.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (comes with Node.js)

### 2. Setup & Installation
Navigate to the project directory and run:

```bash
# Install dependencies
npm install

# Initialize Database & Client
npx prisma generate
npx prisma db push
```

### 3. Run Development Server
```bash
npm run dev
```
npm run build
 npm run start


Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Access Credentials

Use these credentials to log in to the management dashboard:
- **Username**: `admin`
- **Password**: `admin123`

---

## ✨ Key Features
- **Glassmorphism UI**: High-end gaming aesthetic with neon accents.
- **Device Management**: Add/Edit/Delete PC & PS stations.
- **Session Billing**: Real-time cost calculation with Single/Multi support.
- **Cafeteria & Inventory**: Manage snacks/drinks with automatic stock reduction.
- **Advanced Reports**: Daily revenue and shift activity logs.
- **Device Transfer**: Seamlessly move sessions between stations.

---

## 📁 Project Structure
- `src/app`: Application routes and pages.
- `src/components`: Reusable UI components (Sidebar, DeviceCard, etc.).
- `src/app/actions.ts`: Server Actions for database interaction.
- `prisma/schema.prisma`: Relational database schema.
- `prisma/dev.db`: Persistent SQLite database file.




npm install

npx prisma generate

npm run build



Set-ExecutionPolicy RemoteSigned -Scope CurrentUser 