const Loki = require('lokijs')
const lfsa = require('../node_modules/lokijs/src/loki-fs-structured-adapter')

const Logger = require('../modules/logger')
const LOGGER = new Logger('refactor-reaser-image')

const { 
    STORAGE_PATH,
    STORAGE_FILENAME
} = require('../config/main.config')

function main () {
    collection.updateWhere(doc => {
        let teaserImage = doc.teaser.img
        if (teaserImage) {
            LOGGER.log(`Refactoring teaser image: ${teaserImage}`)
            return true
        }
        return false
    }, doc => {
        let imgurl = doc.teaser.img
        doc.teaser.img = { src: imgurl }
        console.log(doc)
        return doc
    })

    db.saveDatabase()
}

function initCollections () {
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