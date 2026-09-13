# 🏪 Jan Aushadhi — Kendra Seller Central (`apps/seller`)

The dedicated partner console for Jan Aushadhi Kendra operators and licensed pharmacists. It allows pharmacy owners to manage local medicine stock levels, process incoming pickup and delivery orders, track daily revenue and customer savings, and configure their digital payment profiles.

---

## 🌟 Key Features

* **Scoped Order Operations**: Pharmacists view and fulfill only orders assigned to their unique store (`pmbjk_code`), enforcing strict tenant boundaries.
* **Order Lifecycle State Transitions**: Enforces business rules across `PENDING_ACCEPTANCE` → `ACCEPTED` → `PREPARING` → `READY_FOR_PICKUP` → `COMPLETED` with immutable audit logging.
* **Real-time Inventory Overrides**: Instantaneous toggling of in-stock / out-of-stock states for the PMBJP generic catalog via atomic SQL UPSERT queries.
* **Store Profile & UPI Management**: Operators configure operating hours, phone numbers, and UPI Virtual Payment Addresses (`upi_vpa`) for direct patient payment settlements.
* **Daily Telemetry & Reports**: Visual breakdowns of daily order volumes, gross merchandise value (GMV), customer savings generated, and CSV order export.

---

## 🏗️ Directory Architecture

```
apps/seller/src/
├── assets/                 # Icons and visual assets
├── components/
│   └── layout/             # Modular enterprise layout architecture
│       ├── Sidebar.jsx     # Navigation drawer with Kendra branding and logout
│       ├── TopBar.jsx      # Sticky context header, greetings, and alert bells
│       ├── DashboardLayout.jsx # Framer-motion page transition shell
│       ├── Loader.jsx      # Branded hydration spinner
│       └── AccessDenied.jsx# RBAC security gate for non-operator sessions
├── pages/                  # Routed views
│   ├── Login.jsx           # Store code & operator authentication
│   ├── Dashboard.jsx       # Real-time metrics, active orders, today's revenue
│   ├── Orders.jsx          # Order lifecycle management and rejection modal
│   ├── Inventory.jsx       # Generic catalog stock search and toggle switches
│   ├── StoreProfile.jsx    # VPA configuration and operating hours
│   └── Reports.jsx         # Analytics charts, daily breakdown, CSV export
├── services/               # API clients (`seller.api.js`)
├── store/                  # State management
│   └── authStore.js        # Operator session and store profile cache
├── App.jsx                 # Lightweight 34-line root coordinator
└── main.jsx                # React DOM entrypoint
```

---

## 💻 Available Scripts

Run commands from the monorepo root or within `apps/seller`:

```bash
# Run local Vite development server (http://localhost:5174)
npm run dev:seller

# Validate code syntax and styling via ESLint
npm run lint:seller

# Build optimized production bundle to dist/
npm run build:seller
```
