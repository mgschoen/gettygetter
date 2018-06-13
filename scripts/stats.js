const fs = require('fs')
const Loki = require('lokijs')
const prettyBytes = require('pretty-bytes')

const Logger = require('../modules/logger')
const LOGGER = new Logger('stats')

const { STORAGE_PATH } = require('../config/main.config')

const GETTY_REGEX = /_\d+_gettyimages-\d+\.(jpg|jpeg|JPG|JPEG|png|PNG|gif|GIF)/gm

let main = _ => {
    LOGGER.log('Determining statistics...')
    let numDocs = collection.count()
    let gettyArticles = collection.where(doc => {
        let images = doc.article.images
        for (let img of images) {
            let copyright = img.copyright
            if (copyright && copyright.toLowerCase().indexOf('getty') >= 0) {
                return true
            }
        }
        return false
    })
    let gettyIDArticles = gettyArticles.filter(doc => {
        let images = doc.article.images
        for (let img of images) {
            let copyright = img.copyright
            if (copyright && copyright.toLowerCase().indexOf('getty') >= 0) {
                // this is a getty image - but is the ID exposed?
                let filename = img.src.split('/').pop()
                if (GETTY_REGEX.test(filename)) {
                    return true
                }
            }
        }
        return false
    })

    // Storage stats
    let stats = fs.statSync(STORAGE_PATH)
    
    LOGGER.log('Done.')

    console.log()
    console.log(`  Articles total: ${numDocs}`)
    console.log(`  Articles with images from Getty: ${gettyArticles.length}`)
    console.log(`  Articles with at least one Getty ID exposed: ${gettyIDArticles.length}`)
    console.log()
    console.log(`  ##### Storage`)
    console.log(`  Size: ${prettyBytes(stats.size)}`)
    console.log(`  Last Modified: ${new Date(stats.mtimeMs)}`)
    console.log()
}

let initCollections = _ => {
    collection = db.getCollection('articles')
    if (!collection) {
        collection = db.addCollection('articles')
    }
    main()
}

// Initialise database
LOGGER.log(`Initialising database from file ${STORAGE_PATH}`)
const db = new Loki(STORAGE_PATH, {
    autoload: true,
    autoloadCallback: initCollections
})
let collection