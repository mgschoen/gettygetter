const LokiInterface = require('../modules/db/loki')
const MongoInterface = require('../modules/db/mongo')

const Logger = require('../modules/logger')
const LOGGER = new Logger('migrate-to-mongo')

function removeLokiTraces (lokiObject) {
    let copy = {...lokiObject}
    delete copy.$loki
    delete copy.meta
    return copy
}

LokiInterface().then(async lokiDB => {
    let lokiCollections = {
        articles: lokiDB.getCollection('articles'),
        keywords: lokiDB.getCollection('keywords'),
        calais: lokiDB.getCollection('calais')
    }

    let mongo = new MongoInterface()
    await mongo.init()
    
    let articles = lokiCollections.articles.find()
    for (let article of articles) {
        let articleCopy = removeLokiTraces(article)

        // process lead image if present
        if (article.leadImage) {
            articleCopy.leadImage = {...article.leadImage}
            let keywordIdsLoki = article.leadImage.keywords
            let keywords = lokiCollections.keywords.find({$loki: {$in: keywordIdsLoki}})
            let keywordIdsMongo = []
            for (let keyword of keywords) {
                let kwCopy = removeLokiTraces(keyword)
                let mongoId = await mongo.insertKeywordWithObject(kwCopy)
                keywordIdsMongo.push(mongoId)
            }
            articleCopy.leadImage.keywords = keywordIdsMongo
        }

        // insert article
        let insertedArticleId = await mongo.insertArticle(articleCopy)
        if (!insertedArticleId) {
            LOGGER.warn(`Something with loki article $${article.$loki} did not work`)
            continue
        }
        LOGGER.log(`$${article.$loki} -> ${insertedArticleId}`)

        // check if calais tags are present
        let calais = lokiCollections.calais.findOne({forArticle: article.$loki})
        if (calais) {
            let calaisCopy = removeLokiTraces(calais)
            let calaisId = await mongo.insertCalais(calaisCopy, insertedArticleId)
            if (!calaisId) {
                LOGGER.warn(`Something with calais entry for article ${insertedArticleId} went wrong`)
                continue
            }
            LOGGER.log(`+ Calais tags: ${calaisId}`)
        }
    }
    return
})