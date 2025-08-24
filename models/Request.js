// models/Request.js
import { donationsConnection } from '../db.js';
import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  id: String,
  itemId: String,
  foodName: String,
  donorEmail: String,
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userEmail: String,
  phone: String,
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

const Request = donationsConnection.model('Request', requestSchema);
export default Request;