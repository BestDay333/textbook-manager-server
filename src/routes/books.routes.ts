import { Router } from 'express';
import multer from 'multer';
import { uploadBook as multerBook, uploadCover } from '../config/multer';
import {
  listBooks, getBook, uploadBook, updateBook, deleteBook,
  downloadBook, saveBook, unsaveBook, myBooks, updateProgress,
} from '../controllers/books.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';

const r = Router();

// Public
r.get('/',           listBooks);
r.get('/:id',        getBook);

// Auth required
r.get('/my/library', requireAuth, myBooks);
r.get('/:id/download', requireAuth, downloadBook);
r.post('/:bookId/save',   requireAuth, saveBook);
r.delete('/:bookId/save', requireAuth, unsaveBook);
r.put('/:bookId/progress',requireAuth, updateProgress);

// Admin only
r.post('/',
  requireAdmin,
  multerBook.fields([{ name: 'book', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  uploadBook,
);
r.put('/:id',    requireAdmin, updateBook);
r.delete('/:id', requireAdmin, deleteBook);

export default r;
