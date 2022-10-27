const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./model')
const { getProfile } = require('./middleware/getProfile');
const { getTypeFilter } = require('./utils.js/getTypeFilter');
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

/**
 * @returns contract by id
 */
app.get('/contracts/:id', getProfile, getTypeFilter, async (req, res) => {
    const { Contract } = req.app.get('models')
    const { id } = req.params
    const { typeFilter } = req
    const contract = await Contract.findOne({ where: { id, ...typeFilter } })
    if (!contract) return res.status(404).end()
    res.json(contract)
})
module.exports = app;
