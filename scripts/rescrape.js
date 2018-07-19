const Loki = require('lokijs')
const lfsa = require('../node_modules/lokijs/src/loki-fs-structured-adapter')

const Logger = require('../modules/logger')
const LOGGER = new Logger('rescrape')

const { getArticleContent } = require('../modules/article')

const { 
    STORAGE_PATH,
    STORAGE_FILENAME
} = require('../config/main.config')

let articleRequestLoop = (urls, index) => {

    let nextTick = _ => {
        LOGGER.log(`${index+1} of ${urls.length} articles rescraped`)
        let nextIndex = index + 1
        if (nextIndex < urls.length) {
            articleRequestLoop(urls, nextIndex)
        } else {
            LOGGER.log('Done rescraping.')
        }
    }
    
    let url = urls[index]
    getArticleContent({url: url})
        .then(result => {
            let collectionItem = collection.findOne({url: url})
            if (result) {
                collectionItem.published = result.published
                collectionItem.article = result.article
            } else {
                let newArticleObject = {
                    headline: collectionItem.article.headline,
                    images: collectionItem.article.images,
                    paragraphs: []
                }
                for (let p of collectionItem.article.paragraphs) {
                    if (p.hasOwnProperty('type')) {
                        newArticleObject.paragraphs.push(p)
                    } else {
                        newArticleObject.paragraphs.push({
                            type: 'P',
                            content: p
                        })
                    }
                }
                collectionItem.article = newArticleObject
            }
            collection.update(collectionItem)
            db.saveDatabase()
        })
        .catch(error => {
            LOGGER.warn(`Error scraping article "${article.url}": ${error.message}`)
            console.log(error.stack)
        })
        .then(nextTick)
}
let main = _ => {
    let urls = collection.find().map(doc => {
        return doc.url
    })
    articleRequestLoop(urls, 0)
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