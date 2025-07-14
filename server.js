import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import { Server } from 'socket.io';
import { Food } from './models/Food.js'
import  Request  from './models/Request.js';
import Message from './models/Message.js';
import { donationsConnection, chatConnection } from './db.js';


dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3005;

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioFrom = process.env.TWILIO_PHONE;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
  });
}

const httpServer = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type'
    })
    res.end()
    return
  }

  // For uploading of food by the donor filling the form
  if (req.method === 'POST' && req.url === '/submit') {
    const buffers = [];
    req.on('data', chunk => buffers.push(chunk));
    req.on('end', async () => {
      const boundary = req.headers['content-type'].split('boundary=')[1];
      const rawData = Buffer.concat(buffers).toString('latin1');
      const parts = rawData.split(`--${boundary}`);

      const fields = {};
      let imageUrl = null;

      for (const part of parts) {
        if (!part.includes('Content-Disposition')) continue;

        const nameMatch = part.match(/name="([^"]+)"/);
        const filenameMatch = part.match(/filename="([^"]+)"/);
        const contentTypeMatch = part.match(/Content-Type: (.+)/);
        const name = nameMatch?.[1];
        const start = part.indexOf('\r\n\r\n');
        const rawBody = part.slice(start + 4, part.lastIndexOf('\r\n'));

        if (filenameMatch && contentTypeMatch && name === 'image') {
          const buffer = Buffer.from(rawBody, 'latin1');
          await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream({
              folder: 'foodmed',
              public_id: `${uuidv4()}-${filenameMatch[1]}`
            }, (err, result) => {
              if (err) return reject(err);
              imageUrl = result.secure_url;
              resolve();
            });
            uploadStream.end(buffer);
          });
        } else if (name) {
          fields[name] = rawBody.trim();
        }
      }

      const foodData = new Food({
              id: uuidv4(),
              foodName: fields.foodName,
              description: fields.description,
              quantity: fields.quantity,
              expiryDate: fields.expiryDate,
              location: fields.location,
              foodType: fields.foodType,
              mode: fields.mode,
              imageUrl,
              donorId: fields.donorId,  // incoming from frontend (passed from auth server)
              donorName: fields.donorName,
              donorEmail: fields.donorEmail,
              donorPhone: fields.donorPhone,
              createdAt: new Date()
            });


      await foodData.save();

      res.writeHead(201);
      res.end(JSON.stringify({ message: 'Food uploaded successfully', data: foodData }));
    });
  }

  // ===POST request to handle user request
  else if (req.method === 'POST' && req.url === '/request') {
            try {
            const {
              itemId,
              foodName,
              donorEmail,
              donorId,
              userId,
              email: userEmail,
              phone
            } = await parseJSONBody(req);

              if (!itemId || !foodName || !donorEmail || !userEmail || !phone) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Missing required fields' }));
                return;
              }
            const newRequest = new Request({
                    id: uuidv4(),
                    itemId,
                    foodName,
                    donorEmail,
                    donorId: donorId || '',
                    userId: userId || '',
                    userEmail,
                    phone,
                    status: 'pending',
                    createdAt: new Date(),
                  });

               await newRequest.save();
         res.writeHead(200, { 'Content-Type': 'application/json' });
         res.end(JSON.stringify({ message: 'Your request has been submitted!' }));
    }
        catch (error) {
          console.error('❌ Error saving request:', error);
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }

  }

  // Updated GET /requests to filter by role and id
  else if (req.url.startsWith('/requests') && req.method === 'GET') {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const role = parsedUrl.searchParams.get('role');
    const id = parsedUrl.searchParams.get('id');           // userId or donorId

      if (!role || !id) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing role or id' }));
        return;
      }

            const filter =
                role === 'donor'
                  ? { donorEmail: id }
                  : { userEmail: id };

              try {
                  const requests = await Request.find(filter).lean();
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  if (role === 'user') {
                    // fetch donor names using donorEmail from food submissions
                    const allFood = await Food.find().lean();

                    const enrichedRequests = requests.map(req => {
                      const match = allFood.find(item => item.donorEmail === req.donorEmail);
                      return {
                        ...req,
                        donorName: match?.donorName || req.donorEmail
                      };
                    });

                    res.end(JSON.stringify(enrichedRequests));
                  } 
                  else if (role === 'donor') {
                    // enrich userName by fetching from Request collection or users collection (if exists)
                    // Assuming userName is stored in requests or else fallback to userEmail
                    const enrichedRequests = requests.map(req => ({
                      ...req,
                      userName: req.userName || req.userEmail
                    }));
                    res.end(JSON.stringify(enrichedRequests));
                } 
                  else {
                    const enrichedRequests = requests.map(req => ({
                      ...req,
                      userName: req.userName || req.userEmail
                    }));
                    res.end(JSON.stringify(enrichedRequests));
                  } 
                } catch (err) {
                  console.error('❌ Error fetching requests:', err);
                  res.writeHead(500);
                  res.end(JSON.stringify({ error: 'Failed to fetch requests' }));
                }
      
      }


