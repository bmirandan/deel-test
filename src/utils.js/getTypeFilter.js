
const getTypeFilter = async (req, res, next) => {
    const { profile: { id, type } } = req
    const typeFormated = `${type.charAt(0).toUpperCase()}${type.slice(1)}Id`
    req.typeFilter = { [typeFormated]: id }
    if (!type) return res.status(401).end()
    next()
}
module.exports = { getTypeFilter }