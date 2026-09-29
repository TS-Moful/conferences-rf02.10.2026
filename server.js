import express from "express";
const app = express();
const PORT = 3000;
app.set("view engine", "ejs");
app.set("views", "./views");

app.use(express.urlencoded({ extented: true }));

app.get("/", (req, res) => {
  res.send(`<a href="/about">О нас</a> <a href="/contact">Контакты</a>`);
});
app.get("/about", (req, res) => {
  res.render("about", {
    title: "О портале Конференции.РФ",
    description: "Мы — ведущая платформа для организации научных и образовательных мероприятий. Наша цель — объединить экспертов и участников для обмена передовым опытом.",
    errors: [],
  });
});
app.get("/contact", (req, res) => {
  res.render("contact", {
    title: "Контакты",
    errors: [],
  });
});

app.get("/help", (req, res) => {
  res.render("help", {
    title: "Помощь",
    errors: [],
  });
});

app.get("/rooms", (req, res) => {
  res.render("rooms", {
    title: "Список помещений",
    errors: [],
  });
});

app.get("/register", (req, res) => {
  res.render("register", {
    title: "Регистрация на портале",
    errors: [],
  });
});
app.post("/register", function (req, res) {
  console.log(`Город пользователя: ${req.body.city}`);
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

app.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}`);
});
