const Mongo = require('../modules/db/mongo')
const Logger = require('../modules/logger')
const LOGGER = new Logger('rescrape')

const { getArticleContent } = require('../modules/bbc/article')

let articleRequestLoop = (urls, index) => {

    return new Promise((resolve, reject) => {

        let nextTick = _ => {
            LOGGER.log(`${index+1} of ${urls.length} articles rescraped`)
            let nextIndex = index + 1
            if (nextIndex < urls.length) {
                articleRequestLoop(urls, nextIndex)
            } else {
                LOGGER.log('Done rescraping.')
                resolve()
            }
        }
        
        let url = urls[index]
        getArticleContent({url: url})
            .then(async result => {
                let collectionItem = await mongo.collections.articles.findOne({url: url})
                let setOperations = {}
                if (result) {
                    setOperations.published = result.published
                    setOperations.article = result.article
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
                    setOperations.article = newArticleObject
                }
                await mongo.updateArticle(collectionItem._id.toString(), {$set: setOperations})
            })
            .catch(error => {
                LOGGER.warn(`Error scraping article "${url}": ${error.message}`)
                console.log(error.stack)
            })
            .then(nextTick)

    })
}

let mongo = new Mongo()
mongo.init().then(async () => {
    let urls = await mongo.collections.articles.find()
        .map(doc => doc.url)
        .toArray()
    await articleRequestLoop(urls, 0)
}).catch(e => {
    LOGGER.warn(e.message)
}).then(() => {
    process.exit()
})