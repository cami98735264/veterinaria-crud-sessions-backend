var DataTypes = require("sequelize").DataTypes;
var _consultas = require("./consultas");

function initModels(sequelize) {
  var consultas = _consultas(sequelize, DataTypes);

  consultas.belongsTo(animales, { as: "tipo_animal_animale", foreignKey: "tipo_animal"});
  animales.hasMany(consultas, { as: "consulta", foreignKey: "tipo_animal"});
  consultas.belongsTo(tipo_consultas, { as: "id_tipoconsulta_tipo_consulta", foreignKey: "id_tipoconsulta"});
  tipo_consultas.hasMany(consultas, { as: "consulta", foreignKey: "id_tipoconsulta"});
  consultas.belongsTo(usuarios, { as: "id_usuario_usuario", foreignKey: "id_usuario"});
  usuarios.hasMany(consultas, { as: "consulta", foreignKey: "id_usuario"});

  return {
    consultas,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
