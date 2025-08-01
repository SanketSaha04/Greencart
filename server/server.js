import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import userRouter from './routes/Userroute.js';
import connectDB from './configs/db.js';

const app = express();
const port = process.env.PORT || 4000;

// Connect to database
await connectDB(); // Make sure this line exists and works

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));

// Routes
app.get('/', (req, res) => res.send("API is Working"));
app.use('/api/user', userRouter);

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
