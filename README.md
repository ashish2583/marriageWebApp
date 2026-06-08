# Merrage Web App

Responsive React web application matching the Merrage mobile app's customer and vendor workflows.

## Run locally

```bash
npm install --cache .npm-cache
npm run dev
```

Open `http://127.0.0.1:5173`.

For a quick preview, enter any phone number and password on the login screen, then choose Customer or Vendor. The app first calls the configured API and falls back to local preview data if the API is unavailable or blocked by browser CORS.

## Production build

```bash
npm run lint
npm run build
npm run preview
```

## API configuration

Copy `.env.example` to `.env.local` and update `VITE_API_BASE_URL` when needed.

Implemented API workflows include authentication, profile editing, password changes, categories, customer/vendor product discovery, product management, product-media deletion, cart, bookings, orders, and support queries.
