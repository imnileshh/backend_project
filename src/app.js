import express from 'express';
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express();

//Avoid CORS 
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

// Handle JSON data
app.use(express.json({
    limit: '16kb'
}));

//Handle Req from Links
app.use(express.urlencoded({
    extended: true,
    limit: '16kb'
}));

// To store files on local server
app.use(express.static("public"))

// Handle Cookies
app.use(cookieParser())



// import Routes 

import userRouter from './routes/user.routes.js';

app.use("/api/v1/users", userRouter);
// http://localhost:8000/api/user

export { app }