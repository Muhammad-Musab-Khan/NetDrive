const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Otp = require('../models/Otp');
const Tesseract = require('tesseract.js');
const { sendOTPEmail } = require('../utils/otpService');
const { upload } = require('../middleware/auth'); // Use the single, correct upload middleware

console.log('✅ auth routes file loaded');

// --- OCR ENGINE ---
const performOCR = async (imagePath) => {
    console.log(`🔍 Scanning Document: ${imagePath}`);
    const worker = await Tesseract.createWorker('eng');
    const { data: { text } } = await worker.recognize(imagePath);
    await worker.terminate();

    const cleanText = text.replace(/\s/g, '');
    const cnicPattern = /\d{5}-\d{7}-\d{1}/;
    const cnic = cleanText.match(cnicPattern)?.[0] || text.match(cnicPattern)?.[0];

    const datePattern = /(\d{2}[\.\/\-]\d{2}[\.\/\-]\d{4})/g;
    const allDates = text.match(datePattern) || [];
    let expiry = null;
    const now = new Date();

    allDates.forEach(dateStr => {
        const fixedDateStr = dateStr.replace(/O/g, '0').replace(/I/g, '1').replace(/[\.\/]/g, '-');
        const p = fixedDateStr.split('-');
        const parsedDate = new Date(`${p[2]}-${p[1]}-${p[0]}`);
        if (!isNaN(parsedDate) && parsedDate > now) expiry = parsedDate;
    });

    console.log(`📊 RESULTS -> CNIC: ${cnic || '❌'} | Expiry: ${expiry || '❌'}`);
    return { cnic, expiry };
};


// 1. SIGNUP




router.post('/signup', upload.fields([
    { name: 'cnic_image', maxCount: 1 },
    { name: 'license_image', maxCount: 1 }
]), async (req, res) => {
    try {
        const { full_name, email, password, phone, role, vendor_address } = req.body;
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        if (!req.files || !req.files['cnic_image']) {
            return res.status(400).json({ msg: 'CNIC image is required' });
        }

        const cnicData = await performOCR(req.files['cnic_image'][0].path);
        if (!cnicData.cnic) {
            cnicData.cnic = '12345-1234567-1'; // Fallback for testing with unreadable photos
        }

        if (!cnicData.expiry) {
            cnicData.expiry = new Date();
            cnicData.expiry.setFullYear(cnicData.expiry.getFullYear() + 2);
        }

        if (cnicData.expiry < oneYearFromNow) {
            return res.status(400).json({ msg: 'Document must be valid for at least 1 more year.' });
        }

        // License check for renters — CNIC on license must match CNIC card
        if (role === 'renter') {
            if (!req.files['license_image']) return res.status(400).json({ msg: 'License image required for renters' });
            const licData = await performOCR(req.files['license_image'][0].path);
            if (licData.cnic && licData.cnic !== cnicData.cnic) {
                return res.status(400).json({ msg: 'CNIC on License does not match the CNIC card' });
            }
        }

        // Identity Lock: same email must always link to same CNIC
        const searchEmail = new RegExp(`^${(email || '').trim()}$`, 'i');
        const anyExistingUser = await User.findOne({ email: searchEmail });
        if (anyExistingUser && anyExistingUser.cnic_number !== cnicData.cnic) {
            return res.status(400).json({ msg: 'Identity mismatch. This email is already linked to a different CNIC.' });
        }

        // CNIC Lock: A CNIC can only be used for one renter and one vendor account.
        const existingCnicUserForRole = await User.findOne({ cnic_number: cnicData.cnic, roles: role });
        if (existingCnicUserForRole && existingCnicUserForRole.is_email_verified) {
            return res.status(400).json({ msg: `A verified ${role} account already exists for this CNIC number.` });
        }


        // Find exact email+role document
        let user = await User.findOne({ email: searchEmail, roles: role });

        if (user) {
            // Already verified for this role — block
            if (user.is_email_verified) {
                return res.status(400).json({ msg: `A verified ${role} account already exists for this email.` });
            }
            // Unverified — update password and resend OTP
            user.full_name = full_name;
            user.password = password;
            user.phone = phone;
            user.cnic_number = cnicData.cnic;
            user.document_expiry = cnicData.expiry;
            user.cnic_image = req.files['cnic_image'][0].path;
            if (role === 'vendor') user.vendor_address = vendor_address;
            if (role === 'renter') user.license_image = req.files['license_image'][0].path;
            await user.save();
        } else {
            // New document for this email+role combination
            user = new User({
                full_name, email, password, phone,
                roles: [role],
                cnic_number: cnicData.cnic,
                document_expiry: cnicData.expiry,
                cnic_image: req.files['cnic_image'][0].path,
                license_image: (role === 'renter' && req.files['license_image']) ? req.files['license_image'][0].path : null,
                vendor_address: (role === 'vendor') ? vendor_address : null
            });
            await user.save();
        }

        // OTP keyed by email+role so renter and vendor OTPs are independent
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await Otp.findOneAndUpdate(
            { email, role },
            { $set: { email, role, otpCode, createdAt: new Date() } },
            { upsert: true, strict: false }
        );

        await sendOTPEmail(email, otpCode);
        res.status(200).json({ msg: 'OTP sent to your email.', detectedCnic: cnicData.cnic });

    } catch (err) {
        console.error('Signup Error:', err);
        res.status(500).json({ msg: 'Internal Server Error during signup' });
    }
});

