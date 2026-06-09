require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('./models/user');
const Vehicle  = require('./models/Vehicle');
const Booking  = require('./models/Booking');
const Chat     = require('./models/Chat');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/netdrive';

const seedDatabase = async () => {
  try {
    console.log(`Connecting to MongoDB at: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI);

    await User.deleteMany({});
    await Vehicle.deleteMany({});
    await Booking.deleteMany({});
    await Chat.deleteMany({});
    console.log('🗑️ Flushed old collection blocks.');

    const RENTER_PASS = 'renter123';
    const VENDOR_PASS = 'vendor123';

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║           🔑  SEEDED LOGIN CREDENTIALS               ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  RENTER   musab@renter.com          / ${RENTER_PASS}     ║`);
    console.log(`║  VENDOR 1 rentals@khanluxury.pk     / ${VENDOR_PASS}     ║`);
    console.log(`║  VENDOR 2 contact@malikrentals.com  / ${VENDOR_PASS}     ║`);
    console.log(`║  VENDOR 3 info@shahrahcars.pk       / ${VENDOR_PASS}     ║`);
    console.log(`║  VENDOR 4 bookings@cliftonelite.com / ${VENDOR_PASS}     ║`);
    console.log(`║  VENDOR 5 dmc@cyber.net.pk          / ${VENDOR_PASS}     ║`);
    console.log(`║  VENDOR 6 operations@khifleet.pk    / ${VENDOR_PASS}     ║`);
    console.log('╚══════════════════════════════════════════════════════╝\n');

    const renterId = new mongoose.Types.ObjectId('6646b1a1c92a541178220001');
    const v1Id     = new mongoose.Types.ObjectId('6646b1a1c92a541178220002');
    const v2Id     = new mongoose.Types.ObjectId('6646b1a1c92a541178220003');
    const v3Id     = new mongoose.Types.ObjectId('6646b1a1c92a541178220004');
    const v4Id     = new mongoose.Types.ObjectId('6646b1a1c92a541178220005');
    const v5Id     = new mongoose.Types.ObjectId('6646b1a1c92a541178220006');
    const v6Id     = new mongoose.Types.ObjectId('6646b1a1c92a541178220007');

    const users = [
      { _id: renterId, full_name: "Musab Khan",             email: "musab@renter.com",            password: RENTER_PASS, phone: "+923001234567", roles: ["renter"], cnic_number: "42101-1111111-1", is_email_verified: true, status: "approved" },
      { _id: v1Id,     full_name: "Khan Luxury Wheels",     email: "rentals@khanluxury.pk",        password: VENDOR_PASS, phone: "+923211122334", roles: ["vendor"], cnic_number: "42101-2222222-1", is_email_verified: true, status: "approved" },
      { _id: v2Id,     full_name: "Malik Premium Rentals",  email: "contact@malikrentals.com",     password: VENDOR_PASS, phone: "+923335556667", roles: ["vendor"], cnic_number: "42101-3333333-1", is_email_verified: true, status: "approved" },
      { _id: v3Id,     full_name: "Shahrah Rent-A-Car",     email: "info@shahrahcars.pk",          password: VENDOR_PASS, phone: "+923124445556", roles: ["vendor"], cnic_number: "42101-4444444-1", is_email_verified: true, status: "approved" },
      { _id: v4Id,     full_name: "Clifton Elite Cruisers", email: "bookings@cliftonelite.com",    password: VENDOR_PASS, phone: "+923457778889", roles: ["vendor"], cnic_number: "42101-5555555-1", is_email_verified: true, status: "approved" },
      { _id: v5Id,     full_name: "Defense Motor Club",     email: "dmc@cyber.net.pk",             password: VENDOR_PASS, phone: "+923009998887", roles: ["vendor"], cnic_number: "42101-6666666-1", is_email_verified: true, status: "approved" },
      { _id: v6Id,     full_name: "Karachi Fleet Co.",      email: "operations@khifleet.pk",       password: VENDOR_PASS, phone: "+923224441112", roles: ["vendor"], cnic_number: "42101-7777777-1", is_email_verified: true, status: "approved" },
    ];

    await User.insertMany(users);
    await User.findByIdAndUpdate(v1Id, { vendor_address: "Plot 24-C, Clifton Block 5, Karachi" });
    await User.findByIdAndUpdate(v2Id, { vendor_address: "Main Shahrah-e-Faisal, PECHS, Karachi" });
    await User.findByIdAndUpdate(v3Id, { vendor_address: "Main University Road, Gulshan-e-Iqbal, Karachi" });
    await User.findByIdAndUpdate(v4Id, { vendor_address: "Khayaban-e-Ittehad, DHA Phase 6, Karachi" });
    await User.findByIdAndUpdate(v5Id, { vendor_address: "Main Saba Avenue, DHA Phase 5, Karachi" });
    await User.findByIdAndUpdate(v6Id, { vendor_address: "SMCHS, Near Nursery Flyover, Karachi" });

    console.log('✓ Seeding 25 vehicles across 6 vendors...');

    // ─────────────────────────────────────────────────────────────────────────
    // ALL PHOTOS ARE REAL PAKWHEELS URLs — manually collected by Musab
    // ─────────────────────────────────────────────────────────────────────────

    const vehicles = [

      // ── VENDOR 1 · Khan Luxury Wheels ────────────────────────────────────

      {
        vendor_id: v1Id, vendor_email: "rentals@khanluxury.pk",
        make: "Toyota Land Cruiser ZX V8", model_year: "2022",
        registration_no: "BPD-556", registration_date: "2022-05-12",
        owner_name: "Asif Khan", tax_payment: "Paid",
        address: "Plot 24-C, Clifton Block 5, Karachi",
        price_per_day: 35000, category: "suv", is_verified: true, status: "active",
        photos: [
          "https://cache3.pakwheels.com/system/car_generation_pictures/16719/original/Cover.jpg?1768986980",
          "https://cache2.pakwheels.com/system/car_generation_pictures/16720/original/Front_View.jpg?1768986980",
          "https://cache2.pakwheels.com/system/car_generation_pictures/16721/original/Back_View.jpg?1768986981",
          "https://cache4.pakwheels.com/system/car_generation_pictures/16724/original/Dashboard.jpg?1768986982",
        ]
      },
      {
        vendor_id: v1Id, vendor_email: "rentals@khanluxury.pk",
        make: "Honda Civic RS Turbo", model_year: "2023",
        registration_no: "CVC-234", registration_date: "2023-01-10",
        owner_name: "Asif Khan", tax_payment: "Paid",
        address: "Plot 24-C, Clifton Block 5, Karachi",
        price_per_day: 12000, category: "sedan", is_verified: true, status: "active",
        photos: [
          "https://cache2.pakwheels.com/system/car_generation_pictures/10345/original/Cover_%2818%29.jpg?1767275410",
          "https://cache2.pakwheels.com/system/car_generation_pictures/7375/original/Side-Profile.jpg?1677570257",
          "https://cache3.pakwheels.com/system/car_generation_pictures/7378/original/Rear-Side.jpg?1677570258",
          "https://cache3.pakwheels.com/system/car_generation_pictures/7382/original/Front-Seats.jpg?1677570260",
        ]
      },
      {
        vendor_id: v1Id, vendor_email: "rentals@khanluxury.pk",
        make: "Toyota Fortuner Legender", model_year: "2023",
        registration_no: "LEG-990", registration_date: "2023-03-15",
        owner_name: "Asif Khan", tax_payment: "Paid",
        address: "Plot 24-C, Clifton Block 5, Karachi",
        price_per_day: 22000, category: "suv", is_verified: true, status: "active",
        photos: [
          "https://cache4.pakwheels.com/system/car_generation_pictures/16708/original/Cover.jpg?1768980200",
          "https://cache2.pakwheels.com/system/car_generation_pictures/16709/original/Front_View.jpg?1768980200",
          "https://cache1.pakwheels.com/system/car_generation_pictures/16712/original/Right_Side_View.jpg?1768980201",
          "https://cache1.pakwheels.com/system/car_generation_pictures/16713/original/Dashboard.jpg?1768980201",
        ]
      },
      {
        vendor_id: v1Id, vendor_email: "rentals@khanluxury.pk",
        make: "Hyundai Sonata", model_year: "2022",
        registration_no: "SNT-441", registration_date: "2022-08-11",
        owner_name: "Asif Khan", tax_payment: "Paid",
        address: "Plot 24-C, Clifton Block 5, Karachi",
        price_per_day: 15000, category: "luxury", is_verified: true, status: "active",
        photos: [
          "https://cache2.pakwheels.com/system/car_generation_pictures/8025/original/Cover.jpg?1768564613",
          "https://cache3.pakwheels.com/system/car_generation_pictures/8035/original/Front_View.jpg?1768564610",
          "https://cache1.pakwheels.com/system/car_generation_pictures/8036/original/Left_Rear_View.jpg?1768564614",
          "https://cache1.pakwheels.com/system/car_generation_pictures/8042/original/Dashboard.jpg?1768564616",
        ]
      },
      {
        vendor_id: v1Id, vendor_email: "rentals@khanluxury.pk",
        make: "Audi A4 Premium", model_year: "2021",
        registration_no: "ADI-110", registration_date: "2021-11-20",
        owner_name: "Asif Khan", tax_payment: "Paid",
        address: "Plot 24-C, Clifton Block 5, Karachi",
        price_per_day: 18000, category: "luxury", is_verified: true, status: "active",
        photos: [
          "https://cache1.pakwheels.com/system/car_generation_pictures/10428/original/Cover.jpg?1768563189",
          "https://cache2.pakwheels.com/system/car_generation_pictures/10420/original/Front_View.jpg?1768563186",
          "https://cache1.pakwheels.com/system/car_generation_pictures/10418/original/Back_View.jpg?1768563185",
          "https://cache2.pakwheels.com/system/car_generation_pictures/10423/original/Dashboard.jpg?1768563187",
        ]
      },

      // ── VENDOR 2 · Malik Premium Rentals ─────────────────────────────────

      {
        vendor_id: v2Id, vendor_email: "contact@malikrentals.com",
        make: "Kia Sportage AWD", model_year: "2022",
        registration_no: "SPT-883", registration_date: "2022-02-14",
        owner_name: "Zubair Malik", tax_payment: "Paid",
        address: "Main Shahrah-e-Faisal, PECHS, Karachi",
        price_per_day: 10000, category: "suv", is_verified: true, status: "active",
        photos: [
          "https://cache4.pakwheels.com/system/car_generation_pictures/7734/original/Sportage_white.jpeg?1768564766",
          "https://cache1.pakwheels.com/system/car_generation_pictures/7698/original/Kia-LE-White.jpg?1768564765",
          "https://cache3.pakwheels.com/system/car_generation_pictures/7720/original/3.png?1768564765",
          "https://cache3.pakwheels.com/system/car_generation_pictures/6665/original/Cockpit.jpg?1768564772",
        ]
      },
      {
        vendor_id: v2Id, vendor_email: "contact@malikrentals.com",
        make: "Toyota Corolla Altis Grande", model_year: "2021",
        registration_no: "GND-552", registration_date: "2021-04-18",
        owner_name: "Zubair Malik", tax_payment: "Paid",
        address: "Main Shahrah-e-Faisal, PECHS, Karachi",
        price_per_day: 7500, category: "sedan", is_verified: true, status: "active",
        photos: [
          "https://cache1.pakwheels.com/system/car_generation_pictures/5361/original/Corolla-X-Cars-Cropped-Pictures-for-Website.jpg?1606903674",
          "https://cache4.pakwheels.com/system/car_generation_pictures/7266/original/2.jpg?1768560543",
          "https://cache3.pakwheels.com/system/car_generation_pictures/7274/original/10.jpg?1768560540",
          "https://cache2.pakwheels.com/system/car_generation_pictures/7277/original/13.jpg?1768560544",
        ]
      },
      {
        vendor_id: v2Id, vendor_email: "contact@malikrentals.com",
        make: "Suzuki Swift GLX", model_year: "2023",
        registration_no: "SWF-102", registration_date: "2023-06-12",
        owner_name: "Zubair Malik", tax_payment: "Paid",
        address: "Main Shahrah-e-Faisal, PECHS, Karachi",
        price_per_day: 5500, category: "sedan", is_verified: true, status: "active",
        photos: [
          "https://cache4.pakwheels.com/system/car_generation_pictures/7311/original/White-Base-PS.jpg?1768566947",
          "https://cache3.pakwheels.com/system/car_generation_pictures/7312/original/Front-Side.jpg?1768566946",
          "https://cache3.pakwheels.com/system/car_generation_pictures/7313/original/Rear.jpg?1768566945",
          "https://cache1.pakwheels.com/system/car_generation_pictures/6577/original/Cockpit.jpg?1768566948",
        ]
      },
      {
        vendor_id: v2Id, vendor_email: "contact@malikrentals.com",
        make: "Honda BR-V", model_year: "2022",
        registration_no: "BRV-765", registration_date: "2022-09-05",
        owner_name: "Zubair Malik", tax_payment: "Paid",
        address: "Main Shahrah-e-Faisal, PECHS, Karachi",
        price_per_day: 9000, category: "suv", is_verified: true, status: "active",
        photos: [
          "https://cache4.pakwheels.com/system/car_generation_pictures/16743/original/Cover.jpg?1768989143",
          "https://cache4.pakwheels.com/system/car_generation_pictures/16744/original/Left_Rear_View.jpg?1768989143",
          "https://cache2.pakwheels.com/system/car_generation_pictures/9160/original/Dashboard.jpg?1754368174",
        ]
      },
      {
        vendor_id: v2Id, vendor_email: "contact@malikrentals.com",
        make: "Changan Alsvin Lumiere", model_year: "2023",
        registration_no: "ALS-332", registration_date: "2023-02-28",
        owner_name: "Zubair Malik", tax_payment: "Paid",
        address: "Main Shahrah-e-Faisal, PECHS, Karachi",
        price_per_day: 6500, category: "sedan", is_verified: true, status: "active",
        photos: [
          "https://cache2.pakwheels.com/system/car_generation_pictures/6015/original/Alsvin_-_PNG.png?1768563564",
          "https://cache3.pakwheels.com/system/car_generation_pictures/7396/original/Front.jpg?1768563562",
          "https://cache3.pakwheels.com/system/car_generation_pictures/16814/original/Right_Side_View.jpg?1768997056",
          "https://cache3.pakwheels.com/system/car_generation_pictures/16813/original/Infotainment_System.jpg?1768997055",
        ]
      },

      // ── VENDOR 3 · Shahrah Rent-A-Car ────────────────────────────────────

      {
        vendor_id: v3Id, vendor_email: "info@shahrahcars.pk",
        make: "Toyota Yaris Ativ X", model_year: "2022",
        registration_no: "YRS-992", registration_date: "2022-04-12",
        owner_name: "Shahrah Corp", tax_payment: "Paid",
        address: "Main University Road, Gulshan-e-Iqbal, Karachi",
        price_per_day: 6500, category: "sedan", is_verified: true, status: "active",
        photos: [
          "https://cache4.pakwheels.com/system/car_generation_pictures/16706/original/Cover.jpg?1768979326",
          "https://cache1.pakwheels.com/system/car_generation_pictures/16707/original/Front_View.jpg?1768979326",
          "https://cache3.pakwheels.com/system/car_generation_pictures/8056/original/Dashboard.jpg?1768568237",
          "https://cache3.pakwheels.com/system/car_generation_pictures/8059/original/Speedometer.jpg?1768568239",
        ]
      },
      {
        vendor_id: v3Id, vendor_email: "info@shahrahcars.pk",
        make: "MG HS Exclusive", model_year: "2022",
        registration_no: "MGH-445", registration_date: "2022-08-25",
        owner_name: "Shahrah Corp", tax_payment: "Paid",
        address: "Main University Road, Gulshan-e-Iqbal, Karachi",
        price_per_day: 13000, category: "suv", is_verified: true, status: "active",
        photos: [
          "https://cache2.pakwheels.com/ad_pictures/1442/mg-hs-2-trophy-2021-144239168.webp",
          "https://cache4.pakwheels.com/ad_pictures/1442/mg-hs-2-trophy-2021-144239166.webp",
          "https://cache1.pakwheels.com/ad_pictures/1442/mg-hs-2-trophy-2021-144239157.webp",
          "https://cache2.pakwheels.com/ad_pictures/1442/mg-hs-2-trophy-2021-144239156.webp",
        ]
      },
      {
        vendor_id: v3Id, vendor_email: "info@shahrahcars.pk",
        make: "Proton Saga Ace", model_year: "2021",
        registration_no: "SGA-112", registration_date: "2021-02-14",
        owner_name: "Shahrah Corp", tax_payment: "Paid",
        address: "Main University Road, Gulshan-e-Iqbal, Karachi",
        price_per_day: 5000, category: "sedan", is_verified: true, status: "active",
        photos: [
          // Proton Saga not in provided list — using Alsvin as closest compact sedan substitute
          "https://cache2.pakwheels.com/system/car_generation_pictures/6015/original/Alsvin_-_PNG.png?1768563564",
          "https://cache3.pakwheels.com/system/car_generation_pictures/7396/original/Front.jpg?1768563562",
          "https://cache3.pakwheels.com/system/car_generation_pictures/16814/original/Right_Side_View.jpg?1768997056",
          "https://cache2.pakwheels.com/system/car_generation_pictures/6608/original/FrontSeats.jpg?1768563565",
        ]
      },
      {
        vendor_id: v3Id, vendor_email: "info@shahrahcars.pk",
        make: "Toyota Hilux Revo V", model_year: "2023",
        registration_no: "RVO-881", registration_date: "2023-01-22",
        owner_name: "Shahrah Corp", tax_payment: "Paid",
        address: "Main University Road, Gulshan-e-Iqbal, Karachi",
        price_per_day: 25000, category: "suv", is_verified: true, status: "active",
        photos: [
          "https://cache2.pakwheels.com/system/car_generation_pictures/16960/original/Cover.jpg?1772165892",
          "https://cache2.pakwheels.com/system/car_generation_pictures/16956/original/Front_View.jpg?1772165891",
          "https://cache2.pakwheels.com/system/car_generation_pictures/16959/original/Back_View.jpg?1772165892",
          "https://cache2.pakwheels.com/system/car_generation_pictures/16955/original/Dashboard.jpg?1772165890",
        ]
      },
      {
        vendor_id: v3Id, vendor_email: "info@shahrahcars.pk",
        make: "Honda City Aspire", model_year: "2022",
        registration_no: "CTY-902", registration_date: "2022-10-10",
        owner_name: "Shahrah Corp", tax_payment: "Paid",
        address: "Main University Road, Gulshan-e-Iqbal, Karachi",
        price_per_day: 7000, category: "sedan", is_verified: true, status: "active",
        photos: [
          "https://cache1.pakwheels.com/system/car_generation_pictures/16740/original/Cover.jpg?1768988801",
          "https://cache2.pakwheels.com/system/car_generation_pictures/16741/original/Left_Rear_View.jpg?1768988801",
          "https://cache4.pakwheels.com/system/car_generation_pictures/16742/original/Interior_View.jpg?1768988802",
        ]
      },

      // ── VENDOR 4 · Clifton Elite Cruisers ────────────────────────────────

      {
        vendor_id: v4Id, vendor_email: "bookings@cliftonelite.com",
        make: "Range Rover Vogue", model_year: "2021",
        registration_no: "VGE-007", registration_date: "2021-06-15",
        owner_name: "Clifton Admin", tax_payment: "Paid",
        address: "Khayaban-e-Ittehad, DHA Phase 6, Karachi",
        price_per_day: 60000, category: "luxury", is_verified: true, status: "active",
        photos: [
          // Range Rover not in provided list — using Land Cruiser as closest luxury SUV substitute
          "https://cache3.pakwheels.com/system/car_generation_pictures/16719/original/Cover.jpg?1768986980",
          "https://cache2.pakwheels.com/system/car_generation_pictures/16720/original/Front_View.jpg?1768986980",
          "https://cache2.pakwheels.com/system/car_generation_pictures/16721/original/Back_View.jpg?1768986981",
          "https://cache3.pakwheels.com/system/car_generation_pictures/16729/original/Rear_Seats.jpg?1768986983",
        ]
      },
      {
        vendor_id: v4Id, vendor_email: "bookings@cliftonelite.com",
        make: "Peugeot 2008", model_year: "2023",
        registration_no: "PGT-208", registration_date: "2023-04-19",
        owner_name: "Clifton Admin", tax_payment: "Paid",
        address: "Khayaban-e-Ittehad, DHA Phase 6, Karachi",
        price_per_day: 11000, category: "suv", is_verified: true, status: "active",
        photos: [
          "https://cache3.pakwheels.com/system/car_generation_pictures/9124/original/Cover.jpg?1768566273",
          "https://cache2.pakwheels.com/system/car_generation_pictures/9130/original/Left_Side_View.jpg?1768566267",
          "https://cache1.pakwheels.com/system/car_generation_pictures/9129/original/Left_Rear_View.jpg?1768566266",
          "https://cache3.pakwheels.com/system/car_generation_pictures/9125/original/Dashboard.jpg?1768566269",
        ]
      },
      {
        vendor_id: v4Id, vendor_email: "bookings@cliftonelite.com",
        make: "Toyota Aqua Hybrid", model_year: "2020",
        registration_no: "AQA-331", registration_date: "2020-07-22",
        owner_name: "Clifton Admin", tax_payment: "Paid",
        address: "Khayaban-e-Ittehad, DHA Phase 6, Karachi",
        price_per_day: 6000, category: "electric", is_verified: true, status: "active",
        photos: [
          "https://cache3.pakwheels.com/ad_pictures/1448/toyota-aqua-g-led-soft-leather-selection-2018-144881091.webp",
          "https://cache3.pakwheels.com/ad_pictures/1448/toyota-aqua-g-led-soft-leather-selection-2018-144881093.webp",
          "https://cache2.pakwheels.com/ad_pictures/1448/toyota-aqua-g-led-soft-leather-selection-2018-144881123.webp",
          "https://cache4.pakwheels.com/ad_pictures/1448/toyota-aqua-g-led-soft-leather-selection-2018-144881117.webp",
        ]
      },
      {
        vendor_id: v4Id, vendor_email: "bookings@cliftonelite.com",
        make: "Mercedes C-Class C200", model_year: "2022",
        registration_no: "MER-200", registration_date: "2022-11-12",
        owner_name: "Clifton Admin", tax_payment: "Paid",
        address: "Khayaban-e-Ittehad, DHA Phase 6, Karachi",
        price_per_day: 28000, category: "luxury", is_verified: true, status: "active",
        photos: [
          "https://cache1.pakwheels.com/system/car_generation_pictures/7506/original/2023-mercedes-benz-c-class-sedan-front-lights-carbuzz-816906.jpg?1768565378",
          "https://cache1.pakwheels.com/system/car_generation_pictures/7507/original/2023-mercedes-benz-c-class-sedan-rear-view-carbuzz-816875.jpg?1768565376",
          "https://cache1.pakwheels.com/system/car_generation_pictures/7509/original/2023-mercedes-benz-c-class-sedan-side-view-carbuzz-816920.jpg?1768565380",
          "https://cache1.pakwheels.com/system/car_generation_pictures/7515/original/2023-mercedes-benz-c-class-sedan-interior-overview-carbuzz-814678.jpg?1768565381",
        ]
      },
      {
        vendor_id: v4Id, vendor_email: "bookings@cliftonelite.com",
        make: "DFSK Glory 580 Pro", model_year: "2022",
        registration_no: "GLY-881", registration_date: "2022-03-30",
        owner_name: "Clifton Admin", tax_payment: "Paid",
        address: "Khayaban-e-Ittehad, DHA Phase 6, Karachi",
        price_per_day: 10500, category: "suv", is_verified: true, status: "active",
        photos: [
          "https://cache4.pakwheels.com/system/car_generation_pictures/6431/original/Glory_580_Pro_Front.jpg?1652179255",
          "https://cache1.pakwheels.com/system/car_generation_pictures/16832/original/Right_Rear_View.jpg?1769001577",
          "https://cache2.pakwheels.com/system/car_generation_pictures/7031/original/Cockpit.jpg?1768564016",
        ]
      },

      // ── VENDOR 5 · Defense Motor Club ────────────────────────────────────

      {
        vendor_id: v5Id, vendor_email: "dmc@cyber.net.pk",
        make: "Tesla Model 3", model_year: "2022",
        registration_no: "TSL-330", registration_date: "2022-09-18",
        owner_name: "DMC Fleet Manager", tax_payment: "Paid",
        address: "Main Saba Avenue, DHA Phase 5, Karachi",
        price_per_day: 40000, category: "electric", is_verified: true, status: "active",
        photos: [
          "https://cache1.pakwheels.com/system/car_generation_pictures/15386/original/Cover.jpg?1768566993",
          "https://cache2.pakwheels.com/system/car_generation_pictures/15379/original/Front_View.jpg?1768566991",
          "https://cache2.pakwheels.com/system/car_generation_pictures/15377/original/Back_View.jpg?1768566990",
          "https://cache2.pakwheels.com/system/car_generation_pictures/15381/original/Left_Side_View.jpg?1768566991",
        ]
      },
      {
        vendor_id: v5Id, vendor_email: "dmc@cyber.net.pk",
        make: "Toyota Prius Alpha", model_year: "2019",
        registration_no: "PRS-771", registration_date: "2019-05-25",
        owner_name: "DMC Fleet Manager", tax_payment: "Paid",
        address: "Main Saba Avenue, DHA Phase 5, Karachi",
        price_per_day: 7000, category: "electric", is_verified: true, status: "active",
        photos: [
          "https://cache2.pakwheels.com/system/car_generation_pictures/16261/original/Cover.jpg?1768567598",
          "https://cache1.pakwheels.com/system/car_generation_pictures/7604/original/20230110_01_06.jpg?1768567594",
          "https://cache4.pakwheels.com/system/car_generation_pictures/7605/original/20230110_01_07.jpg?1768567593",
          "https://cache1.pakwheels.com/system/car_generation_pictures/16257/original/Dashboard.jpg?1768567595",
        ]
      },

      // ── VENDOR 6 · Karachi Fleet Co. ─────────────────────────────────────

      {
        vendor_id: v6Id, vendor_email: "operations@khifleet.pk",
        make: "Honda Accord Hybrid", model_year: "2021",
        registration_no: "ACD-442", registration_date: "2021-08-14",
        owner_name: "KHI Fleet Executive", tax_payment: "Paid",
        address: "SMCHS, Near Nursery Flyover, Karachi",
        price_per_day: 16000, category: "luxury", is_verified: true, status: "active",
        photos: [
          "https://cache2.pakwheels.com/system/car_generation_pictures/6831/original/Honda_Accord_Front_Right_angled_.jpg?1768564174",
          "https://cache2.pakwheels.com/system/car_generation_pictures/6835/original/Rear.jpg?1768564167",
          "https://cache1.pakwheels.com/system/car_generation_pictures/6837/original/RIM.jpg?1768564169",
          "https://cache1.pakwheels.com/system/car_generation_pictures/6841/original/Cockpit.jpg?1768564174",
        ]
      },
      {
        vendor_id: v6Id, vendor_email: "operations@khifleet.pk",
        make: "Toyota Prado TX Coupe", model_year: "2020",
        registration_no: "PRD-991", registration_date: "2020-04-10",
        owner_name: "KHI Fleet Executive", tax_payment: "Paid",
        address: "SMCHS, Near Nursery Flyover, Karachi",
        price_per_day: 28000, category: "suv", is_verified: true, status: "active",
        photos: [
          "https://cache1.pakwheels.com/system/car_generation_pictures/16730/original/Cover.jpg?1768987806",
          "https://cache1.pakwheels.com/system/car_generation_pictures/16731/original/Front_View.jpg?1768987807",
          "https://cache3.pakwheels.com/system/car_generation_pictures/16734/original/Left_Side_View.jpg?1768987807",
          "https://cache1.pakwheels.com/system/car_generation_pictures/16735/original/Dashboard.jpg?1768987808",
        ]
      },
      {
        vendor_id: v6Id, vendor_email: "operations@khifleet.pk",
        make: "Suzuki Cultus VXL", model_year: "2022",
        registration_no: "CTS-201", registration_date: "2022-12-05",
        owner_name: "KHI Fleet Executive", tax_payment: "Paid",
        address: "SMCHS, Near Nursery Flyover, Karachi",
        price_per_day: 4500, category: "sedan", is_verified: true, status: "active",
        photos: [
          "https://cache4.pakwheels.com/system/car_generation_pictures/6014/original/Suzuki_Cultus_-_PNG.png?1768562638",
          "https://cache2.pakwheels.com/system/car_generation_pictures/7302/original/Front.jpg?1768562641",
          "https://cache1.pakwheels.com/system/car_generation_pictures/6561/original/Headlight.jpg?1768562637",
          "https://cache2.pakwheels.com/system/car_generation_pictures/6565/original/Cockpit.jpg?1768562644",
        ]
      },
    ];

    await Vehicle.insertMany(vehicles);
    console.log(`✓ Inventory synced: ${vehicles.length} vehicles across 6 vendors.`);

    // Seed welcome chat
    const activeDialogue = new Chat({
      renter_id:    renterId,
      renter_email: "musab@renter.com",
      renter_name:  "Musab Khan",
      vendor_id:    v1Id,
      vendor_email: "rentals@khanluxury.pk",
      vendor_name:  "Khan Luxury Wheels",
      messages: [
        {
          sender_id:   v1Id.toString(),
          sender_name: "Khan Luxury Wheels",
          sender_role: "vendor",
          content:     "Salam Musab! Welcome to Khan Luxury Wheels. Browse our fleet and let us know which vehicle catches your eye.",
          read:        true
        }
      ]
    });
    await activeDialogue.save();

    console.log('🎉 Database build completed smoothly.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
};

seedDatabase();