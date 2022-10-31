const { sequelize } = require('../../config/dbConfig.js');
const Profile = require('./Profile.js');
const Contract = require('./Contract.js');
const Job = require('./Job.js');

module.exports = {
    sequelize,
    Profile,
    Contract,
    Job
};
