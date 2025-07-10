
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './db.js'
import Message from './models/Message.js'

dotenv.config()
connectDB()

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

app.use(cors())
app.use(express.json())

// 🧠 In-memory user tracker (username → socket.id)
const onlineUsers = new Map()

// ✅ API route to check server health
app.get('/', (req, res) => {
  res.send('🟢 Chat server is live')
})

// ✅ Optional: Fetch message history (sorted oldest → newest)
app.get('/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 })
    res.json(messages)
  } catch (err) {
    res.status(500).json({ error: 'Failed to load messages' })
  }
})

// 💬 Socket.IO chat logic
io.on('connection', (socket) => {
  console.log('📲 A user connected:', socket.id)

  // Register user and update user list
  socket.on('register', (username) => {
    onlineUsers.set(username, socket.id)
    console.log(`✅ Registered: ${username} → ${socket.id}`)

    io.emit('user-list', Array.from(onlineUsers.keys()))
  })

  // Handle private messages
  socket.on('private message', async ({ sender, receiver, content }) => {
    const newMessage = new Message({ sender, receiver, content })
    await newMessage.save()

    const receiverSocketId = onlineUsers.get(receiver)

    if (receiverSocketId) {
      socket.to(receiverSocketId).emit('private message', newMessage)
    }

    // Also send back to sender for confirmation
    socket.emit('private message', newMessage)
  })

  // Handle disconnection and update user list
  socket.on('disconnect', () => {
    for (let [username, id] of onlineUsers.entries()) {
      if (id === socket.id) {
        onlineUsers.delete(username)
        console.log(`❌ ${username} disconnected`)
        break
      }
    }

    io.emit('user-list', Array.from(onlineUsers.keys()))
  })
})

// 🚀 Start server
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`🚀 Chat server running on http://localhost:${PORT}`)
})










































































































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
