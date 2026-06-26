import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config(); // Ensure variables from .env are loaded

const connectDB = async () => {
    try {
        const mongoUrl = process.env.MONGO_URI || 'mongodb+srv://py_dbuser:Py1972004@cluster0.7vdygde.mongodb.net/convertify';

        const conn = await mongoose.connect(mongoUrl);
        console.log(`✅ MongoDB Successfully Connected: ${conn.connection.host}`);

        // Clean up any incorrect legacy non-sparse googleId index to let Mongoose recreate it with sparse: true
        try {
            const indexes = await conn.connection.db.collection('users').indexes();
            const googleIdIndex = indexes.find(idx => idx.name === 'googleId_1');
            if (googleIdIndex && !googleIdIndex.sparse) {
                await conn.connection.db.collection('users').dropIndex('googleId_1');
                console.log('🧹 Legacy non-sparse googleId index dropped successfully.');
            }
        } catch (e) {
            // Ignore if collection or index doesn't exist
        }

    } catch (error) {
        console.error(`❌ Database connection error: ${error.message}`);
    }
};

export default connectDB;
