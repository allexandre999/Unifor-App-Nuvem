const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/users");
const multer = require("multer");
const fs = require("fs");

// Configuração do multer para upload de imagem
let storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, "./uploads");
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
    },
});

let upload = multer({
    storage: storage,
}).single("imagem");

// Middleware de autenticação
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        // Se o usuário estiver autenticado, continue
        req.session.message = {
            type: "success",
            message: "Login realizado com sucesso!",
        };
        return next();
    } else {
        // Se não estiver autenticado, redirecione para a página de login
        req.session.message = {
            type: "danger",
            message: "Autenticação Necessária!",
        };
        res.redirect('/login');
    }
};

// Rota para a página de login
router.get("/", (req, res) => {
    res.redirect("/login");
});

router.get("/login", (req, res) => {
    res.render("login", { title: "Login" });
});

// Rota para a página de cadastro inicial
router.get("/signup", (req, res) => {
    res.render("signup", { title: "Signup" });
});

// Rota para login
router.post("/login", async (req, res) => {
    try {
        const user = await User.findOne({ nome: req.body.nome });
        if (!user) {
            req.session.message = {
                type: "danger",
                message: "Usuário não existe!",
            };
            return res.redirect("/login"); 
        }

        // Comparando o password
        const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);
        if (isPasswordMatch) { 
            req.session.user = { id: user._id, nome: user.nome, email: user.email,  };
            res.redirect("/home");
        } else {
            req.session.message = {
                type: "danger",
                message: "Senha errada!",
            };
            return res.redirect("/login");
        }
    } catch (err) {
        req.session.message = {
            type: "danger",
            message: "Erro nos dados fornecidos!",
        };
        res.redirect("/login");
    }
});

// Rota para fazer logout
router.get("/logout", (req, res) => {
    // Limpar dados de sessão do usuário
    req.session.destroy(err => {
        if (err) {
            console.log(err);
            res.redirect('/home');
        } else {
        // Redirecionar para a página de login após o logout
        res.redirect('/login');
        }
    });
});

// Rota para adicionar um usuário ao banco de dados
router.post("/signup", upload, async (req, res) => {
    try {
        // Verifica se o usuário já existe no banco de dados pelo nome
        const existingUser = await User.findOne({ nome: req.body.nome });
        
        if (existingUser) {
            req.session.message = {
                type: "danger",
                message: "Usuário já existente, entre com um nome diferente!",
            };
            return res.redirect("/signup");
        }

        // Criptografando o password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

        // Se o usuário não existir, cria um novo
        const user = new User({
            nome: req.body.nome,
            password: hashedPassword,
            email: req.body.email,
            telefone: req.body.telefone,
            imagem: req.file.filename,
        });

        await user.save();
        req.session.message = {
            type: "success",
            message: "Usuário adicionado com sucesso!",
        };
        res.redirect("/login");
    } catch (err) {
        res.json({ message: err.message, type: "danger" });
    }
});

// Rota para adicionar um usuário ao banco de dados (admin)
router.post("/add", isAuthenticated, upload, async (req, res) => {
    try {
        // Verifica se o usuário já existe no banco de dados pelo nome
        const existingUser = await User.findOne({ nome: req.body.nome });
        
        if (existingUser) {
            req.session.message = {
                type: "danger",
                message: "Usuário já existente, entre com um nome diferente!",
            };
            return res.redirect("/add");
        }

        // Criptografando o password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

        // Se o usuário não existir, cria um novo
        const user = new User({
            nome: req.body.nome,
            password: hashedPassword,
            email: req.body.email,
            telefone: req.body.telefone,
            imagem: req.file.filename,
        });

        await user.save();
        req.session.message = {
            type: "success",
            message: "Usuário adicionado com sucesso!",
        };
        res.redirect("/home");
    } catch (err) {
        res.json({ message: err.message, type: "danger" });
    }
});

// Rota para obter todos os usuários
router.get("/home", isAuthenticated, async (req, res) => {
    try {
        const users = await User.find().exec();
        res.render("home", {
            title: "Home Page",
            users: users,
        });
    } catch (err) {
        res.json({ message: err.message });
    }
});

router.get("/add", isAuthenticated, (req, res) => {
    res.render("add_users", { title: "Adicionar Usuários" });
});

// Rota para editar um usuario no banco de dados
router.get("/edit/:id", isAuthenticated, async (req, res) => {
    let id = req.params.id;
    try {
        const user = await User.findById(id);
        if (user == null) {
            res.redirect("/home");
        } else {
            res.render("edit_users", {
                title: "Editar Usuário",
                user: user,
            });
        }
    } catch (err) {
        res.redirect("/home");
    }
});

// Rota para atualizar um usuário no banco de dados
router.post("/update/:id", isAuthenticated, upload, async (req, res) => {
    let id = req.params.id;
    let new_image = "";

    if (req.file) {
        new_image = req.file.filename;
        try {
            fs.unlinkSync("./uploads/" + req.body.old_image);
        } catch (err) {
            console.log(err);
        }
    } else {
        new_image = req.body.old_image;
    }

    // Criptografando o password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    try {
        await User.findByIdAndUpdate(id, {
            nome: req.body.nome,
            password: hashedPassword,
            email: req.body.email,
            telefone: req.body.telefone,
            imagem: new_image,
        });
        req.session.message = {
            type: "success",
            message: "Usuário atualizado com sucesso!",
        };
        res.redirect("/home");
    } catch (err) {
        res.json({ message: err.message, type: "danger" });
    }
});

// Rota para deletar usuário do banco de dados
router.get("/delete/:id", isAuthenticated, async (req, res) => {
    let id = req.params.id;
    
    try {
        const result = await User.findByIdAndDelete(id);
        
        if (result && result.image != "") {
            try {
                fs.unlinkSync("./uploads/" + result.imagem);
            } catch (err) {
                console.log(err);
            }
        }

        req.session.message = {
            type: "info",
            message: "Usuário deletado com sucesso!"
        };
        res.redirect("/home");
        
    } catch (err) {
        res.json({ message: err.message });
    }
});

module.exports = router;
