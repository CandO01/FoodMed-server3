// models/Message.js
import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      required: true,
    },
    receiver: {
      type: String, // Optional, if you're targeting a specific user
      default: null,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
)

export default mongoose.model('Message', messageSchema)
