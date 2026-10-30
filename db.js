import Database from "better-sqlite3";
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import { isDeepStrictEqual } from "util";
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'conf.db'));



db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fio TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))    
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    capacity INTEGER NOT NULL
    );
`);

db.exec(`CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    date_start TEXT NOT NULL,
    payment TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Новая',
    review TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT

    );
`);


db.exec(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
    );
`);



const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
const hash = (pwd) => bcrypt.hashSync(pwd, 10);
if (count === 0) {
    const stmt = db.prepare(`
        INSERT INTO users (login, password, fio, phone, email)
        VALUES (?, ?, ?, ?, ?)
        `);
    stmt.run('ivan', hash('demo'), 'Иванов Иван', '8(999)123-45-67', 'ivan@example.com');
    stmt.run('petr', hash('demo'), 'Петров Пётр', '8(999)123-33-33', 'petr@example.com');
    stmt.run('anna', hash('demo'), 'Сидорова Анна', '8(950)432-45-67', 'anna@example.com');
    stmt.run('Conf2027', hash('Demo77') ,'Администратор', '8(999)000-00-00', 'admin@conf.ru');
    console.log('Тестовые пользователи добавлены')
    
}

const count2 = db.prepare('SELECT COUNT(*) AS c FROM rooms').get().c;

if (count2 === 0) {
    const stmt = db.prepare(`
        INSERT INTO rooms (name, type, capacity)
        VALUES (?, ?, ?)
        `);
    stmt.run('Конференц-зал "Горизонт"', 'конференц-зал', 20);
    stmt.run('Переговорная №1', 'переговорная', 6);
    stmt.run('Опенспейс разработки', 'опенспейс', 12);
    console.log('Тестовые комнаты добавлены');
    
}


const requestsCount = db.prepare("SELECT COUNT(*) AS c FROM requests").get().c;

if (requestsCount === 0) {
    const stmtRequest = db.prepare(`
        INSERT INTO requests (user_id, room_id, date_start, payment)
        VALUES(?, ?, ?, ?)
        `);
    stmtRequest.run(1, 1, "2027-03-15", "При очном посещении");
    stmtRequest.run(1, 3, "2027-03-20", "Перевод по СБП");    
    stmtRequest.run(2, 2, "2027-04-10", "При очном посещении");       
    console.log("Тестовые заявки добавлены")    
}

const reviewsCount = db.prepare("SELECT COUNT(*) AS c FROM reviews").get().c;

if (reviewsCount === 0) {
    const stmtReview = db.prepare(`
        INSERT INTO reviews (request_id, rating, text)
        VALUES (?, ?, ?)
        `);
    stmtReview.run(1, 5, 'Отличный зал, всё понравилось, проектор работал исправно.');
    stmtReview.run(2, 4, 'Хороший опенспейс, но было немного шумно.');
    stmtReview.run(2, 5, 'Уютная переговорная, идеально для встречи с клиентом.');
    console.log("Тестовые отзывы добавлены");
}

const joinRowsClean = db.prepare(`
    SELECT 
        requests.id,
        requests.date_start,
        requests.payment,
        requests.status,
        users.fio,
        rooms.name AS room_name,
        JSON_GROUP_ARRAY(
            JSON_OBJECT(
                'rating', reviews.rating,
                'text', reviews.text,
                'date', reviews.created_at
            )
        ) AS reviews_list
    FROM requests
    JOIN users ON users.id = requests.user_id
    JOIN rooms ON rooms.id = requests.room_id
    LEFT JOIN reviews ON reviews.request_id = requests.id
    GROUP BY requests.id
`).all();

console.log('Оптимизированный вывод с группировкой отзывов:');
console.log(joinRowsClean);

class UserModel {
  constructor() {
    this.table = "users";
  }

  findById(id) {
    return db.prepare(`SELECT * FROM ${this.table} WHERE id = ?`).get(id);
  }

  findByLogin(login) {
    return db.prepare(`SELECT * FROM ${this.table} WHERE login = ?`).get(login);
  }

  findAll() {
    return db.prepare(`SELECT * FROM ${this.table}`).all();
  }

  count() {
    const result = db.prepare(`SELECT COUNT(*) as count FROM ${this.table}`).get();
    return result ? result.count : 0; 
  }

  exists(login) {
    const user = db.prepare(`SELECT 1 FROM ${this.table} WHERE login = ?`).get(login);
    return !!user; 
  }
  create({ login, password, fio, phone, email}) {
    const hash =bcrypt.hashSync(password, 10);
    const r = db.prepare(`
        INSERT INTO ${this.table} (login, password, fio, phone, email)
        VALUES (?, ?, ?, ?, ?)
        `).run(login, hash, fio, phone, email);
        return this.findById(r.lastInsertRowid);
  }
}

class RoomModel {
    constructor() {
        this.table = "rooms"
    }

     findAll() {
    return db.prepare(`SELECT * FROM ${this.table}`).all();
  }

  findById(id) {
    return db.prepare(`SELECT * FROM ${this.table} WHERE id = ?`).get(id);
  }

   findByType(type) {
    return db.prepare(`SELECT * FROM ${this.table} WHERE type = ?`).get(type);
  }

  count() {
    const result = db.prepare(`SELECT COUNT(*) as count FROM ${this.table}`).get();
    return result ? result.count : 0; 
  }


}

class RequestModel {
    constructor() {
        this.table = "requests"
    }
     findById(id) {
    return db.prepare(`SELECT * FROM ${this.table} WHERE id = ?`).get(id);
  }
      findByUser(userId) {
        const Userid = `
            SELECT r.*, rm.name AS room_name, rm.type AS room_type
            FROM ${this.table} r
            JOIN rooms rm ON r.room_id = rm.id
            WHERE r.user_id = ?
        `;
        return db.prepare(Userid).all(userId);
    }
    findAllDetailed() {
        const detailed = `
            SELECT r.*, u.fio AS user_fio, u.login AS user_login, rm.name AS room_name, rm.type AS room_type
            FROM ${this.table} r
            JOIN users u ON r.user_id = u.id
            JOIN rooms rm ON r.room_id = rm.id
        `;
        return db.prepare(detailed).all();
    }
    count() {
        const result = db.prepare(`SELECT COUNT(*) as count FROM ${this.table}`).get();
        return result.count;
    }
    updateStatus(id, status) {
        return db.prepare(`UPDATE ${this.table} SET status = ? WHERE id = ?`).run(status, id);
    }

    create({ userId, roomId, dateStart, payment}) {
        const r = db.prepare(`
            INSERT INTO ${this.table} (user_id, room_id, date_start, payment)
            VALUES (?, ?, ?, ?)
            `).run(userId, roomId, dateStart, payment);
        return this.findById(r.lastInsertRowid);
    }
    findDetailed(id) {
  return db.prepare(`
    SELECT r.*,
           u.fio AS user_fio,
           u.login AS user_login,
           u.email AS user_email,
           u.phone AS user_phone,
           rm.name AS room_name,
           rm.type AS room_type,
           rm.capacity AS room_capacity
    FROM ${this.table} r
    JOIN users u ON u.id = r.user_id
    JOIN rooms rm ON rm.id = r.room_id
    WHERE r.id = ?
  `).get(id);
}
addReview(id, userId, review) {
  if (!review || !review.trim()) return false;
  const r = db.prepare(`
    UPDATE ${this.table}
    SET review = ?
    WHERE id = ? AND user_id = ? AND status = 'Завершено'
  `).run(review.trim(), id, userId);
  return r.changes > 0;
}


}


export const User = new UserModel();
export const Room = new RoomModel();
export const Request = new RequestModel();

 

export default db;

