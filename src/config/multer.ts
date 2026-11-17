import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';

const MAX_MB = parseInt(process.env.UPLOAD_MAX_MB ?? '50');

function storage(dest: string) {
  return multer.diskStorage({
    destination: path.join(process.cwd(), dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, uuid() + ext);
    },
  });
}

export const uploadBook = multer({
  storage: storage('uploads/books'),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'application/epub+zip', 'application/x-fictionbook+xml'];
    cb(null, allowed.includes(file.mimetype) || file.originalname.endsWith('.fb2'));
  },
});

export const uploadCover = multer({
  storage: storage('uploads/covers'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});
