# API Coverage

The React web app uses the same API base URL and bearer-token authentication as the mobile app.

## Live Screen Flows

| Area | Endpoints |
| --- | --- |
| Authentication | `auth/register`, `auth/login`, `auth/forgot-password` |
| Account | `userData/edit-profile`, `userData/change-password/:userId` |
| Discovery | `category/getAllCat`, `userData/getAllUserByCat`, `product/productByCustomer` |
| Customer booking | `order/check_booking`, `cart/addCart`, `cart/getAllCart/:userId`, `cart/update/:cartId`, `cart/delete/:cartId`, `order/create_booking`, `cart/delete-user-cart/:userId`, `order/my-orders/:userId` |
| Vendor catalog | `product/productByVendor`, `product/createPro`, `product/edit/:id`, `product/deletePro/:id`, `product/delete-product-media/:id`, `category/createCat` |
| Vendor booking | `order/my-orders/:vendorId`, `order/check_booking`, `order/create_booking` |
| Support | `userQury/submitQury` |

## Registered Utility Endpoints

These endpoints are registered in `src/lib/api.js` but do not have a matching screen in the current mobile/web navigation:

- `auth/otp-verification`
- `auth/reset-password`
- `userData/userData`
- `category/getAllCatByUser`
- `product/uplodeImage`
- `product/uplodeVideo`
- `uploadeImage/uploadeImage`
- `uploadeImage/deleteImage/:id`
