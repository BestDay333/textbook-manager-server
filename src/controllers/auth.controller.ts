import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import pool from '../config/db';
import { signToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';

export async function register(req: Request, res: Response) {
  const { email, password, name } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ error: 'email, password и name обязательны' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Пароль минимум 6 символов' });

  const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
  if (exists.rowCount) return res.status(409).json({ error: 'Email уже зарегистрирован' });

  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    'INSERT INTO users(id,email,password,name) VALUES($1,$2,$3,$4) RETURNING id,email,name,role',
    [uuid(), email, hash, name],
  );
  const user = rows[0];
  res.status(201).json({ token: signToken({ userId: user.id, role: user.role }), user });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Неверный email или пароль' });

  const { password: _, ...safe } = user;
  res.json({ token: signToken({ userId: user.id, role: user.role }), user: safe });
}

export async function me(req: AuthRequest, res: Response) {
  const { rows } = await pool.query(
    'SELECT id,email,name,role,avatar_url,created_at FROM users WHERE id=$1',
    [req.user!.userId],
  );
  if (!rows[0]) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json(rows[0]);
}

export async function changePassword(req: AuthRequest, res: Response) {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'Новый пароль минимум 6 символов' });

  const { rows } = await pool.query('SELECT password FROM users WHERE id=$1', [req.user!.userId]);
  if (!rows[0] || !(await bcrypt.compare(oldPassword, rows[0].password)))
    return res.status(401).json({ error: 'Неверный текущий пароль' });

  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password=$1,updated_at=NOW() WHERE id=$2', [hash, req.user!.userId]);
  res.json({ message: 'Пароль изменён' });
}

// Admin: list all users
export async function listUsers(_req: Request, res: Response) {
  const { rows } = await pool.query(
    'SELECT id,email,name,role,created_at FROM users ORDER BY created_at DESC',
  );
  res.json(rows);
}

export async function setRole(req: Request, res: Response) {
  const { userId } = req.params;
  const { role } = req.body;
  if (!['user', 'admin'].includes(role))
    return res.status(400).json({ error: 'role должна быть user или admin' });
  const { rows } = await pool.query(
    'UPDATE users SET role=$1,updated_at=NOW() WHERE id=$2 RETURNING id,email,name,role',
    [role, userId],
  );
  if (!rows[0]) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json(rows[0]);
}
