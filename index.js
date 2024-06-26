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

// Database setup (Inicializar una nueva instancia de la base de datos con el oem sequelize)
const sequelize = new Sequelize('veterinaria', 'root', '', {
    host: 'localhost',
    dialect: 'mysql'
  });


// Inicializar los modelos de cada una de las tablas

const Animales = require("./models/animales.js")(sequelize, DataTypes);
const Consultas = require("./models/consultas.js")(sequelize, DataTypes);
const Usuarios = require("./models/usuarios.js")(sequelize, DataTypes);
const TipoConsultas = require("./models/tipo_consultas.js")(sequelize, DataTypes);


// Establecer las relaciones con las tablas preseleccionadas

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
})();

// App middlewares (Establecer el origen de las peticiones para lo cual guardar cookies e información)
app.use(cors(
    {
        // set origin to a specific origin.
        // 192.168.1.7
        // 127.0.0.1 
        origin: ['https://cami98735264.github.io', 'http://localhost:3001', 'http://192.168.1.7:4000'],

        methods: ["POST", "GET"],
        // or, set origin to true to reflect the request origin
        //origin: true,
      
        credentials: true,
        optionsSuccessStatus: 200 
      }));
app.use(cookieParser()); // Establecer el middleware de cookieParser() para obtener los métodos de administración de cookies en el parametro res de cada petición
app.use(express.json()); // Capacidad para express de poder parsear (leer) el body de cada petición
app.use(express.urlencoded({ extended: false }));


// Middleware que se encargará de revisar si el email proporcionado en la request existe y responderá acorde a ello

const checkIfEmailExists = async (req, res, next) => {
    const email = req.body.email;


    // Si no se proporciona email, lo cual es fundamental para este middleware, detener la ejecución del código
    if(!email) {
        res.status(422).json({
            message: "Se debe proporcionar un email válido",
            success: false
        })
        return;
    };


    // Verificar si el usuario con el email proporcionado existe dentro de la base de datos (Bug: findOne no funciona dentro de un try catch)
    const usuarioEncontrado = await Usuarios.findOne({
        where: {
            correo: email
        }
    });


    // Si este usuario existe dentro de la base de datos, guardar la información del mismo para usarle en el siguiente flujo de código
    if(usuarioEncontrado) {
        req.usuarioEncontrado = usuarioEncontrado
    };
    next();
};


// Middleware global que se usará mayormente en peticiones principales de la API para permitir o negar el acceso y uso a ellas

