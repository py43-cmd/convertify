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
        type: Number, 
        required: false,
    },
    ipAddress: {
        type: String, 
        required: false,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

const Conversion = mongoose.model('Conversion', conversionSchema);

export default Conversion;