// === Get All Submissions ===
  else if (req.method === 'GET' && req.url.startsWith('/submissions')) {
        const url = new URL(`http://localhost:3005${req.url}`);
        const email = url.searchParams.get('email');
        const type = url.searchParams.get('type');
        
        let items = await Food.find();

        if (email) {
          items = items.filter(i => i.donorEmail === email);
        }

        if (type) {
          items = items.filter(i => i.foodType?.toLowerCase() === type.toLowerCase());
        }

        res.writeHead(200);
        res.end(JSON.stringify(items));
      }


  else if (req.method === 'PATCH' && req.url.startsWith('/request/update/')) {
    const id = req.url.split('/').pop();
    const body = await parseJSONBody(req);

    const updated = await Request.findOneAndUpdate(
      { id },
      {
        $set: {
          status: 'confirmed',
          confirmedAt: new Date(),
          confirmationDetails: {
            date: body.date,
            time: body.time,
            location: body.location
          }
        }
      },
      { new: true }
    );

    if (!updated) {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'Request not found' }));
    }

    transporter.sendMail({
      from: process.env.EMAIL,
      to: updated.email,
      subject: '✅ Your Food Request is Confirmed!',
      text: `Hello, your request for ${updated.foodName} has been confirmed for ${body.date} at ${body.time} in ${body.location}.`
    });

    if (updated.phone) {
      await twilioClient.messages.create({
        body: `FoodMed: Your request for ${updated.foodName} is confirmed for ${body.date}, ${body.time} at ${body.location}.`,
        from: twilioFrom,
        to: updated.phone
      });
    }

    res.writeHead(200);
    res.end(JSON.stringify({ message: 'Request confirmed and user notified' }));
  }

  else if (req.method === 'DELETE' && req.url.startsWith('/request/delete/')) {
    const id = req.url.split('/').pop();
    const deleted = await Request.deleteOne({ id });

    if (deleted.deletedCount === 0) {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'Request not found' }));
    }

    res.writeHead(200);
    res.end(JSON.stringify({ message: 'Request deleted successfully' }));
  }

  // === Get Chat Messages Between Sender and Recipient ===
else if (req.method === 'GET' && req.url.startsWith('/messages')) {
  const urlObj = new URL(`http://localhost:3001${req.url}`);
  const senderId = urlObj.searchParams.get('senderId');
  const recipientId = urlObj.searchParams.get('recipientId');

  if (!senderId || !recipientId) {
    res.writeHead(400);
    return res.end(JSON.stringify({ error: 'senderId and recipientId required' }));
  }

  try {
    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: recipientId },
        { sender: recipientId, receiver: senderId }
      ]
    }).sort({ timestamp: 1 });

    res.writeHead(200);
    res.end(JSON.stringify(messages));
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}


  else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
});


    let onlineUsers = [];
    const socketToUser = {}; // Map socket.id => userId

   io.on('connection', (socket) => {
  console.log('🟢 A user connected:', socket.id);

  socket.on('joinRoom', ({ senderId, recipientId }) => {
    socket.join(senderId);
    socket.join(recipientId);
  });

  socket.on('online', (userId) => {
    socketToUser[socket.id] = userId;
     socket.join(userId); 
    if (!onlineUsers.includes(userId)) {
      onlineUsers.push(userId);
    }
    io.emit('onlineUsers', onlineUsers);
  });

  socket.on('sendMessage', async ({ senderId, recipientId, text }) => {
    const message = new Message({ senderId, recipientId, text });
    await message.save();
    io.to(recipientId).emit('receiveMessage', message);
  });

  socket.on('disconnect', () => {
    const userId = socketToUser[socket.id];
    delete socketToUser[socket.id];
    if (userId) {
      onlineUsers = onlineUsers.filter((u) => u !== userId);
      io.emit('onlineUsers', onlineUsers);
    }
    console.log('🔴 A user disconnected:', socket.id);
  });
});


