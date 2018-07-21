const DB = require('../modules/db')
const Logger = require('../modules/logger')
const LOGGER = new Logger('rescrape')

const { getArticleContent } = require('../modules/article')

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
            LOGGER.warn(`Error scraping article "${url}": ${error.message}`)
            console.log(error.stack)
        })
        .then(nextTick)
}

let db, collection

DB().then(database => {
    db = database
    collection = db.getCollection('articles')
    let urls = collection.find().map(doc => {
        return doc.url
    })
    articleRequestLoop(urls, 0)
}).catch(e => {
    LOGGER.warn(e.message)
})