const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/user'); // Import User model


// Load chat thread between renter (userA) and vendor (userB)
router.get('/', async (req, res) => {
  const { userA, userB, markReadFor } = req.query;
  try {
    // Order-independent: find the chat regardless of who is renter/vendor
    const chat = await Chat.findOne({
      $or: [
        { renter_id: userA, vendor_id: userB },
        { renter_id: userB, vendor_id: userA }
      ]
    });
    
    if (chat && markReadFor) {
      let changed = false;
      if (chat.renter_id.toString() === markReadFor && chat.renter_unread) {
        chat.renter_unread = false;
        changed = true;
      } else if (chat.vendor_id.toString() === markReadFor && chat.vendor_unread) {
        chat.vendor_unread = false;
        changed = true;
      }
      if (changed) {
        await chat.save();
      }
    }
    
    res.status(200).json({ messages: chat ? chat.messages : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Both renter AND vendor can call this — role is passed in payload
router.post('/send', async (req, res) => {
  const { sender_id, sender_name, sender_role, content, receiver_id,
          renter_name, vendor_name, renter_email, vendor_email } = req.body;
  try {
    // BAN CHECK: Prevent banned users from sending or receiving messages.
    const sender = await User.findById(sender_id);
    if (sender && sender.status === 'banned') {
        return res.status(403).json({ error: 'Your account is suspended. You cannot send messages.' });
    }

    const receiver = await User.findById(receiver_id);
    if (receiver && receiver.status === 'banned') {
        return res.status(403).json({ error: 'This user account has been suspended.' });
    }


    let renter_id = sender_role === 'renter' ? sender_id : receiver_id;
    let vendor_id = sender_role === 'vendor' ? sender_id : receiver_id;

    let chat = await Chat.findOne({
      $or: [
        { renter_id, vendor_id },
        { renter_id: vendor_id, vendor_id: renter_id }
      ]
    });

    if (!chat) {
      chat = new Chat({
        renter_id,
        vendor_id,
        renter_email: sender_role === 'renter' ? (renter_email || 'renter@netdrive.pk') : (renter_email || 'renter@netdrive.pk'),
        vendor_email: sender_role === 'vendor' ? (vendor_email || 'vendor@netdrive.pk') : (vendor_email || 'vendor@netdrive.pk'),
        renter_name:  sender_role === 'renter' ? sender_name  : (renter_name  || 'Renter'),
        vendor_name:  sender_role === 'vendor' ? sender_name  : (vendor_name  || 'Vendor'),
        messages: []
      });
    }

    chat.messages.push({ sender_id, sender_name, sender_role, content });

    // Mark as unread for the receiver
    if (sender_role === 'renter') {
      chat.vendor_unread = true;
    } else {
      chat.renter_unread = true;
    }

    chat.last_message_at = new Date();
    await chat.save();
    res.status(200).json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vendor or renter: list all their chat threads (for chat inbox)
router.get('/my-chats/:userId', async (req, res) => {
  try {
    const chats = await Chat.find({
      $or: [
        { renter_id: req.params.userId },
        { vendor_id: req.params.userId }
      ]
    }).sort({ last_message_at: -1 });
    res.status(200).json({ chats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark a chat as read by the user
router.patch('/:chatId/mark-read/:userId', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    if (chat.renter_id.toString() === req.params.userId) {
      chat.renter_unread = false;
    } else if (chat.vendor_id.toString() === req.params.userId) {
      chat.vendor_unread = false;
    }
    await chat.save();
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: all chat threads with full sender names and content
router.get('/global-intercept', async (req, res) => {
  try {
    const chats = await Chat.find().sort({ last_message_at: -1 });
    const threads = chats.map(c => ({
      chat_id:     c._id,
      renter_name: c.renter_name,
      vendor_name: c.vendor_name,
      last_msg_at: c.last_message_at,
      messages: c.messages.map(m => ({
        sender_id:   m.sender_id,
        sender_name: m.sender_name,
        sender_role: m.sender_role,
        content:     m.content,
        time:        m.createdAt
      }))
    }));
    res.status(200).json({ threads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;