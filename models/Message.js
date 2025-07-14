// models/Message.js
import { chatConnection } from '../db.js';
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true
  },
  recipientId: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const Message = chatConnection.model('Message', messageSchema);
export default Message;







// import mongoose from 'mongoose';

// const messageSchema = new mongoose.Schema({
//   senderId: {
//     type: String,
//     required: true
//   },
//   recipientId: {
//     type: String,
//     required: true
//   },
//   text: {
//     type: String,
//     required: true
//   },
//   timestamp: {
//     type: Date,
//     default: Date.now
//   }
// });

// const Message = mongoose.model('Message', messageSchema);

// export default Message;
