import mongoose from 'mongoose';

const conversionSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true,
        trim: true,
    },
    conversionType: {
        type: String,
        required: true,
        enum: ['merge', 'word-to-pdf', 'pdf-to-word'], 
    },
    status: {
        type: String,
        required: true,
        enum: ['success', 'failed', 'processing'],
        default: 'success'
    },
    fileSize: {
        type: Number, // Optional: Storing size in bytes
        required: false,
    },
    ipAddress: {
        type: String, // Useful if you have no login system but want to limit conversions per user
        required: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

const Conversion = mongoose.model('Conversion', conversionSchema);

export default Conversion;
