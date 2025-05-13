import multer from 'multer';
import OpenAI from 'openai';
import path from 'path';

export const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '@/public/uploads/')  // Destination folder
    },
    filename: function (req, file, cb) {
        // Append the original file extension
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});

export const upload = multer({ storage: storage });

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});