const isAuthenticated = (req, res, next) => {
    console.log(req.cookies);

    // Conseguir la reqToken a través de las cookies almacenadas o los headers de autenticación
    const reqToken = req.cookies.authorization || req.headers.authorization;
    console.log(reqToken);


    // Si no hay token presente se asume que el usuario no está autenticado y por lo tanto no tiene autorización para utilizar la request destinada
    if(!reqToken) {
        res.status(401).json({message: "No autorizado, credenciales no encontrados", success: false })
        return;
    };


    // Verificar si el token de usuario proporcionado es valido, si es así, obtener el valor desencriptado y establecer su payload dentro de req para usarlo después
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

// Ruta que se encargará de revisar si el usuario está autenticado (cookie establecida y token validado correctamente)

app.get("/api/auth/check", isAuthenticated, (req, res) => {


    // El middleware isAuthenticated se encargará de continuar si no hay ningún error y se verifica que el usuario está autenticado, llegando hacia esta parte del código
    res.status(200).json({
        message: "El usuario está logeado correctamente",
        success: true,
        userData: req.dataUsuario
    })
});



// Ruta que se encargará de cerrar la sesión del usuario al eliminar la cookie pre-establecida

app.post("/api/auth/logout", (req, res) => {
    try {

        // Eliminar nuestra cookie de autenticación, que, por consecuente cerraría la sesión dinámica de nuestro usuario
        res.clearCookie("authorization", {
            // Any way to make this work in non-secure sites? (localhost) R/ Yes, you can set the sameSite attribute to "none" and secure to true. That doesnt work when origin is not secure. (http://192.168.1.7:3000/api/auth/) R/ You can't set the sameSite attribute to none if the origin is not secure. You can set it to "lax" or "strict" instead. (https://stackoverflow.com/questions/62611823/express-session-cookie-not-being-set-in-browser) / Then what do you recommend me to set in case I want every
            sameSite: "strict",
            secure: false,
            httpOnly: true
        });
        res.status(200).json({message: "El usuario se ha deslogeado de manera correcta", success: true });
    } catch(err) {
        res.status(500).json({
            message: "Fallo al eliminar la cookie, error interno del servidor",
            success: false
        })
    }
});





// Ruta que se encargará de registrar al usuario en la base de datos, primero validando que el usuario con ese email no exista en la base de datos

app.post("/api/auth/register", checkIfEmailExists, async (req, res) => {
    const { email, contraseña, telefono, direccion } = req.body; // Obtener los datos necesarios para el registro de nuestro usuario
    const encriptedPassword = contraseña ? bcrypt.hashSync(contraseña, 10) : null;


    // Verificar si existe un usuario encontrado a partir del email proporcionado en el body (cuerpo) de la petición, en este caso, si ya existe, no podríamos continuar con el registro al haber un usuario duplicado
    if(req.usuarioEncontrado) {
        res.status(409).json({
            message: "Ese usuario ya existe en la base de datos, logeate o usa otro email",
            success: false
        })
        return;
    }

    // Verificar si el valor contraseña se encuentra presente en el body de la petición
    if(!contraseña) {
        res.status(422).json({
            message: "Se requiere una contraseña para continuar el registro",
            success: false
        })
        return;
    }
    try {

        // Utilizar promesas para organizar de una mejor forma nuestro objeto de usuario creado
        const usuarioCreado = await Usuarios.create({
            contraseña: encriptedPassword,
            correo: email,
            telefono: telefono,
            direccion: direccion,
            isAdmin: false
        });

        // Establecer el payload a raíz de la información obtenida del usuario previamente creado, si el método falla (creación de usuario) se disparará el objeto catch de nuestro bloque
        const payload = {
            id: usuarioCreado.id,
            correo: usuarioCreado.correo,
            telefono: usuarioCreado.telefono,
            direccion: usuarioCreado.direccion
        };


        // Firmar el token con la información necesaria, una vez creado el usuario en la base de datos, con una expiración de 12 horas
        const token = jwt.sign(payload, secretJWT, { expiresIn: '12h'});
        console.log("El token es: ", token);


        // Crear la cookie conteniendo nuestro token de autorización para uso posterior en acciones autenticadas
        // Can I use sameSite Strict and secure falswe
        res.cookie("authorization", token, {
            sameSite: "strict",
            secure: false,
            httpOnly: true,
            maxAge: 60 * 60 * 12000
        });


        // Verificación correcta de creación de usuario
        res.status(200).json({
            message: "¡Usuario creado correctamente!",
            data: payload
        });
    } catch(err) {

        // Raise an exception (disparar una excepción en caso de que la creación de nuestro usuario nos haya dado algún tipo de error)
        console.log(err)
        res.status(500).json({
            message: "Ha ocurrido un error interno en el servidor y no ha sido posible crear el usuario",
            success: false
        })
    }

});





// Método principal de autenticación para logear al usuario

app.post("/api/auth/login", checkIfEmailExists, async (req, res) => {
    console.log("Headers:", req.headers);
    const { contraseña } = req.body;
    const usuarioEncontrado = req.usuarioEncontrado;

    // Verificar si el usuario proporcionado con los datos son correctos y coinciden con algún email relacionado a un usuario de la base de datos
    if(!usuarioEncontrado) {
        res.status(404).json({
            message: "Ese usuario no se encuentra en la base de datos",
            success: false
        })
        return;
    }

    // Verificar si el valor de contraseña ha sido proporcionado en el body de la petición
    if(!contraseña) {
        res.status(422).json({
            message: "No se proporcionaron los credenciales necesarios",
            success: false
        })
        return;
    }
    try {
        const hashedPassword = usuarioEncontrado.contraseña; // La contraseña almacenada en la base de datos siempre estará encriptada, por lo que obtendremos un hash de la misma y debemos nombrarla como tal

        // Verificar si la contraseña encriptada en la base de datos es correcta en el contexto de bcrypt, y asímismo detener o continuar el flujo de código
        if(!bcrypt.compareSync(contraseña, hashedPassword)) {
            res.status(401).send({
                message: "La contraseña proporcionada no es correcta",
                success: false
            });
            return;
        }

        // Crear el payload que se firmará para obtener nuestro token de autenticación jwt
        const payload = { id: usuarioEncontrado.id, correo: usuarioEncontrado.correo, telefono: usuarioEncontrado.telefono, direccion: usuarioEncontrado.direccion };
        const token = jwt.sign(payload, secretJWT, {
            expiresIn: '12h' // El token expirará en 12 horas
        });


        // Establecer la cookie "authorization" al token inmediatamente firmado
        res.cookie("authorization", token, {
            sameSite: "strict",
            httpOnly: true,
            secure: false,
            maxAge: 60 * 60 * 12000
        });


        // Verificación correcta de logeo de usuario
        res.status(200).send({
            message: "El usuario ha sido logeado correctamente",
            data: usuarioEncontrado
        })
    } catch(err) {
        console.log(err);

        // Raise an exception (Error inesperado interno del servidor);
        res.status(500).json({
            message: "Ha ocurrido un error interno en el servidor y no se ha podido logear al usuario",
            success: false
        });
    }
});



app.post("/api/consultas/create", isAuthenticated, async (req, res) => {
    const targetUser = req.dataUsuario;
    const id_usuario = targetUser.id;
    const { id_tipoconsulta, id_tipoanimal, fecha } = req.body;
    if(!id_tipoconsulta || !id_tipoanimal) {
        res.status(422).json({
            message: "Se deben proporcionar todos los campos necesarios para crear una consulta",
            success: false
        });
        return;
    }
    try {
        const consultaCreada = await Consultas.create({
            id_tipoconsulta: id_tipoconsulta,
            tipo_animal: id_tipoanimal,
            id_usuario: id_usuario,
            fecha_entrada: fecha || new Date(),
            estado: true
        });
        res.status(200).json({
            message: "Consulta creada correctamente",
            success: true,
            data: consultaCreada
        });
    } catch(err) {
        console.log(err);
        res.status(500).json({
            message: "Error interno del servidor, no se ha podido crear la consulta",
            success: false
        });
    }
});

app.post("/api/consultas/delete", isAuthenticated, async (req, res) => {
    const targetUser = req.dataUsuario;
    const id_usuario = targetUser.isAdmin ? req.body.id_usuario : targetUser.id;
    const { id_consulta } = req.body;
    if(!id_consulta || !id_usuario) {
        res.status(422).json({
            message: "Se debe proporcionar el id de la consulta o el usuario a eliminar",
            success: false
        });
        return;
    }
    try {
        let toUpdate = {
            estado: false
        };
        if(req.body.fecha_salida && targetUser.isAdmin) {
            toUpdate.fecha_salida = req.body.fecha_salida;
        }
        // Instead of deleting the record, we will update the record to set the state to false
        const consultaEliminada = await Consultas.update(toUpdate, {
            where: {
                id_consulta: id_consulta,
                id_usuario: id_usuario
            }
        });
        if(consultaEliminada[0] === 0) {
            res.status(404).json({
                message: "No se ha encontrado la consulta a eliminar, o ya ha sido eliminada anteriormente. No se actualizó ninguna información",
                success: false
            });
            return;
        }
        res.status(200).json({
            message: "Consulta eliminada correctamente",
            success: true,
            data: consultaEliminada
        });
    } catch(err) {
        console.log(err);
        res.status(500).json({
            message: "Error interno del servidor, no se ha podido eliminar la consulta",
            success: false
        });
    }
});


app.get("/api/consultas/get", isAuthenticated, async (req, res) => {
    const targetUser = req.dataUsuario;
    const id_usuario = targetUser.id;
    try {
        const consultas = await Consultas.findAll({
            where: {
                id_usuario: id_usuario,
                estado: true
            },
            include: [
                {
                    model: Animales,
                    required: true
                },
                {
                    model: TipoConsultas,
                    required: true
                }
            ]
        });
        res.status(200).json({
            message: "Consultas obtenidas correctamente",
            success: true,
            data: consultas
        });
    } catch(err) {
        console.log(err);
        res.status(500).json({
            message: "Error interno del servidor, no se han podido obtener las consultas",
            success: false
        });
    }
});  

app.get("/api/animales/get", isAuthenticated, async (req, res) => {
    try {
        const animales = await Animales.findAll();
        res.status(200).json({
            message: "Animales obtenidos correctamente",
            success: true,
            data: animales
        });
    } catch(err) {
        console.log(err);
        res.status(500).json({
            message: "Error interno del servidor, no se han podido obtener los animales",
            success: false
        });
    }
});

app.get("/api/tipoconsultas/get", isAuthenticated, async (req, res) => {
    try {
        const tipoconsultas = await TipoConsultas.findAll();
        res.status(200).json({
            message: "Tipo de consultas obtenidas correctamente",
            success: true,
            data: tipoconsultas
        });
    } catch(err) {
        console.log(err);
        res.status(500).json({
            message: "Error interno del servidor, no se han podido obtener los tipos de consultas",
            success: false
        });
    }
});

app.listen(4000, () => {
    console.log("App listening at port", 4000)
})