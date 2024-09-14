// Importações de bibliotecas e módulos necessários
require('dotenv').config();
const express = require('express');
const path = require("path");
const mongoose = require('mongoose');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 4000;

// Conexão com o banco de dados
mongoose.connect(process.env.DB_URI);
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log("Conectado ao banco de dados!"));

// Middlewares para processar solicitações HTTP antes de serem manipuladas pelas rotas
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(
    session({
        secret: "minha chave secreta",
        saveUninitialized: true,
        resave: false,
    })
);

app.use((req, res, next) => {
    res.locals.message = req.session.message;
    delete req.session.message;
    res.set('Cache-Control', 'no-store');
    next();
});

app.use(express.static("uploads"));
app.use(express.static("public"));

// Configuração do mecanismo de modelo para renderizar páginas da web com EJS
app.set("view engine", "ejs");

// Prefixo de rota para as rotas do aplicativo
app.use("", require("./routes/routes"));

// Inicialização do servidor e escuta de conexões na porta especificada
app.listen(PORT, () => {
    console.log(`servidor iniciado em http://localhost:${PORT}`);
});