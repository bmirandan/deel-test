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
    try {
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
    } catch (error) {
        console.log(error)
        res.status(500).end()
    }
})

/**
 * @returns contract that are not terminated
 */

app.get('/contracts', getProfile, async (req, res) => {
    try {
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
    } catch (error) {
        console.error(err.message) // probably a logger should be used
        res.status(500).end()
    }
})

/**
 * @returns all unpaid jobs of a profile
 */

app.get('/jobs/unpaid', getProfile, async (req, res) => {
    try {
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
    }
    catch (err) {
        console.error(err.message) // probably a logger should be used
    }
})

/**
 * @returns paid a job
 */

app.post('/jobs/:job_id/pay', getProfile, async (req, res) => {
    const { Job, Contract } = req.app.get('models')
    const { id: idProfile, balance } = req.profile
    const { job_id } = req.params
    const transaction = await sequelize.transaction();
    try {
        const job = await Job.findOne({
            where: {
                id: job_id,
                paid: { [Op.not]: true },
                price: { [Op.lte]: balance },
            },
            include: { model: Contract, where: { ContractorId: idProfile } }
        })
        if (!job) throw new Error('Job not found!')
        await job.update({ paid: true }, { transaction })
        await req.profile.update({ balance: balance - job.price }, { transaction })
        await transaction.commit();
        res.json(job)
    }
    catch (err) {
        console.error(err.message) // probably a logger should be used
        await transaction.rollback()
        return res.status(500).end()
    }
})

/**
 * @returns deposit to client balance 
 */

app.post('/balances/deposit/:userId', async (req, res) => {
    const { Job, Contract, Profile } = req.app.get('models')
    const { userId } = req.params
    const { amount } = req.body
    if (!amount) { return res.status(401).end() }
    const transaction = await sequelize.transaction();
    try {
        const profile = await Profile.findOne({ where: { id: userId, type: 'client' } })
        if (!profile) throw new Error('Profile not found!')
        const jobsSum = await Job.findAll({
            where: {
                paid: { [Op.not]: true },
            },
            include: {
                model: Contract,
                where: {
                    ClientId: userId,
                    status: { [Op.not]: 'terminated' }
                }
            },
            raw: true,
            attributes: [[sequelize.fn('sum', sequelize.col('price')), 'sum']]
        })
        const totalJobs = jobsSum[0].sum
        if (amount > totalJobs * 0.25) throw new Error('Amount is too high!')
        await profile.update({ balance: profile.balance + amount }, { transaction })
        await transaction.commit();
        res.json({ message: "Balance updated!!" })
    }
    catch (err) {
        console.error(err.message) // probably a logger should be used
        await transaction.rollback()
        return res.status(500).end()
    }
})

/**
 * @returns admin/best-profession'
 */

app.get('/admin/best-profession', async (req, res) => {
    try {
        const { Job, Contract, Profile } = req.app.get('models')
        const { start, end } = req.query

        const jobs = await Job.findAll({
            raw: true,
            attributes: ['Contract.Contractor.profession', [sequelize.fn('sum', sequelize.col('price')), 'sum']],
            where: {
                paid: true,
                paymentDate: { [Op.between]: [start, end] }
            },
            include: {
                model: Contract,
                attributes: ['ContractorId'],
                include: {
                    model: Profile,
                    attributes: ['profession'],
                    where: { type: 'contractor' },
                    as: 'Contractor'
                },
            },
            group: ['Contract.Contractor.profession'],
            order: [[sequelize.fn('sum', sequelize.col('price')), 'DESC']],
            limit: 1
        })
        const bestProfession = jobs[0]?.profession
        res.json({ bestProfession })
    }
    catch (err) {
        console.error(err.message)
        return res.status(500).end()
    }
})

/**
 * @returns best client 
 */

app.get('/admin/best-clients', async (req, res) => {
    try {
        const { Job, Contract, Profile } = req.app.get('models')
        const { start, end, limit = 1 } = req.query
        const clients = await Job.findAll({
            attributes: [
                [sequelize.fn('sum', sequelize.col('price')), 'paid']
            ],
            where: {
                paymentDate: { [Op.between]: [start, end] }
            },
            include: {
                model: Contract,
                attributes: ['ClientId'],
                include: {
                    raw: true,
                    model: Profile,
                    attributes: { exclude: ['id', 'createdAt', 'updatedAt'] },
                    where: { type: 'client' },
                    as: 'Client'
                },
            },
            group: ['Contract.Client.firstName'],
            order: [[sequelize.fn('sum', sequelize.col('price')), 'DESC']],
            limit: limit
        })
        const bestClients = clients.map(client => { return { ...client.Contract.Client.dataValues, paid: client.paid } })
        res.json({ bestClients })
    }
    catch (err) {
        console.error(err.message)
        return res.status(500).end()
    }
})





module.exports = app;

