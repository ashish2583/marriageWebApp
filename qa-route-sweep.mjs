import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:5173';
const screenshotDir = 'verification-screens';

const sessions = {
  customer: {
    user: {
      userId: 'qa-customer',
      name: 'QA Customer',
      email: 'customer@example.com',
      phone: '9000000001',
      role: 'customer',
      address: 'QA Address',
      profileImage: '/assets/image/virat.jpg',
    },
    token: 'qa-token',
  },
  vendor: {
    user: {
      userId: 'qa-vendor',
      name: 'QA Vendor',
      email: 'vendor@example.com',
      phone: '9000000002',
      role: 'vendor',
      address: 'QA Vendor Address',
      profileImage: '/assets/image/Wedding.jpg',
      imageServerBaseUrl: '',
    },
    token: 'qa-token',
  },
  admin: {
    user: {
      userId: 'qa-admin',
      name: 'QA Admin',
      email: 'admin@example.com',
      phone: '9000000003',
      role: 'admin',
      profileImage: '/assets/image/zz.jpg',
    },
    token: 'qa-token',
  },
};

const routes = [
  ['public', '/login', 'Sign in to Marriage'],
  ['public', '/signup', 'Join Marriage'],
  ['public', '/forgot-password', 'Forgot password'],
  ['customer', '/customer/dashboard', 'Plan every beautiful moment'],
  ['customer', '/package-plan', 'Package Plan'],
  ['customer', '/invitation-card', 'Create Invitation Card'],
  ['customer', '/local-images', 'Local Images'],
  ['customer', '/vendors?cat=decor&name=Wedding%20Decor', 'Wedding Decor'],
  ['customer', '/products?vendor=v1&cat=decor&vendorName=Royal%20Celebration%20Co.&catName=Wedding%20Decor', 'Royal Celebration Co.'],
  ['customer', '/product/p1', 'Wedding package'],
  ['customer', '/cart', 'My Cart'],
  ['customer', '/orders', 'My Orders'],
  ['customer', '/orders/qa-order', 'Order Details'],
  ['customer', '/cancelled-orders', 'My Cancelled Orders'],
  ['customer', '/make-payment', 'Make Payment'],
  ['customer', '/cancellation-policy', 'Cancellation Policy'],
  ['customer', '/chat', 'Chat'],
  ['customer', '/support', 'Support & Chat'],
  ['customer', '/profile', 'Profile'],
  ['customer', '/profile/edit', 'Edit Profile'],
  ['customer', '/change-password', 'Change Password'],
  ['customer', '/privacy', 'Privacy Policy'],
  ['vendor', '/vendor/dashboard', 'Vendor dashboard'],
  ['vendor', '/vendor/products', 'My Products'],
  ['vendor', '/vendor/products/new', 'Add Product'],
  ['vendor', '/vendor/categories', 'Categories'],
  ['vendor', '/vendor/bookings', 'Bookings'],
  ['vendor', '/vendor/image-server', 'Image Server Setup'],
  ['vendor', '/vendor/chat', 'Vendor Chat'],
  ['vendor', '/vendor/portal-charges', 'Portal Charges'],
  ['vendor', '/vendor/cancellation-policy', 'Cancellation Policy'],
  ['vendor', '/vendor/profile', 'Profile'],
  ['vendor', '/vendor/profile/edit', 'Edit Profile'],
  ['vendor', '/vendor/change-password', 'Change Password'],
  ['vendor', '/vendor/privacy', 'Privacy Policy'],
  ['admin', '/admin/dashboard', 'Admin Dashboard'],
  ['admin', '/admin/chat', 'Admin Chat'],
  ['admin', '/admin/profile', 'Admin Profile'],
  ['admin', '/admin/orders', 'Orders'],
  ['admin', '/admin/vendors', 'Vendors'],
  ['admin', '/admin/vendors/active', 'Active Vendors'],
  ['admin', '/admin/vendors/inactive', 'Inactive Vendors'],
  ['admin', '/admin/customers', 'Customers'],
  ['admin', '/admin/products', 'Products'],
  ['admin', '/admin/categories', 'Categories'],
  ['admin', '/admin/payments', 'Payments'],
  ['admin', '/admin/queries', 'Queries'],
  ['admin', '/admin/settings', 'Settings'],
];

const browser = await chromium.launch({headless: true});
await mkdir(screenshotDir, {recursive: true});
const page = await browser.newPage({viewport: {width: 1440, height: 950}});
const failures = [];
const consoleErrors = [];

page.on('console', msg => {
  if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
    consoleErrors.push(msg.text());
  }
});
page.on('pageerror', error => {
  consoleErrors.push(error.message);
});

await page.context().addInitScript(({sessions}) => {
  const seed = role => {
    const session = sessions[role];
    localStorage.setItem('merrage-web-session', JSON.stringify(session));
    localStorage.setItem('merrage-web-token', session.token);
    localStorage.setItem('merrage-web-user', JSON.stringify(session.user));
  };
  window.__seedMerrageSession = seed;
}, {sessions});

for (const [role, route, expected] of routes) {
  await page.goto(baseUrl, {waitUntil: 'domcontentloaded'});
  if (role !== 'public') {
    await page.evaluate(roleName => window.__seedMerrageSession(roleName), role);
  } else {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  await page.goto(`${baseUrl}${route}`, {waitUntil: 'networkidle'});
  const text = await page.locator('body').innerText({timeout: 10000});
  const hasExpected = text.toLowerCase().includes(expected.toLowerCase());
  const hasFatal = /could not start|not found|ReferenceError|TypeError|Cannot read/i.test(text);
  if (!hasExpected || hasFatal) {
    failures.push({role, route, expected, hasExpected, hasFatal, sample: text.slice(0, 240)});
  }
}

await page.goto(`${baseUrl}/customer/dashboard`, {waitUntil: 'networkidle'});
await page.screenshot({path: `${screenshotDir}/customer-dashboard.png`, fullPage: true});
await page.evaluate(roleName => window.__seedMerrageSession(roleName), 'vendor');
await page.goto(`${baseUrl}/vendor/dashboard`, {waitUntil: 'networkidle'});
await page.screenshot({path: `${screenshotDir}/vendor-dashboard.png`, fullPage: true});
await page.evaluate(roleName => window.__seedMerrageSession(roleName), 'admin');
await page.goto(`${baseUrl}/admin/dashboard`, {waitUntil: 'networkidle'});
await page.screenshot({path: `${screenshotDir}/admin-dashboard.png`, fullPage: true});
await browser.close();

if (failures.length || consoleErrors.length) {
  console.log(JSON.stringify({failures, consoleErrors: [...new Set(consoleErrors)].slice(0, 20)}, null, 2));
  process.exit(1);
}

console.log(`QA route sweep passed: ${routes.length} routes checked.`);
