// models/Food.js
import { donationsConnection } from '../db.js';
import mongoose from 'mongoose';

const foodSchema = new mongoose.Schema({
  id: String,
  foodName: String,
  description: String,
  quantity: String,
  expiryDate: String,
  location: String,
  foodType: String,
  mode: String,
  imageUrl: String,
  donorId: String,
  donorName: String,
  donorEmail: String,
  donorPhone: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Register model on donationsConnection
export const Food = donationsConnection.model('Food', foodSchema);

