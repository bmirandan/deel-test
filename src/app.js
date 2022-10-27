const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./model')
const { Op } = require("sequelize");
const { getProfile } = require('./middleware/getProfile');
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

/**
 * @returns contract by id
 */
app.get('/contracts/:id', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models')
    const { id } = req.params
    const { id: idProfile } = req.profile
    const contract = await Contract.findOne({
        where:
        {
            id, [Op.or]: [{ ClientId: idProfile }, { ContractorId: idProfile }],
        }
    })
    if (!contract) return res.status(404).end()
    res.json(contract)
})

app.get('/contracts', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models')
    const { id: idProfile } = req.profile
    const contract = await Contract.findAll({
        where:
        {
            [Op.or]: [{ ClientId: idProfile }, { ContractorId: idProfile }],
            status: { [Op.not]: 'terminated' }
        }
    })
    if (!contract) return res.status(404).end()
    res.json(contract)
})

app.get('/jobs/unpaid', getProfile, async (req, res) => {
    const { Job, Contract } = req.app.get('models')
    const { id: idProfile } = req.profile
    const jobs = await Job.findAll({
        where:
        {
            paid: { [Op.not]: true },
        },
        include: {
            model: Contract,
            where: {
                [Op.or]: [{ ClientId: idProfile }, { ContractorId: idProfile }],
                status: { [Op.not]: 'terminated' }
            }
        }
    })
    if (!jobs) return res.status(404).end()
    res.json(jobs)
})

module.exports = app;
