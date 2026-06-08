export const asset = path => `/assets/${path}`;

export const categories = [
  {catId: 'decor', catName: 'Wedding Decor', catImage: asset('image/stage.jpg')},
  {catId: 'catering', catName: 'Catering', catImage: asset('image/catering_hero.jpg')},
  {catId: 'music', catName: 'Music & DJ', catImage: asset('image/dj.jpg')},
  {catId: 'cars', catName: 'Wedding Cars', catImage: asset('image/weddingcar.jpg')},
  {catId: 'photo', catName: 'Photography', catImage: asset('image/canon.jpg')},
  {catId: 'lighting', catName: 'Lighting', catImage: asset('image/light.jpg')},
];

export const vendors = [
  {userId: 'v1', name: 'Royal Celebration Co.', phone: '9876543210', address: 'New Delhi', profileImage: asset('image/Wedding.jpg')},
  {userId: 'v2', name: 'Shaadi Studio', phone: '9876501234', address: 'Jaipur', profileImage: asset('image/stage.jpg')},
  {userId: 'v3', name: 'Moments & More', phone: '9811122233', address: 'Mumbai', profileImage: asset('image/dance.jpg')},
];

export const products = [
  {_id: 'p1', userId: 'v1', catId: 'decor', proName: 'Royal Floral Stage', price: 45000, shortDetails: 'A grand floral stage with ambient lighting.', longDetails: 'Includes floral wall, premium seating, entrance aisle, warm lighting and on-site setup.', proImage: [asset('image/stage.jpg'), asset('image/flower.jpg')], proVideo: []},
  {_id: 'p2', userId: 'v1', catId: 'catering', proName: 'Premium Wedding Feast', price: 85000, shortDetails: 'A complete vegetarian wedding menu.', longDetails: 'Live counters, starters, mains, desserts, service staff and table presentation.', proImage: [asset('image/catering_hero.jpg'), asset('image/cooking.jpg')], proVideo: []},
  {_id: 'p3', userId: 'v2', catId: 'music', proName: 'Wedding DJ Night', price: 30000, shortDetails: 'DJ, sound system and dance-floor lighting.', longDetails: 'Six-hour setup with DJ console, professional speakers, microphones and moving lights.', proImage: [asset('image/dj.jpg'), asset('image/dance.jpg')], proVideo: []},
  {_id: 'p4', userId: 'v3', catId: 'cars', proName: 'Vintage Wedding Car', price: 18000, shortDetails: 'Decorated vintage car for your grand entry.', longDetails: 'Four-hour booking with driver, fuel and custom floral decoration.', proImage: [asset('image/weddingcar.jpg'), asset('image/car.jpg')], proVideo: []},
];

export const demoCustomer = {userId: '1', name: 'Aarav Sharma', phone: '9876543210', email: 'aarav@example.com', address: 'New Delhi', role: 'customer', profileImage: asset('image/virat.jpg')};
export const demoVendor = {userId: 'v1', name: 'Royal Celebration Co.', phone: '9876543210', email: 'royal@example.com', address: 'New Delhi', role: 'vendor', profileImage: asset('image/Wedding.jpg')};
