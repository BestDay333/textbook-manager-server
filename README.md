# 📚 TextbookManager — Backend API

REST API на Node.js/Express + PostgreSQL для приложения управления учебниками.

## Стек

| Компонент | Технология |
|-----------|-----------|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| БД | PostgreSQL 15+ |
| Auth | JWT (bcrypt + jsonwebtoken) |
| Файлы | Multer (локальный диск) |
| Язык | TypeScript |

## Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Создать .env из примера
cp .env.example .env
# Заполнить DATABASE_URL и JWT_SECRET

# 3. Создать таблицы
npm run migrate

# 4. Запустить в dev-режиме
npm run dev
```

## Деплой на VPS (Ubuntu)

```bash
# Установить Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql
sudo -u postgres psql -c "CREATE DATABASE textbook_manager;"
sudo -u postgres psql -c "CREATE USER tbm_user WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "GRANT ALL ON DATABASE textbook_manager TO tbm_user;"

# PM2 для автозапуска
npm install -g pm2
npm run build
pm2 start dist/index.js --name textbook-api
pm2 startup && pm2 save

# Nginx reverse proxy
# proxy_pass http://localhost:3000;
```

## API Reference

### Auth

| Метод | Путь | Доступ | Описание |
|-------|------|--------|----------|
| POST | `/api/auth/register` | Public | Регистрация |
| POST | `/api/auth/login` | Public | Вход |
| GET | `/api/auth/me` | Auth | Текущий пользователь |
| PUT | `/api/auth/change-password` | Auth | Смена пароля |
| GET | `/api/auth/users` | Admin | Список пользователей |
| PUT | `/api/auth/users/:id/role` | Admin | Изменить роль |

### Books

| Метод | Путь | Доступ | Описание |
|-------|------|--------|----------|
| GET | `/api/books` | Public | Список/поиск книг |
| GET | `/api/books/:id` | Public | Одна книга |
| POST | `/api/books` | Admin | Загрузить книгу (multipart) |
| PUT | `/api/books/:id` | Admin | Обновить метаданные |
| DELETE | `/api/books/:id` | Admin | Удалить |
| GET | `/api/books/:id/download` | Auth | Скачать файл |
| GET | `/api/books/my/library` | Auth | Моя библиотека |
| POST | `/api/books/:id/save` | Auth | Добавить в библиотеку |
| DELETE | `/api/books/:id/save` | Auth | Убрать из библиотеки |
| PUT | `/api/books/:id/progress` | Auth | Сохранить прогресс чтения |

### Query параметры GET /api/books

| Параметр | Описание |
|----------|----------|
| `q` | Поиск по названию и автору |
| `subject` | Фильтр по предмету |
| `grade` | Фильтр по классу (1–11) |
| `format` | pdf / epub / fb2 |
| `page` | Страница (default 1) |
| `limit` | Кол-во (default 20) |

### Схема БД

```
users        — id, email, password, name, role(user/admin), avatar_url
books        — id, title, author, subject, grade, year, format, file_path,
               cover_path, file_size, downloads, tags, description, uploaded_by
user_books   — user_id, book_id, current_page, total_pages, last_opened
```
