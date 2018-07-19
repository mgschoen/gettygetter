const fs = require('fs')
const Loki = require('lokijs')
const lfsa = require('../node_modules/lokijs/src/loki-fs-structured-adapter')
const prettyBytes = require('pretty-bytes')
const folderSize = require('get-folder-size')

const Util = require('../modules/util')
const Logger = require('../modules/logger')
const LOGGER = new Logger('stats')

const { 
    STORAGE_PATH,
    STORAGE_FILENAME
} = require('../config/main.config')

const GETTY_REGEX = /_\d+_gettyimages-\d+\.(jpg|jpeg|JPG|JPEG|png|PNG|gif|GIF)/gm

let main = _ => {
    LOGGER.log('Determining statistics...')
    let numDocs = collection.count()

    // lead image is defined as either first img in article or teaser image
    let gettyLeadImageArticles = []
    let gettyIDArticles = collection.where(doc => {
        let foundGettyID = false,
            foundGettyIDInLeadImage = false
        // check teaser image
        if (doc.teaser.img) {
            let teaserImageID = Util.extractGettyID(doc.teaser.img.src)
            if (teaserImageID) {
                foundGettyID = true
                foundGettyIDInLeadImage = true
                doc.teaser.img.gettyID = teaserImageID
            }
        }
        // check all images within article
        for (let i = 0; i < doc.article.images.length; i++) {
            let image = doc.article.images[i]
            let imageGettyID = Util.extractGettyID(image.src)
            if (imageGettyID) {
                foundGettyID = true
                image.gettyID = imageGettyID
                if (i == 0) {
                    foundGettyIDInLeadImage = true
                }
            }
        }
        // update doc
        if (foundGettyID) {
            doc.containsGettyID = true
        }
        if (foundGettyIDInLeadImage) {
            doc.containsGettyIDInLeadImage = true
            gettyLeadImageArticles.push(doc)
        }
        collection.update(doc)
        return foundGettyID
    })
    
    db.saveDatabase()

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