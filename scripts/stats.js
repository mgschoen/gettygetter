const fs = require('fs')
const Loki = require('lokijs')
const lfsa = require('../node_modules/lokijs/src/loki-fs-structured-adapter')
const prettyBytes = require('pretty-bytes')
const folderSize = require('get-folder-size')

const Logger = require('../modules/logger')
const LOGGER = new Logger('stats')

const { 
    STORAGE_PATH,
    STORAGE_FILENAME
} = require('../config/main.config')

let main = _ => {
    LOGGER.log('Determining statistics...')
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
}

let initCollections = _ => {
    collection = db.getCollection('articles')
    if (!collection) {
        collection = db.addCollection('articles')
    }
    main()
}

// Initialise database
LOGGER.log(`Initialising database from file ${STORAGE_PATH + STORAGE_FILENAME}`)
const adapter = new lfsa()
const db = new Loki(STORAGE_PATH + STORAGE_FILENAME, {
    adapter: adapter,
    autoload: true,
    autoloadCallback: initCollections
})
let collection