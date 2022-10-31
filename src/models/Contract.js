const { sequelize, Sequelize } = require('../../config/dbConfig.js');

class Contract extends Sequelize.Model { }
Contract.init(
    {
        terms: {
            type: Sequelize.TEXT,
            allowNull: false
        },
        status: {
            type: Sequelize.ENUM('new', 'in_progress', 'terminated')
        },
        ContractorId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        ClientId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
    },
    {
        sequelize,
        modelName: 'Contract'
    }
);

Contract.associate = (models) => {
    Contract.belongsTo(models.Profile, { as: 'Contractor', foreignKey: 'ContractorId' })
    Contract.belongsTo(models.Profile, { as: 'Client', foreignKey: 'ClientId' })
    Contract.hasMany(models.Job)
}

module.exports = Contract 