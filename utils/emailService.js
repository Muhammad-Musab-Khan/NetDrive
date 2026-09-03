const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, htmlContent) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"NetDrive" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html: htmlContent,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('❌ Email Error:', error);
        // We don't want to throw and crash the booking flow if email fails
        return false;
    }
};

module.exports = { sendEmail };

