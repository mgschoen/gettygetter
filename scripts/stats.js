const fs = require('fs')
const prettyBytes = require('pretty-bytes')
const folderSize = require('get-folder-size')

const DB = require('../modules/db/loki')
const Logger = require('../modules/logger')
const LOGGER = new Logger('stats')

const { 
    STORAGE_PATH,
    STORAGE_FILENAME
} = require('../config/main.config')

DB().then(db => {

    LOGGER.log('Determining statistics...')
    let collection = db.getCollection('articles')
    let numDocs = collection.count()

    let gettyIDArticles = collection.find({containsGettyID: true})
    let gettyLeadImageArticles = collection.find({containsGettyIDInLeadImage: true})

    // Storage stats
    let stats = fs.statSync(STORAGE_PATH + STORAGE_FILENAME)
    folderSize(STORAGE_PATH, (err, size) => {

        LOGGER.log('Done.')

        console.log()
        console.log(`  Articles total: ${numDocs}`)
        console.log(`  Articles with at least one Getty ID exposed: ${gettyIDArticles.length}`)
        console.log(`  Articles where lead image exposes Getty ID: ${gettyLeadImageArticles.length}`)
        console.log()
        console.log(`  ##### Storage`)
        console.log(`  Size: ${prettyBytes(size)}`)
        console.log(`  Last Modified: ${new Date(stats.mtimeMs)}`)
        console.log()
    })

}).catch(e => {
    LOGGER.warn(e.message)
})