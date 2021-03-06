const Mongo = require('../modules/db/mongo')
const Getty = require('../modules/getty/api')
const Logger = require('../modules/logger')
const LOGGER = new Logger('fetch-lead-image-meta')

let mongo = new Mongo()
mongo.init().then(() => {
    LOGGER.info('Fetching lead image metadata for the whole corpus')
    Getty.fetchLeadImageMeta(mongo).then(() => {
        LOGGER.info('Done.')
    }).catch(e => {
        LOGGER.warn(`Error fetching image metadata: ${e.message}`)
    }).then(() => {
        process.exit()
    })
})