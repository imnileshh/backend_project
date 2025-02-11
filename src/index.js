import 'dotenv/config'
import connectDB from './db/index.js';
import { app } from './app.js';


connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`App is running at port ${process.env.PORT}`)
        })
    })
    .catch((error) => {
        console.log(`Failed to Connect MongoDB: ${error}`)
    })










// This can be written in diffrent file
// import express from 'express'
// const app = express()
//     ; (async () => {
//         try {
//             await mongoose.connect(`${process.env.MONGODB_URI}/${DB_Name}`);
//             app.on("Error", (error) => {
//                 console.log("failed to listen DB", error);
//                 throw error;
//             })
//             app.listen(process.env.PORT, () => {
//                 console.log(`App is running on port ${process.env.PORT}`)
//             })
//         } catch (error) {
//             console.log("Error:", error);
//             throw error;
//         }
//     })()