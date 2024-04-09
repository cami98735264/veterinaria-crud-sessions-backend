const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('consultas', {
    id_consulta: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    id_tipoconsulta: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tipo_consultas',
        key: 'id_tipo'
      }
    },
    tipo_animal: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'animales',
        key: 'animal_id'
      }
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    fecha_entrada: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    fecha_salida: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'consultas',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id_consulta" },
        ]
      },
      {
        name: "fk_tipo_consulta",
        using: "BTREE",
        fields: [
          { name: "id_tipoconsulta" },
        ]
      },
      {
        name: "fk_tipo_animal",
        using: "BTREE",
        fields: [
          { name: "tipo_animal" },
        ]
      },
      {
        name: "fk_id_usuario",
        using: "BTREE",
        fields: [
          { name: "id_usuario" },
        ]
      },
    ]
  });
};
