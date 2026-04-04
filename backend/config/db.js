import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config(); // Ensure variables from .env are loaded

const connectDB = async () => {
    try {
        const mongoUrl = process.env.MONGO_URI || 'mongodb+srv://py_dbuser:Py1972004@cluster0.7vdygde.mongodb.net/convertify';

        const conn = await mongoose.connect(mongoUrl);
        console.log(`✅ MongoDB Successfully Connected: ${conn.connection.host}`);

    } catch (error) {
        console.error(`❌ Database connection error: ${error.message}`);
    }
};

export default connectDB;
