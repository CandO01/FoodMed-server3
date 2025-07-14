// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },       // user full name
  email: { type: String, required: true, unique: true },
  role: { type: String, required: true },       // e.g. 'user' or 'donor'
  phone: { type: String },
  passwordHash: { type: String },                // if you store hashed passwords
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

export default User;
