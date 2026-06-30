# Merrage Web App

React.js web app for the existing Merrage React Native backend. It reuses the mobile app API base URL and endpoint contracts for Customer, Vendor, and Admin roles.

## Install

```bash
npm install
```

If your npm cache has permission issues, use a project-local cache:

```bash
npm_config_cache=.npm-cache npm install
```

## Run

```bash
npm run dev
```

Open `http://127.0.0.1:5173`.

## API Base URL

Copy `.env.example` to `.env.local` and set:

```bash
VITE_API_BASE_URL=https://marrige-item.vercel.app/
```

This URL comes from the React Native app at `src/WebApi/Service.js`.

## Login Flow

The login page supports `Customer`, `Vendor`, and `Admin`.

The web app calls `api/auth/login` with the same `phone`, `password`, and `deviceInfo` shape used by the mobile app. On success it stores the token and user in browser storage, attaches the token to future API calls, and redirects by role:

- Customer: `/customer/dashboard`
- Vendor: `/vendor/dashboard`
- Admin: `/admin/dashboard`

Protected routes redirect unauthenticated users to `/login`. API `401` responses clear the stored session and return the user to login.

## Build

```bash
npm run build
```

## Implemented Areas

- Reusable axios API client with token interceptor
- Auth helpers for login, logout, token, current user, and role checks
- Customer dashboard, vendor discovery, products, cart, orders, support, profile
- Vendor dashboard, product management, categories, bookings, profile
- Admin dashboard, orders, vendors, customers, products, categories, payments, queries
- Responsive sidebar/topbar layouts, loading/error/empty states, and toast messages
