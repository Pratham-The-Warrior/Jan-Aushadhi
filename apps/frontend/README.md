# 🏥 Jan Aushadhi — Patient Discovery Web Portal (`apps/frontend`)

The primary consumer-facing web application for the Jan Aushadhi platform. It enables patients to discover affordable PMBJP generic medicine alternatives to expensive commercial brand names, evaluate side-by-side price savings, manage medical shopping baskets, and route fulfillment to nearby Kendra pharmacies using geolocation.

---

## 🌟 Key Features

* **Instant Molecule Search & Autocomplete**: Sub-15ms search results powered by Meilisearch, mapping branded trade names to chemical salt compositions.
* **Side-by-Side Savings Evaluation**: Instantaneous calculation of absolute cost difference and percentage savings (often up to 80–90%).
* **"Merge & Max" Basket Synchronization**: Seamless merging of guest shopping baskets into persistent account baskets upon user sign-in via PostgreSQL `JSONB`.
* **Geolocation-Aware Store Discovery**: PostGIS-powered nearby Kendra search within a 10km radius with interactive Leaflet map views.
* **Direct P2P UPI QR Checkouts**: Dynamic QR code generation for middleman-free, instant payment directly to the fulfilling Kendra's bank account.
* **WhatsApp Order Handoff**: Automated generation of structured WhatsApp dispatch messages connecting patients directly with local pharmacists.

---

## 🏗️ Directory Architecture

```
apps/frontend/src/
├── assets/             # Brand logos, illustrations, and static icons
├── components/         # Reusable UI component library
│   ├── auth/           # Login, registration, and phone OTP modals
│   ├── cart/           # Medical basket drawer, line items, and summary cards
│   ├── common/         # Buttons, badges, modal dialogs, loading skeletons
│   ├── discovery/      # Search bar, medicine comparison cards, savings tags
│   └── map/            # PostGIS store locator map and pin overlays
├── layouts/            # Page shell containers (Header, Footer, MobileNav)
├── pages/              # Routed view controllers
│   ├── Home.jsx        # Hero banner, feature highlights, health categories
│   ├── Discovery.jsx   # Molecule search results and generic comparison
│   ├── ProductDetail.jsx# Clinical data, dosage, side-effects, storage specs
│   ├── Fulfillment.jsx # Store locator and physical Kendra availability
│   ├── Checkout.jsx    # Attestation gate, address selection, UPI payment
│   ├── Dashboard.jsx   # Patient order history, prescriptions, annual savings
│   └── Wellness.jsx    # Preventive healthcare and OTC generics
├── services/           # Backend API communication adapters (`api-client.js`)
├── store/              # Client-side state stores (Zustand)
│   ├── authStore.js    # Firebase Auth state and guest session fallback
│   └── cartStore.js    # Shopping cart items and server synchronization
├── styles/             # Global CSS design tokens and animations
├── App.jsx             # Root application router and route guards
└── main.jsx            # React DOM root bootstrapper
```

---

## 💻 Available Scripts

Run commands from the monorepo root or within `apps/frontend`:

```bash
# Run local Vite development server (http://localhost:5173)
npm run dev:frontend

# Validate code syntax and styling via ESLint
npm run lint:frontend

# Build optimized production bundle to dist/
npm run build:frontend
```
