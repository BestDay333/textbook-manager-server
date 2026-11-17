import { Router } from 'express';
import { register, login, me, changePassword, listUsers, setRole } from '../controllers/auth.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';

const r = Router();

r.post('/register',         register);
r.post('/login',            login);
r.get('/me',                requireAuth,  me);
r.put('/change-password',   requireAuth,  changePassword);
r.get('/users',             requireAdmin, listUsers);
r.put('/users/:userId/role',requireAdmin, setRole);

export default r;
