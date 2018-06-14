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

const GETTY_REGEX = /_\d+_gettyimages-\d+\.(jpg|jpeg|JPG|JPEG|png|PNG|gif|GIF)/gm

let main = _ => {
    LOGGER.log('Determining statistics...')
    let numDocs = collection.count()
    let gettyArticles = 0,
        gettyIDArticles = 0
    collection.updateWhere(doc => {
        let images = doc.article.images
        for (let img of images) {
            let copyright = img.copyright
            if (copyright && copyright.toLowerCase().indexOf('getty') >= 0) {
                gettyArticles++
                return true
            }
        }
        return false
    }, doc => {
        doc.getty = true
        return doc
    })
    collection.updateWhere(doc => {
        let images = doc.article.images
        for (let img of images) {
            let copyright = img.copyright
            if (copyright && copyright.toLowerCase().indexOf('getty') >= 0) {
                // this is a getty image - but is the ID exposed?
                let filename = img.src.split('/').pop()
                if (GETTY_REGEX.test(filename)) {
                    gettyIDArticles++
                    return true
                }
            }
        }
        return false
    }, doc => {
        doc.gettyID = true
        return doc
    })

    db.saveDatabase()

    // Storage stats
    let stats = fs.statSync(STORAGE_PATH + STORAGE_FILENAME)
    folderSize(STORAGE_PATH, (err, size) => {

        LOGGER.log('Done.')

        console.log()
        console.log(`  Articles total: ${numDocs}`)
        console.log(`  Articles with images from Getty: ${gettyArticles}`)
        console.log(`  Articles with at least one Getty ID exposed: ${gettyIDArticles}`)
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