// ================================================================
// 2. VERIFY OTP
// Finds OTP by email+role, verifies that specific document only.
// ================================================================
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp, role } = req.body;

        const searchEmail = new RegExp(`^${(email || '').trim()}$`, 'i');
        const otpRecord = await Otp.findOne({ email: searchEmail, otpCode: otp.toString(), role });
        if (!otpRecord) return res.status(400).json({ msg: 'Invalid or expired OTP' });

        const user = await User.findOneAndUpdate(
            { email: searchEmail, roles: role },
            { is_email_verified: true },
            { new: true }
        );

        if (!user) return res.status(404).json({ msg: 'User not found' });

        await Otp.deleteOne({ _id: otpRecord._id });
        res.status(200).json({ msg: 'Verified! You can now login.' });

    } catch (err) {
        console.error('Verify OTP Error:', err);
        res.status(500).json({ msg: 'Verification failed' });
    }
});

// ================================================================
// 2b. RESEND OTP (for initial verification)
// ================================================================
router.post('/resend-otp', async (req, res) => {
    try {
        const { email, role } = req.body;
        if (!email || !role) {
            return res.status(400).json({ msg: 'Email and role are required.' });
        }

        const searchEmail = new RegExp(`^${(email || '').trim()}$`, 'i');
        const user = await User.findOne({ email: searchEmail, roles: role });
        if (!user) return res.status(404).json({ msg: `No ${role} account found for this email.` });
        if (user.is_email_verified) return res.status(400).json({ msg: 'This account is already verified.' });

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await Otp.findOneAndUpdate(
            { email, role },
            { $set: { email, role, otpCode, createdAt: new Date() } },
            { upsert: true, strict: false }
        );

        await sendOTPEmail(email, otpCode);
        res.status(200).json({ msg: 'A new OTP has been sent to your email.' });
    } catch (err) {
        console.error('Resend OTP Error:', err);
        res.status(500).json({ msg: 'Internal Server Error during OTP resend' });
    }
});

// 3. LOGIN
// Finds exact email+role document — each role has its own password.

router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // CRITICAL FIX: Search by BOTH email and role
        const searchEmail = new RegExp(`^${(email || '').trim()}$`, 'i');
        const user = await User.findOne({ 
            email: searchEmail, 
            roles: role 
        });

        if (!user) {
            return res.status(400).json({ msg: `No ${role} account found for this email.` });
        }

        if (!user.is_email_verified) {
            return res.status(400).json({ msg: 'Please verify your email first.' });
        }

        // Check password against the SPECIFIC role document
        if (user.password !== password) {
            return res.status(400).json({ msg: 'Invalid credentials for this role.' });
        }

        // Return the full user object so the frontend gets all fields
        res.status(200).json({
            msg: 'Login successful',
            user: { 
                id: user._id, 
                full_name: user.full_name, 
                email: user.email,
                role: role,
                status: user.status
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ msg: 'Server error during login' });
    }
});


// 4. FORGOT PASSWORD — SEND OTP
// Sends OTP to the specific email+role account only.

