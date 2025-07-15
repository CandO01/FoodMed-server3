import mongoose from 'mongoose';
import { donationsConnection } from '../db.js'; // ✅ use same DB as Food

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  phone: String
});

// Register the model on the donationsConnection
const User = donationsConnection.model('User', userSchema);

export default User;
