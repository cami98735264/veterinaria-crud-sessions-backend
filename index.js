const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const { DataTypes } = require("sequelize");
dotenv.config();
const { Sequelize } = require('sequelize');
const express = require("express");
const secretJWT = process.env["JWT_SECRET"];
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();

// Database setup
const sequelize = new Sequelize('veterinaria', 'root', '', {
    host: 'localhost',
    dialect: 'mysql'
  });

const Animales = require("./models/animales.js")(sequelize, DataTypes);
const Consultas = require("./models/consultas.js")(sequelize, DataTypes);
const Usuarios = require("./models/usuarios.js")(sequelize, DataTypes);
const TipoConsultas = require("./models/tipo_consultas.js")(sequelize, DataTypes);

Animales.hasMany(Consultas, {
    foreignKey: "tipo_animal",
});
Consultas.belongsTo(Animales, { foreignKey: "tipo_animal" });


Usuarios.hasMany(Consultas, {
    foreignKey: "id_usuario"
});

Consultas.belongsTo(Usuarios, {
    foreignKey: "id_usuario"
});

TipoConsultas.hasMany(Consultas, {
    foreignKey: "id_tipoconsulta"
});

Consultas.belongsTo(TipoConsultas, {
    foreignKey: "id_tipoconsulta"
});

// Test DB connection
(async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
      } catch (error) {
        console.error('Unable to connect to the database:', error);
      }
})()


// App middlewares
app.use(cors(
    {
        // set origin to a specific origin.
        origin: 'http://localhost:3001',
        
        // or, set origin to true to reflect the request origin
        //origin: true,
      
        credentials: true,
        optionsSuccessStatus: 200,
      }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));



const checkIfEmailExists = async (req, res, next) => {
    const email = req.body.email;
    if(!email) {
        res.status(422).json({
            message: "Se debe proporcionar un email válido",
            success: false
        })
        return;
    }
    const usuarioEncontrado = await Usuarios.findOne({
        where: {
            correo: email
        }
    })
    if(usuarioEncontrado) {
        req.usuarioEncontrado = usuarioEncontrado
    }
    next();
};

const isAuthenticated = (req, res, next) => {
    console.log(req.cookies)
    const reqToken = req.cookies.authorization || req.headers.authorization;
    console.log(reqToken)
    if(!reqToken) {
        res.status(401).json({message: "No autorizado, credenciales no encontrados", success: false })
        return;
    }
    jwt.verify(reqToken, secretJWT, (err, decripted) => {
        if(err) {
            res.status(401).json({message: "No autorizado, el credencial dado es invalido", success: false })
            return;
        }
        req.headers.authorization = "Bearer " + reqToken;
        req.dataUsuario = decripted;
        console.log(decripted)
        next();
    })
};

app.get("/api/auth/check", isAuthenticated, (req, res) => {
    res.status(200).json({
        message: "El usuario está logeado correctamente",
        success: true,
        userData: req.dataUsuario
    })
})

app.post("/api/auth/logout", (req, res) => {
    try {
        res.clearCookie("authorization");
        res.status(200).json({message: "El usuario se ha deslogeado de manera correcta", success: true });
    } catch(err) {
        res.status(500).json({
            message: "Fallo al eliminar la cookie, error interno del servidor",
            success: false
        })
    }
})

app.post("/api/auth/register", checkIfEmailExists, async (req, res) => {
    const { email, contraseña, telefono, direccion } = req.body;
    const encriptedPassword = contraseña ? bcrypt.hashSync(contraseña, 10) : null;
    if(req.usuarioEncontrado) {
        res.status(409).json({
            message: "Ese usuario ya existe en la base de datos, logeate o usa otro email",
            success: false
        })
        return;
    }
    if(!contraseña) {
        res.status(422).json({
            message: "Se requiere una contraseña para continuar el registro",
            success: false
        })
        return;
    }
    try {
        const usuarioCreado = await Usuarios.create({
            contraseña: encriptedPassword,
            correo: email,
            telefono: telefono,
            direccion: direccion,
            isAdmin: false
        });
        const payload = {
            id: usuarioCreado.id,
            correo: usuarioCreado.correo,
            telefono: usuarioCreado.telefono,
            direccion: usuarioCreado.direccion
        };
        console.log("Usuario creado!!!")
        const token = jwt.sign(payload, secretJWT, { expiresIn: '12h'});
        console.log("El token es: ", token)
        res.cookie("authorization", token, {
            httpOnly: true,
            maxAge: 60 * 60 * 12000
        });
        res.status(200).json({
            message: "¡Usuario creado correctamente!",
            data: payload
        });
    } catch(err) {
        console.log(err)
        res.status(500).json({
            message: "Ha ocurrido un error interno en el servidor y no ha sido posible crear el usuario",
            success: false
        })
    }

})

app.post("/api/auth/login", checkIfEmailExists, async (req, res) => {
    console.log("Headers:", req.headers);
    const { contraseña } = req.body;
    const usuarioEncontrado = req.usuarioEncontrado
    if(!usuarioEncontrado) {
        res.status(404).json({
            message: "Ese usuario no se encuentra en la base de datos",
            success: false
        })
        return;
    }
    if(!contraseña) {
        res.status(422).json({
            message: "No se proporcionaron los credenciales necesarios",
            success: false
        })
        return;
    }
    try {
        const hashedPassword = usuarioEncontrado.contraseña
        if(!bcrypt.compareSync(contraseña, hashedPassword)) {
            res.status(401).send({
                message: "La contraseña proporcionada no es correcta",
                success: false
            });
            return;
        }
        const payload = { id: usuarioEncontrado.id, correo: usuarioEncontrado.correo, telefono: usuarioEncontrado.telefono, direccion: usuarioEncontrado.direccion };
        const token = jwt.sign(payload, secretJWT, {
            expiresIn: '12h'
        });
        res.cookie("authorization", token, {
            httpOnly: true,
            maxAge: 60 * 60 * 12000
        });
        res.status(200).send({
            message: "El usuario ha sido logeado correctamente",
            data: usuarioEncontrado
        })
    } catch(err) {
        console.log(err)
        res.status(500).json({
            message: "Ha ocurrido un error interno en el servidor y no se ha podido logear al usuario",
            success: false
        })
    }
})
app.listen(3000, () => {
    console.log("App listening at port", 3000)
})