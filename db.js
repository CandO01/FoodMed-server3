import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let donationsConnection;
let chatConnection;

try {
  donationsConnection = await mongoose.createConnection(process.env.MONGO_URI_DONATIONS);
  console.log('✅ Connected to foodmed_donations DB');
} catch (error) {
  console.error('❌ Error connecting to foodmed_donations DB:', error.message);
}

try {
  chatConnection = await mongoose.createConnection(process.env.MONGO_URI_CHAT);
  console.log('✅ Connected to foodmed_chat DB');
} catch (error) {
  console.error('❌ Error connecting to foodmed_chat DB:', error.message);
}

if (!donationsConnection) {
  throw new Error('❌ donationsConnection is undefined. DB connection failed.');
}

export { donationsConnection, chatConnection };






























// db.js
// import mongoose from 'mongoose';
// import dotenv from 'dotenv';

// dotenv.config();

// let donationsConnection;
// let chatConnection;

// try {
//   donationsConnection = await mongoose.createConnection(process.env.MONGO_URI_DONATIONS);
//   console.log('✅ Connected to foodmed_donations DB');
// } catch (error) {
//   console.error('❌ Error connecting to foodmed_donations DB:', error.message);
// }

// try {
//   chatConnection = await mongoose.createConnection(process.env.MONGO_URI_CHAT);
//   console.log('✅ Connected to foodmed_chat DB');
// } catch (error) {
//   console.error('❌ Error connecting to foodmed_chat DB:', error.message);
// }

// export { donationsConnection, chatConnection };























// import mongoose from 'mongoose'
// import dotenv from 'dotenv'

// dotenv.config()

// export const connectToDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI)
//     console.log('✅ MongoDB connected')
//   } catch (error) {
//     console.error('❌ MongoDB connection error:', error.message)
//     process.exit(1)
//   }
// }
