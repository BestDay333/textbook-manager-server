import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';

function fileUrl(req: Request, sub: string, file: string) {
  return `${req.protocol}://${req.get('host')}/uploads/${sub}/${file}`;
}

// ---- LIST / SEARCH ----
export async function listBooks(req: Request, res: Response) {
  const { q, subject, grade, format, page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (q) {
    conditions.push(`(to_tsvector('russian', title) @@ plainto_tsquery('russian', $${i}) OR
                      LOWER(author) LIKE LOWER($${i + 1}))`);
    params.push(q, `%${q}%`); i += 2;
  }
  if (subject) { conditions.push(`subject = $${i++}`); params.push(subject); }
  if (grade)   { conditions.push(`grade = $${i++}`);   params.push(parseInt(grade)); }
  if (format)  { conditions.push(`format = $${i++}`);  params.push(format); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT id,title,author,subject,grade,year,format,cover_path,file_size,
            downloads,tags,description,created_at
     FROM books ${where}
     ORDER BY created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, parseInt(limit), offset],
  );
  const { rows: cnt } = await pool.query(`SELECT COUNT(*) FROM books ${where}`, params);
  res.json({ books: rows, total: parseInt(cnt[0].count), page: parseInt(page), limit: parseInt(limit) });
}

// ---- GET ONE ----
export async function getBook(req: Request, res: Response) {
  const { rows } = await pool.query(
    `SELECT b.*,
            u.name AS uploader_name
     FROM books b LEFT JOIN users u ON u.id=b.uploaded_by
     WHERE b.id=$1`,
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: 'Книга не найдена' });
  res.json(rows[0]);
}

// ---- UPLOAD (admin) ----
export async function uploadBook(req: AuthRequest, res: Response) {
  const bookFile = (req as any).files?.book?.[0];
  const coverFile = (req as any).files?.cover?.[0];
  if (!bookFile) return res.status(400).json({ error: 'Файл книги обязателен' });

  const { title, author, subject, grade, year, description, tags } = req.body;
  if (!title || !author || !subject)
    return res.status(400).json({ error: 'title, author, subject обязательны' });

  const ext = path.extname(bookFile.originalname).slice(1).toLowerCase();
  const format = ext === 'epub' ? 'epub' : ext === 'fb2' ? 'fb2' : 'pdf';

  const { rows } = await pool.query(
    `INSERT INTO books(id,title,author,subject,grade,year,format,
                       file_path,cover_path,file_size,description,tags,uploaded_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      uuid(), title, author, subject,
      grade ? parseInt(grade) : null,
      year  ? parseInt(year)  : null,
      format,
      bookFile.filename,
      coverFile?.filename ?? null,
      bookFile.size,
      description ?? null,
      tags ? tags.split(',').map((t: string) => t.trim()) : [],
      req.user!.userId,
    ],
  );
  res.status(201).json(rows[0]);
}

// ---- UPDATE (admin) ----
export async function updateBook(req: AuthRequest, res: Response) {
  const { title, author, subject, grade, year, description, tags } = req.body;
  const { rows } = await pool.query(
    `UPDATE books SET
       title=$1, author=$2, subject=$3, grade=$4, year=$5,
       description=$6, tags=$7, updated_at=NOW()
     WHERE id=$8 RETURNING *`,
    [
      title, author, subject,
      grade ? parseInt(grade) : null,
      year  ? parseInt(year)  : null,
      description ?? null,
      tags ? tags.split(',').map((t: string) => t.trim()) : [],
      req.params.id,
    ],
  );
  if (!rows[0]) return res.status(404).json({ error: 'Книга не найдена' });
  res.json(rows[0]);
}

// ---- DELETE (admin) ----
export async function deleteBook(req: Request, res: Response) {
  const { rows } = await pool.query('DELETE FROM books WHERE id=$1 RETURNING file_path,cover_path', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Книга не найдена' });
  for (const field of ['file_path', 'cover_path'] as const) {
    if (rows[0][field]) {
      const p = path.join(process.cwd(), 'uploads',
        field === 'file_path' ? 'books' : 'covers', rows[0][field]);
      try { fs.unlinkSync(p); } catch {}
    }
  }
  res.json({ message: 'Удалено' });
}

// ---- DOWNLOAD ----
export async function downloadBook(req: AuthRequest, res: Response) {
  const { rows } = await pool.query('SELECT * FROM books WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Книга не найдена' });
  const book = rows[0];
  const filePath = path.join(process.cwd(), 'uploads', 'books', book.file_path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл не найден на сервере' });
  await pool.query('UPDATE books SET downloads=downloads+1 WHERE id=$1', [book.id]);
  res.download(filePath, `${book.title}.${book.format}`);
}

// ---- USER LIBRARY ----
export async function saveBook(req: AuthRequest, res: Response) {
  const { bookId } = req.params;
  await pool.query(
    `INSERT INTO user_books(user_id,book_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
    [req.user!.userId, bookId],
  );
  res.json({ message: 'Добавлено в библиотеку' });
}

export async function unsaveBook(req: AuthRequest, res: Response) {
  await pool.query('DELETE FROM user_books WHERE user_id=$1 AND book_id=$2',
    [req.user!.userId, req.params.bookId]);
  res.json({ message: 'Удалено из библиотеки' });
}

export async function myBooks(req: AuthRequest, res: Response) {
  const { rows } = await pool.query(
    `SELECT b.id,b.title,b.author,b.subject,b.grade,b.format,b.cover_path,b.file_size,
            ub.current_page,ub.total_pages,ub.last_opened,ub.saved_at
     FROM user_books ub JOIN books b ON b.id=ub.book_id
     WHERE ub.user_id=$1 ORDER BY ub.last_opened DESC NULLS LAST`,
    [req.user!.userId],
  );
  res.json(rows);
}

export async function updateProgress(req: AuthRequest, res: Response) {
  const { bookId } = req.params;
  const { currentPage, totalPages } = req.body;
  await pool.query(
    `UPDATE user_books SET current_page=$1,total_pages=$2,last_opened=NOW()
     WHERE user_id=$3 AND book_id=$4`,
    [currentPage, totalPages, req.user!.userId, bookId],
  );
  res.json({ message: 'Прогресс сохранён' });
}
