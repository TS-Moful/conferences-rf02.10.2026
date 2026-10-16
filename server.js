import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from './db.js';
import {User} from "./db.js";
import { Room } from "./db.js";
import { Request } from "./db.js";
import { text } from 'stream/consumers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;


////USERS
console.log("Пользователь с id 1", User.findById(1));
console.log("Пользователь с с логином ivan", User.findByLogin("ivan"));
console.log("Все Пользователи", User.findAll());
console.log("Всего пользователей", User.count());
console.log("Есть ли пользователь ivan", User.exists("ivan"));
/////////////////////////



///////////ROOMS
console.log("Все комнаты:");
console.log(Room.findAll());

console.log("Комната с id=1:");
console.log(Room.findById(1));

console.log("Все аудитории:");
console.log(Room.findByType("конференц-зал"));

console.log("Всего комнат:");
console.log(Room.count());
///////////////////




////////REQUESTS
console.log("Заявка с id=1:");
console.log(Request.findById(1));

console.log("Заявки пользователя id=1:");
console.log(Request.findByUser(1));

console.log("Все заявки (JOIN):");
console.log(Request.findAllDetailed());

console.log("Всего заявок:");
console.log(Request.count());
///////////////////////////////////////




const newRequest = Request.create({
  userId: 1,
  roomId: 2,
  dateStart: "2027-04-10",
  payment: "СБП"
})
console.log("Созданная заявка")
console.log(newRequest)


const users = db.prepare('SELECT * FROM users').all();
console.log('Все пользователи:')
console.log(users);

const rooms = db.prepare('SELECT * FROM rooms').all();
console.log('Все помещения:')
console.log(rooms);


app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

app.use(express.static(join(__dirname, "public")));

app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));





//////////////////ROUTES///////////////////////////////////////
app.get("/", (req, res) => {
  res.send(`<a href="/about">О нас</a> <a href="/contact">Контакты</a>`);
});



app.get("/register", (req, res) => {
  res.render("register", {
    title: "Регистрация на портале",
    errors: [],
  });
});

app.get("/create", (req, res) => {
  
  res.render("create_request", {
    title: "Создание заявку",
    rooms,
    errors: [],
  });
});

app.post("/register", function (req, res) {
  const errors = validate(req.body);

  if (User.exists(req.body.login)) {
    errors.push('Логин уже занят');
  }
  if (errors.lenght) {
    return res.render('auht', {mode : 'register', form : req.body, errors})
  }

  User.create(req.body);
  req.session.flash = { type: 'success', text: 'Регистрация успешна. Войдите'}
  res.redirect("/login");
});

app.post("/login", function (req, res) {
  res.redirect("/dashboard");
});

app.get("/login", (req, res) => {
  res.render("login", {
    title: "Вход в систему",
    errors: [],
  });
});

app.get("/dashboard", (req, res) => {
  res.render("dashboard", {
    title: "Личный Кабинет",
    errors: [],
    requests: [
      { room_name: "Аудитория 1", status: "Новая" },
      { room_name: "Аудитория 2", status: "Новая" },
    ],
  });
});
///////////////////////////////////////////ROUTES END///////////////////////////////////
app.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}`);
});
