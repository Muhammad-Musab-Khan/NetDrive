const fs = require('fs');

const path = 'c:\\Users\\User\\Desktop\\NetDrive - Copy\\frontend\\src\\pages\\BookingAlerts.jsx';
let content = fs.readFileSync(path, 'utf8');

const newLogic = `      bookings.forEach(b => {
      const prevStatus = knownStatusesRef.current.get(b._id);

      // New booking just appeared (instant confirmation)
      if (prevStatus === undefined && b.status === 'confirmed') {
        addToast({
          type: 'success',
          title: 'Booking Confirmed!',
          message: \`Your booking for \${b.vehicle?.make || 'vehicle'} \${b.vehicle?.model_year || ''} has been confirmed!\`.trim(),
          subtitle: \`Vendor: \${b.vendor?.full_name || 'N/A'} • Rs. \${(b.total_price || 0).toLocaleString()}\`,
          duration: 8000,
        });
        hasChanges = true;
      }
      
      if (prevStatus && prevStatus !== b.status) {
        if (b.status === 'active') {
           addToast({
            type: 'info',
            title: 'Car Handed Over!',
            message: \`The vendor has marked your \${b.vehicle?.make || 'vehicle'} as delivered/handed over. Your rental period has officially started.\`,
            duration: 8000,
          });
          hasChanges = true;
        } else if (b.status === 'completed') {
           addToast({
            type: 'success',
            title: 'Contract Finished!',
            message: \`Your rental for \${b.vehicle?.make || 'vehicle'} has been successfully completed. Thank you!\`,
            duration: 8000,
          });
          hasChanges = true;
        } else if (b.status === 'cancelled') {
           addToast({
            type: 'error',
            title: 'Booking Declined/Cancelled',
            message: \`Your booking for \${b.vehicle?.make || 'vehicle'} was declined or cancelled by the vendor.\`,
            duration: 8000,
          });
          hasChanges = true;
        }
      }
    });`;

content = content.replace(
  /bookings\.forEach\(b => \{[\s\S]*?hasChanges = true;\s*\}\s*\}\);/m,
  newLogic
);

fs.writeFileSync(path, content, 'utf8');
console.log('Added missing status transitions to useStatusAlerts!');

