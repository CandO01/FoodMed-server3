// models/Request.js
import { donationsConnection } from '../db.js';
import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  id: String,
  itemId: String,
  foodName: String,
  donorEmail: String,
  donorId: String,
  userId: String,
  userEmail: String,
  phone: String,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Request = donationsConnection.model('Request', requestSchema);
export default Request;


































// import mongoose from 'mongoose'
// const requestSchema = new mongoose.Schema({
//   id: String,
//   userId: String,           // NEW: track who made request
//   donorId: String,          // NEW: track who owns the food
//   foodId: String,           // NEW: connect to the food item
//   email: String,
//   phone: String,
//   foodName: String,
//   message: String,
//   status: {
//     type: String,
//     default: 'pending'
//   },
//   confirmationDetails: {
//     date: String,
//     time: String,
//     location: String
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   confirmedAt: Date
// });
// export const Request = mongoose.model('Request', requestSchema)





// import mongoose from 'mongoose'

// const requestSchema = new mongoose.Schema({
//   id: String,
//   email: String,
//   phone: String,
//   foodName: String,
//   message: String,
//   status: {
//     type: String,
//     default: 'pending'
//   },
//   confirmationDetails: {
//     date: String,
//     time: String,
//     location: String
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   confirmedAt: Date
// })

// export const Request = mongoose.model('Request', requestSchema)
