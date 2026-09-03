const fs = require('fs');

const path = 'c:\\Users\\User\\Desktop\\NetDrive - Copy\\frontend\\src\\pages\\BookingAlerts.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add info and error to colorMap
content = content.replace(
  /success: 'from-emerald-600 to-emerald-500',/g,
  `success: 'from-emerald-600 to-emerald-500',
    info: 'from-blue-600 to-blue-500',
    error: 'from-red-600 to-red-500',
    alert: 'from-amber-500 to-amber-400',`
);

// Add info and error to iconMap
content = content.replace(
  /success: <CheckCircle size=\{18\} className="text-white" \/>,/g,
  `success: <CheckCircle size={18} className="text-white" />,
    info: <CheckCircle size={18} className="text-white" />,
    error: <X size={18} className="text-white" />,`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed missing color maps and icon maps!');

