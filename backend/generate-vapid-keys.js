// Generate VAPID keys for Web Push notifications
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID Keys Generated:');
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('\nAdd these to your .env file');
