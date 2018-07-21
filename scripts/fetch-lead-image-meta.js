const DB = require('../modules/db')
const Getty = require('../modules/getty/api')
const Logger = require('../modules/logger')
const LOGGER = new Logger('fetch-lead-image-meta')

DB().then(db => {
    LOGGER.info('Fetching lead image metadata for the whole corpus')
    Getty.fetchLeadImageMeta(db).then(() => {
        LOGGER.info('Done.')
    }).catch(e => {
        LOGGER.warn(`Error fetching image metadata: ${e.message}`)
    })
})