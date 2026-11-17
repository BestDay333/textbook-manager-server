import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes  from './routes/auth.routes';
import booksRoutes from './routes/books.routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static: serve uploaded covers (books require auth so handled via controller)
app.use('/uploads/covers', express.static(path.join(process.cwd(), 'uploads/covers')));

// Routes
app.use('/api/auth',  authRoutes);
app.use('/api/books', booksRoutes);

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Маршрут не найден' }));

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? 'Внутренняя ошибка сервера' });
});

const PORT = parseInt(process.env.PORT ?? '3000');
app.listen(PORT, () => console.log(`Server running on :${PORT}`));
