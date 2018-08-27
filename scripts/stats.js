const prettyBytes = require('pretty-bytes')

const Mongo = require('../modules/db/mongo')
const Logger = require('../modules/logger')
const LOGGER = new Logger('stats')

const { 
    STORAGE_PATH,
    STORAGE_FILENAME
} = require('../config/main.config')

let mongo = new Mongo()
mongo.init().then(async () => {
    
    LOGGER.log('Determining statistics...')
    let articlesCollection = mongo.collections.articles
    let numDocs = await articlesCollection.countDocuments()

    let gettyIDArticles = await articlesCollection.countDocuments({containsGettyID: true})
    let gettyLeadImageArticles = await articlesCollection.countDocuments({containsGettyIDInLeadImage: true})

    // Storage stats
    let stats = await mongo.db.stats()
    LOGGER.log('Done.')

    console.log()
    console.log(`  Articles total: ${numDocs}`)
    console.log(`  Articles with at least one Getty ID exposed: ${gettyIDArticles}`)
    console.log(`  Articles where lead image exposes Getty ID: ${gettyLeadImageArticles}`)
    console.log()
    console.log(`  ##### Storage`)
    console.log(`  Size: ${prettyBytes(stats.storageSize)}`)
    console.log()

}).catch(e => {
    LOGGER.warn(e.message)
}).then(() => {
    process.exit()
})