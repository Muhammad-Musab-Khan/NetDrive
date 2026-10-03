import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, X, Clock } from 'lucide-react';

const ChatBox = ({ currentUserId, currentUserName, currentRole, otherUserId, otherUserName, otherRole, vehicleId }) => {
  const [chat, setChat] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    startOrLoadChat();
  }, [otherUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages]);

  const startOrLoadChat = async () => {
    setLoading(true);
    try {
      const body = currentRole === 'renter'
        ? {
            renter_id: currentUserId, renter_email: localStorage.getItem('userEmail'),
            renter_name: currentUserName, vendor_id: otherUserId,
            vendor_email: '', vendor_name: otherUserName, vehicle_id: vehicleId
          }
        : {
            renter_id: otherUserId, renter_email: '', renter_name: otherUserName,
            vendor_id: currentUserId, vendor_email: localStorage.getItem('userEmail'),
            vendor_name: currentUserName, vehicle_id: vehicleId
          };

      const res = await fetch('http://localhost:5000/api/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) setChat(data.chat);
    } catch (err) {
      console.error('Chat load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !chat) return;
    setSending(true);
    try {
      const res = await fetch(`http://localhost:5000/api/chat/${chat._id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUserId,
          sender_name: currentUserName,
          sender_role: currentRole,
          content: message.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setChat(data.chat);
        setMessage('');
      }
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
  };

  const expiryDays = chat
    ? Math.max(0, Math.ceil((new Date(chat.expires_at) - new Date()) / (1000 * 60 * 60 * 24)))
    : 21;

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
      Loading chat...
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${otherRole === 'vendor' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
            {otherUserName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{otherUserName}</p>
            <p className="text-xs text-slate-400 capitalize">{otherRole}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Clock size={12} />
          <span>Expires in {expiryDays} days</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50" style={{ maxHeight: '400px' }}>
        {!chat?.messages?.length ? (
          <div className="text-center py-8">
            <MessageCircle size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No messages yet.</p>
            <p className="text-slate-300 text-xs mt-1">Start the conversation below.</p>
          </div>
        ) : (
          <>
            {chat.messages.map((msg, i) => {
              const isMe = msg.sender_id === currentUserId;
              const showDate = i === 0 || formatDate(chat.messages[i-1].createdAt) !== formatDate(msg.createdAt);
              return (
                <div key={msg._id || i}>
                  {showDate && (
                    <div className="text-center my-2">
                      <span className="text-xs text-slate-400 bg-gray-100 px-3 py-1 rounded-full">{formatDate(msg.createdAt)}</span>
                    </div>
                  )}
                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-sm ${isMe ? 'order-2' : 'order-1'}`}>
                      {!isMe && <p className="text-xs text-slate-400 mb-1 ml-1">{msg.sender_name}</p>}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-white text-slate-800 border border-gray-100 rounded-tl-sm shadow-sm'}`}>
                        {msg.content}
                      </div>
                      <p className={`text-xs text-slate-300 mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-3 px-4 py-3 border-t border-gray-100 bg-white">
        <input
          type="text" value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..." maxLength={500}
          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400 transition"
        />
        <button type="submit" disabled={sending || !message.trim()}
          className="w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition disabled:bg-blue-200">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
