# 💊 Jan Aushadhi Platform — Healthcare, Molecule by Molecule

[![Production Integrity Pipeline](https://github.com/Pratham-The-Warrior/Jan-Aushadhi/actions/workflows/ci.yml/badge.svg)](file:///c:/Users/Prathmesh%20Sarda/JAN-AUSHADHI/.github/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-blue.svg)](file:///c:/Users/Prathmesh%20Sarda/JAN-AUSHADHI/package.json)
[![Database](https://img.shields.io/badge/PostgreSQL-PostGIS-blue)](file:///c:/Users/Prathmesh%20Sarda/JAN-AUSHADHI/docs/technical_doc.md)

Healing shouldn't cost a fortune. 

When a doctor writes down a brand-name prescription, they aren't just prescribing a medicine; they are writing down a chemical formula. But in the real world, that chemical formula often comes with a massive markup simply due to the logo on the box. For millions of people, this pricing gap isn't just an inconvenience—it's the difference between taking their daily doses or going without.

The Indian government's **PMBJP (Pradhan Mantri Bhartiya Janaushadhi Pariyojana)** initiative was designed to solve this by selling high-quality generic drugs (the exact same chemical salts) at a fraction of the cost. Yet, finding these generic alternatives and locating a local Jan Aushadhi Kendra with the right stock in hand remains a challenge.

**This platform is our attempt to bridge that gap.** It's a hyper-local generic drug discovery and commerce network that matches expensive branded medicines with their low-cost chemical-equivalent generic counterparts, calculates the savings, and routes orders directly to active nearby PMBJP stores using geolocation-aware mapping.

---

## 🍃 How it Works: From Brand to Salt, from Store to Hand

We built this platform to respect the chemistry of healing while making the shopping experience as simple and stress-free as possible.

1. **Chemical-Equivalent Matching:** When you search for a branded medicine, we don't just show you search results. We look up the underlying active pharmaceutical ingredient (API)—the chemical salt. We find the equivalent PMBJP generic drug, put them side-by-side, and show you exactly what you save (often up to 80-90%).
2. **Hyper-Local Discovery:** Medicine is urgent. You can't always wait days for mail delivery. Using PostgreSQL's PostGIS spatial engine, we scan a 10km radius around your location to find active Jan Aushadhi Kendras, confirm they have your prescribed salts in stock, and guide you to them.
3. **Neighborhood Pharmacy Support:** Jan Aushadhi Kendras are run by local pharmacists—real people in your community. We built a dedicated portal for them to manage their inventory easily, receive orders, and get paid directly.
4. **Direct, Middleman-Free Payments:** Using dynamically generated UPI QR codes, payments go directly from the patient's phone to the local chemist's account. No transaction fees, no delays, no corporate middle-men taking a cut.

---

## 🏗️ The Ecosystem under the Hood

This platform is a unified monorepo running a Fastify-TypeScript API backend and three tailored front-ends designed for different roles:

* **Patient Web Portal (`/apps/frontend`)**: The primary gateway where patients search for drugs, compare prices, manage their cart (using automatic guest-to-account synchronization so they don't lose their selected meds), and view active local pharmacies on a map.
* **Pharmacist Counter (`/apps/seller`)**: A streamlined dashboard for Kendra owners to process incoming orders, override stock counts, and update their store profile so patients always see accurate store availability.
* **Super Admin Console (`/apps/admin`)**: The control tower for network operators to approve store applications, audit system transactions, and onboard trusted operators using Firebase authentication.
* **Core Tech Backbone**: Powered by PostgreSQL + PostGIS (spatial search), Meilisearch (fuzzy autocomplete searches under 15ms), and Redis (caching roles and active sessions).

---

## 📖 Deep-Dive Documentation

If you want to run the code, understand the database schemas, or look at how the algorithms work, we've organized everything into two comprehensive documents:

* **[📂 Workflows & Sequences Documentation](file:///c:/Users/Prathmesh%20Sarda/JAN-AUSHADHI/docs/workflow_doc.md)**:
  * Learn how the fuzzy search autocomplete matches brand names to chemical generic names.
  * Deep dive into our cart reconciliation logic ("Merge & Max").
  * Trace the PostGIS store auto-routing and local assignment flows.
  * Walk through the P2P dynamic UPI QR generation.
* **[📂 Technical Setup & Deployment Guide](file:///c:/Users/Prathmesh%20Sarda/JAN-AUSHADHI/docs/technical_doc.md)**:
  * Full file and directory map of the monorepo.
  * Database schema definitions, PostGIS tables, and seed/ETL scripts.
  * Instructions to spin up the local development environment.
  * QA commands (ESLint checks, TypeScript compiler, production build testing).
  * Production-ready Docker Compose configurations with automated SSL setups via Let's Encrypt.
