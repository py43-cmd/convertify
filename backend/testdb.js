import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Conversion from './models/Conversion.js';
dotenv.config();

const testDB = async () => {
    try {
        console.log("Connecting to MongoDB...");
        const mongoUrl = process.env.MONGO_URI || 'mongodb+srv://py_dbuser:Py1972004@cluster0.7vdygde.mongodb.net/convertify';
        await mongoose.connect(mongoUrl);
        console.log("✅ Connected!");

        console.log("Attempting to save a test document...");
        const newRecord = await Conversion.create({
            originalName: "test_manual_insert.pdf",
            conversionType: "merge",
            status: "success",
            fileSize: 1024
        });
        console.log("💾 SUCCESS! Data saved:", newRecord);

        console.log("Fetching all records in DB...");
        const allRecords = await Conversion.find({});
        console.log(`Found ${allRecords.length} total records in the database.`);

        process.exit();
    } catch (err) {
        console.error("❌ ERROR SAVING TO DB:", err.message);
        process.exit(1);
    }
};

testDB();
