const nodemailer = require('nodemailer');

const sendOTPEmail = async (email, otpCode) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"NetDrive Verification" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your NetDrive Verification Code',
            text: `Your OTP is: ${otpCode}. It expires in 5 minutes.`,
            html: `<b>Your OTP is: ${otpCode}</b><p>It expires in 5 minutes.</p>`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('❌ Email Error:', error);
        throw error;
    }
};

// Export as an object so the route can destructure it
module.exports = { sendOTPEmail };