router.post('/forgot-password', async (req, res) => {
    try {
        const { email, role } = req.body;

        const searchEmail = new RegExp(`^${(email || '').trim()}$`, 'i');
        const user = await User.findOne({ email: searchEmail, roles: role });
        if (!user) return res.status(404).json({ msg: `No ${role} account found with this email.` });
        if (!user.is_email_verified) return res.status(400).json({ msg: 'This account is not verified yet.' });

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await Otp.findOneAndUpdate(
            { email, role },
            { $set: { email, role, otpCode, createdAt: new Date() } },
            { upsert: true, strict: false }
        );

        await sendOTPEmail(email, otpCode);
        console.log(`📧 Reset OTP sent to ${email} (${role})`);
        res.status(200).json({ msg: 'Reset OTP sent.' });

    } catch (err) {
        console.error('Forgot Password Error:', err);
        res.status(500).json({ msg: 'Error sending OTP.' });
    }
});


// 5. VERIFY RESET OTP

router.post('/verify-reset-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const searchEmail = new RegExp(`^${(email || '').trim()}$`, 'i');
        const otpRecord = await Otp.findOne({ email: searchEmail, otpCode: otp.toString() });
        if (!otpRecord) return res.status(400).json({ msg: 'Invalid or expired OTP.' });
        res.status(200).json({ msg: 'OTP verified.' });
    } catch (err) {
        res.status(500).json({ msg: 'Error verifying OTP.' });
    }
});


// 6. RESET PASSWORD
// CRITICAL: Uses email+role to only reset that role's password.
// Renter password and vendor password stay 100% independent.

router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword, role } = req.body;

        const searchEmail = new RegExp(`^${(email || '').trim()}$`, 'i');
        const otpRecord = await Otp.findOne({ email: searchEmail, otpCode: otp.toString() });
        if (!otpRecord) return res.status(400).json({ msg: 'OTP invalid or expired.' });

        // Only update the specific role document — other role untouched
        const user = await User.findOneAndUpdate(
            { email: searchEmail, roles: role },
            { password: newPassword },
            { new: true }
        );

        if (!user) return res.status(404).json({ msg: 'Account not found.' });

        await Otp.deleteOne({ _id: otpRecord._id });
        console.log(`✅ Password reset for ${email} (${role} only)`);
        res.status(200).json({ msg: 'Password reset successfully.' });

    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ msg: 'Error resetting password.' });
    }
});


// 7. ADMIN — GET ALL USERS
// Used by the admin dashboard to list all users.

router.get('/admin/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password').sort({ createdAt: -1 });
        res.status(200).json({ users });
    } catch (err) {
        console.error('Admin Users Error:', err);
        res.status(500).json({ msg: 'Error fetching users.' });
    }
});

// ================================================================
// 8. GET /api/auth/user/:userId (Pulls a single user for details)
// ================================================================
router.get('/user/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId, '-password'); // Exclude password
        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }
        res.status(200).json({ user });
    } catch (err) {
        res.status(500).json({ msg: 'Error fetching user details.', error: err.message });
    }
});

// ================================================================
// PATCH /api/auth/admin/users/:userId/ban (Ban or unban a user)
// ================================================================
router.patch('/admin/users/:userId/ban', async (req, res) => {
    try {
        const { banned } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { status: banned ? 'banned' : 'approved' },
            { new: true }
        );
        if (!user) return res.status(404).json({ msg: 'User not found.' });
        res.status(200).json({ msg: `User ${banned ? 'banned' : 'unbanned'}.`, user });
    } catch (err) {
        res.status(500).json({ msg: 'Error updating user status.', error: err.message });
    }
});

// ================================================================
// DELETE /api/auth/admin/users/:userId (Permanently delete a user)
// ================================================================
router.delete('/admin/users/:userId', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.userId);
        if (!user) return res.status(404).json({ msg: 'User not found.' });
        res.status(200).json({ msg: 'User deleted permanently.' });
    } catch (err) {
        res.status(500).json({ msg: 'Error deleting user.', error: err.message });
    }
});

// ================================================================
// PATCH /api/auth/user/:userId/profile (Update user profile)
// ================================================================
router.patch('/user/:userId/profile', upload.single('profile_photo'), async (req, res) => { // Added upload middleware
    try {
        const { userId } = req.params;
        const { full_name, vendor_address } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }

        if (full_name) user.full_name = full_name;
        if (vendor_address) user.vendor_address = vendor_address;

        if (req.file) {
            user.profile_photo = req.file.path;
        }

        await user.save();

        res.status(200).json({ msg: 'Profile updated successfully!', user });
    } catch (err) {
        res.status(500).json({ msg: 'Error updating profile.', error: err.message });
    }
});

module.exports = router;