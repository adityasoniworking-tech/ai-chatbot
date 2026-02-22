import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    embedding: {
        type: [Number], // Requires Atlas Vector Search setup later
        required: true
    },
    sourceUrl: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Chunk = mongoose.model('Chunk', chunkSchema);
