import mongoose from 'mongoose';
import { donationsConnection } from '../db.js'; // ✅ use same DB as Food


const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  canDonate: { type: Boolean, default: true },
  canRequest: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
})

// Register the model on the donationsConnection
const User = donationsConnection.model('User', userSchema);

export default User;






































// const userSchema = new mongoose.Schema({
//   name: String,
//   email: { type: String, unique: true },
//   role: String,
//   phone: String
// });


