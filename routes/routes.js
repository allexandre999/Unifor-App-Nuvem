
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// Configuração do S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

// Configuração do multer para usar o S3
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        acl: 'public-read',
        key: function (req, file, cb) {
            cb(null, `uploads/${Date.now()}_${file.originalname}`);
        }
    })
}).single("imagem");

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
            imagem: req.file.location, // URL do arquivo no S3
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

// Rota para atualizar um usuário no banco de dados
router.post("/update/:id", upload, async (req, res) => {
    let id = req.params.id;
    let new_image = req.body.old_image;

    if (req.file) {
        new_image = req.file.location; // URL do arquivo no S3
        // Se estiver usando o S3, não é necessário excluir o arquivo localmente
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
        
        if (result && result.imagem) {
            // Se estiver usando o S3, você deve também excluir o arquivo do S3
            const imageKey = result.imagem.split('/').pop();
            s3.deleteObject({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: `uploads/${imageKey}`
            }, (err, data) => {
                if (err) console.log(err);
            });
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