// Ensure DB connections are ready before starting server
const waitForConnections = async () => {
  while (
    !donationsConnection?.readyState === 1 ||
    !chatConnection?.readyState === 1
  ) {
    console.log('⏳ Waiting for DB connections...');
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
};

waitForConnections();


// const waitForConnections = async () => {
//   while (
//     donationsConnection.readyState !== 1 ||
//     chatConnection.readyState !== 1
//   ) {
//     console.log('⏳ Waiting for DB connections...');
//     await new Promise(resolve => setTimeout(resolve, 500));
//   }

//   httpServer.listen(PORT, () => {
//     console.log(`🚀 Server running at http://localhost:${PORT}`);
//   });
// };

// waitForConnections();



    //for group chat
  // socket.on('joinRoom', ({ senderId, recipientId }) => {
  //   socket.join(senderId);
  //   socket.join(recipientId);
  // });

  //For one-on-one chat
 


  // socket.on('sendMessage', async ({ senderId, recipientId, text }) => {
  //   const message = new Message({ senderId, recipientId, text });
  //   await message.save();
  //   io.to(recipientId).emit('receiveMessage', message);
  // });








// import express from 'express'
// import http from 'http'
// import { Server } from 'socket.io'
// import cors from 'cors'
// import dotenv from 'dotenv'
// import connectDB from './db.js'
// import Message from './models/Message.js'

// dotenv.config()
// connectDB()

// const app = express()
// const server = http.createServer(app)

// const io = new Server(server, {
//   cors: {
//     origin: '*',
//     methods: ['GET', 'POST']
//   }
// })

// app.use(cors())
// app.use(express.json())

// // 🧠 In-memory user tracker (username → socket.id)
// const onlineUsers = new Map()

// // ✅ API route to check server health
// app.get('/', (req, res) => {
//   res.send('🟢 Chat server is live')
// })

// // ✅ Optional: Fetch message history (sorted oldest → newest)
// app.get('/messages', async (req, res) => {
//   try {
//     const messages = await Message.find().sort({ createdAt: 1 })
//     res.json(messages)
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to load messages' })
//   }
// })

// // 💬 Socket.IO chat logic
// io.on('connection', (socket) => {
//   console.log('📲 A user connected:', socket.id)

//   // Register user and update user list
//   socket.on('register', (username) => {
//     onlineUsers.set(username, socket.id)
//     console.log(`✅ Registered: ${username} → ${socket.id}`)

//     io.emit('user-list', Array.from(onlineUsers.keys()))
//   })

//   // Handle private messages
//   socket.on('private message', async ({ sender, receiver, content }) => {
//     const newMessage = new Message({ sender, receiver, content })
//     await newMessage.save()

//     const receiverSocketId = onlineUsers.get(receiver)

//     if (receiverSocketId) {
//       socket.to(receiverSocketId).emit('private message', newMessage)
//     }

//     // Also send back to sender for confirmation
//     socket.emit('private message', newMessage)
//   })

//   // Handle disconnection and update user list
//   socket.on('disconnect', () => {
//     for (let [username, id] of onlineUsers.entries()) {
//       if (id === socket.id) {
//         onlineUsers.delete(username)
//         console.log(`❌ ${username} disconnected`)
//         break
//       }
//     }

//     io.emit('user-list', Array.from(onlineUsers.keys()))
//   })
// })

// 🚀 Start server
// const PORT = process.env.PORT || 3001
// server.listen(PORT, () => {
//   console.log(`🚀 Chat server running on http://localhost:${PORT}`)
// })










































































































// import express from 'express'
// import http from 'http'
// import { Server } from 'socket.io'
// import cors from 'cors'
// import dotenv from 'dotenv'
// import connectDB from './db.js'
// import Message from './models/Message.js'

// dotenv.config()
// connectDB()

// const app = express()
// const server = http.createServer(app)

// const io = new Server(server, {
//   cors: {
//     origin: '*',
//     methods: ['GET', 'POST']
//   }
// })

// app.use(cors())
// app.use(express.json())

// // 👇 Optional API route to get previous messages
// app.get('/messages', async (req, res) => {
//   try {
//     const messages = await Message.find().sort({ createdAt: 1 })
//     res.json(messages)
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to load messages' })
//   }
// })

// // 👇 Socket.io chat logic
// io.on('connection', (socket) => {
//   console.log('📲 A user connected:', socket.id)

//   socket.on('chat message', async ({ sender, content, receiver }) => {
//     const newMessage = new Message({ sender, content, receiver })
//     await newMessage.save()

//     io.emit('chat message', newMessage) // send to all clients
//   })

//   socket.on('disconnect', () => {
//     console.log('❌ User disconnected:', socket.id)
//   })
// })

// const PORT = process.env.PORT || 3001
// server.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`)
// })
