import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from './db.js';
import {User} from "./db.js";

import { Room } from "./db.js";
import { Request } from "./db.js";


const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;


/////////////////////////////MIDDLEWARES///////////////////////////
const users = db.prepare('SELECT * FROM users').all();
console.log('Все пользователи:')
console.log(users);

const rooms = db.prepare('SELECT * FROM rooms').all();
console.log('Все помещения:')
console.log(rooms);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

app.use(express.static(join(__dirname, "public")));

app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

app.use(session({
   secret: 'conf2027-secret',

   resave: false,
   saveUninitialized: false,
   cookie: {
    maxAge: 1000 * 60 * 60 * 2,
    httpOnly: true,
    sameSite: 'lax'
   }
}));

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});


const INACTIVITY_LIMIT = 20 * 60 * 1000;
app.use((req, res, next) => {
  if (req.session && req.session.userId) {
    const now = Date.now(); 

    if (req.session.lastActivity && (now - req.session.lastActivity > INACTIVITY_LIMIT)) {
      return req.session.destroy(() => {
        res.redirect('/login');
      });
    }
    req.session.lastActivity = now;
  }
  next();
});



const requireAuth = (req, res, next) =>
  req.session.userId ? next() : res.redirect('/login');

const requireAdmin = (req, res, next) =>
  req.session.login === 'Conf2027' ? next() : res.redirect('/login');

/////////////////////////REGULARS///////////////////////////////
const RULES = [
  { field: 'login',    test: v => /^[A-Za-z0-9]{6,}$/.test(v),             msg: 'Логин: латиница+цифры, минимум 6 символов' },
  { field: 'password', test: v => v && v.length >= 8,                      msg: 'Пароль: минимум 8 символов' },
  { field: 'fio',      test: v => /^[А-Яа-яЁё\s]+$/.test(v),               msg: 'ФИО: только кириллица и пробелы' },
  { field: 'phone',    test: v => /^8\(\d{3}\)\d{3}-\d{2}-\d{2}$/.test(v), msg: 'Телефон: формат 8(ХХХ)ХХХ-ХХ-ХХ' },
  { field: 'email',    test: v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),    msg: 'Email: некорректный формат' }
];

const validate = data => RULES
  .filter(({ field, test }) => !test((data[field] || '').trim()))
  .map(r => r.msg);

//////////////////ROUTES///////////////////////////////////////
app.get("/", (req, res) => {
  res.redirect("/rooms");
});


app.get("/register", (req, res) => {
  res.render("auth", {
    mode: 'register',
    form: {},
    errors: []
  });
});


app.post("/register", function (req, res) {
  const errors = validate(req.body);
  if (User.exists(req.body.login)) {
    errors.push('Логин уже занят');
  }
  if (errors.length) {
    return res.render('auth', {
      mode: 'register',
      form: req.body,
      errors
    });
  }

  User.create(req.body);
  req.session.flash = { 
    type: 'success', 
    text: 'Регистрация успешна. Войдите'}
  res.redirect("/login");
});

app.get("/create", requireAuth, (req, res) => {
  res.render("create_request", {
    title: "Создание заявки",
    rooms: Room.findAll(),
    errors: [],
  });
});

app.post('/create', requireAuth, async (req, res) => {
  try {
    // Теперь свойства req.body строго совпадают с атрибутами name="..." из вашей формы
    await Request.create({
      userId: req.session.userId,
      roomId: req.body.room_id,       // Было req.body.roomId -> стало room_id
      dateStart: req.body.date_start, // Было req.body.dateStart -> стало date_start
      payment: req.body.payment
    });

    res.redirect('/dashboard');
  } catch (error) {
    console.error("Ошибка при сохранении заявки:", error);
    res.status(500).send("Не удалось сохранить заявку. Проверьте правильность введенных данных.");
  }
});



app.post("/login", function (req, res) {
  const user = User.findByLogin((req.body.login || '').trim());

  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    req.session.userId = user.id;
    req.session.fio = user.fio;
    req.session.login = user.login;
    req.session.lastActivity = Date.now();

    return res.redirect(user.login === 'Conf2027' ? '/admin' : '/dashboard')
  }

  res.render('auth', {
    mode: 'login',
    error: 'Неверный логин или пароль',
    flash: null
  });
});

app.get("/login", (req, res) => {
  const flash = req.session.flash || null;
  delete req.session.flash;
   res.render('auth', {
    mode: 'login',
    error: null,
    flash
   });

  });


app.get("/dashboard", requireAuth, (req, res) => {
  const requests = Request.findByUser(req.session.userId);
  res.render('requests_list', {isAdmin: false, requests});
});


app.all('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});





app.get("/rooms", (req, res) => {
  const rooms = Room.findAll();
  res.render("rooms", { rooms });
});

app.get("/rooms/type/:type", (req, res) => {
  const rooms = Room.findAll().filter(r => r.type === req.params.type);
  res.render("rooms", { rooms });
});

app.get('/admin', requireAdmin, (req, res) => {
  const requests = Request.findAllDetailed();
  res.render("requests_list", { isAdmin: true, requests});
});

app.post('/admin', requireAdmin, (req, res) => {
  Request.updateStatus(req.body.id, req.body.status);
  res.redirect('/admin')
});



app.get("/request/:id", requireAuth, (req, res) => {
  const request = Request.findDetailed(req.params.id);

  if (!request) {
    return res.status(404).send("Заявка не найдена");
  }

  const isOwner = request.user_id === req.session.userId;
  const isAdmin = req.session.login === "Conf2027";

  if (!isOwner && !isAdmin) {
    return res.status(403).send("Доступ запрещён");
  }

  res.render("request_detail", {
    request,
    isOwner,
    isAdmin,
  });
});

app.post("/review/:id", requireAuth, (req, res) => {
  const request = Request.findDetailed(req.params.id);

  

  if (!request) {
    return res.status(404).send("Заявка не найдена");
  }

  if (request.user_id !== req.session.userId) {
    return res.status(403).send("Только владелец может оставить отзыв");
  }

  const review = (req.body.review || "").trim();

  Request.addReview(request.id, req.session.userId, review);

  res.redirect(`/request/${request.id}`);
});



///////////////////////////////////////////ROUTES END///////////////////////////////////
app.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}`);
});
