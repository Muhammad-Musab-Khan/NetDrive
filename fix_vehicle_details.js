const fs = require('fs');
const path = 'c:\\Users\\User\\Desktop\\NetDrive - Copy\\frontend\\src\\pages\\VehicleDetails.js';

let content = fs.readFileSync(path, 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  // Fix "âŒ " -> plain text error prefix
  lines[i] = lines[i].replace(/â\u0080\u009c/g, '');
  lines[i] = lines[i].replace(/âŒ /g, 'Error: ');
  lines[i] = lines[i].replace(/âœ… /g, '');
  
  // Fix setBookingMsg error lines
  if (lines[i].includes('setBookingMsg') && lines[i].includes('e.message')) {
    lines[i] = lines[i].replace(/setBookingMsg\(`[^`]*\$\{e\.message\}`\)/, 'setBookingMsg(`${e.message}`)');
  }

  // Fix booking confirmed message
  if (lines[i].includes('setBookingMsg') && lines[i].includes('Booking confirmed with')) {
    lines[i] = lines[i].replace(/setBookingMsg\(`[^`]*Booking confirmed with \$\{vendor\.full_name\}[^`]*`\)/, 
      'setBookingMsg(`Booking confirmed with ${vendor.full_name}!`)');
  }

  // Fix payment successful message
  if (lines[i].includes('setBookingMsg') && lines[i].includes('Payment successful')) {
    lines[i] = lines[i].replace(/setBookingMsg\(`[^`]*Payment successful[^`]*`\)/,
      'setBookingMsg(`Payment successful! Booking confirmed with ${vendor.full_name}.`)');
  }

  // Fix addToast title
  if (lines[i].includes("title: '") && lines[i].includes('Booking Confirmed')) {
    lines[i] = lines[i].replace(/title: '[^']*Booking Confirmed[^']*'/, "title: 'Booking Confirmed!'");
  }

  // Fix the bookingMsg.includes check for success styling
  if (lines[i].includes("bookingMsg.includes('")) {
    lines[i] = lines[i].replace(/bookingMsg\.includes\('[^']*'\)/, "bookingMsg.includes('confirmed') || bookingMsg.includes('successful')");
  }

  // Fix "ðŸ" " garbled pin emoji in address
  lines[i] = lines[i].replace(/ðŸ" /g, '');

  // Fix "â€"" garbled em-dash  
  lines[i] = lines[i].replace(/â€"/g, '-');
  lines[i] = lines[i].replace(/â€"/g, '-');

  // Fix the payment not completed message
  if (lines[i].includes('payment was not completed')) {
    lines[i] = lines[i].replace(/Booking created [^']*payment was not completed[^']*/, 
      'Booking created - payment was not completed, it remains pending');
  }
}

content = lines.join('\n');
fs.writeFileSync(path, content, 'utf8');
console.log('Done! All garbled characters replaced with clean ASCII text.');
