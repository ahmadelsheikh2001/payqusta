const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'client', 'src', 'pages', 'CustomersPage.jsx');
const content = fs.readFileSync(file, 'utf8');
const pattern = /(?|?|???|???|??|?)/g;

if (pattern.test(content)) {
  console.error('Mojibake detected in client/src/pages/CustomersPage.jsx');
  process.exit(1);
}

console.log('CustomersPage.jsx encoding check passed.');
