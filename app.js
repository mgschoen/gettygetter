const DB = require('./modules/db')
const { getArticleTeasers } = require('./modules/bbc/section')
const { getArticleContent } = require('./modules/bbc/article')
const { setFlags } = require('./modules/set-flags')
const Getty = require('./modules/getty/api')
const Logger = require('./modules/logger')

const { 
    BBC_BASEURL, 
    BBC_SECTION_URLS
 } = require('./config/main.config')

const LOGGER = new Logger('main')

let sectionRequestLoop = (urls, index, corpus, finishedCallback) => {

    let nextTick = _ => {
        let nextIndex = index + 1
        if (nextIndex < urls.length) {
            sectionRequestLoop(urls, nextIndex, corpus, finishedCallback)
        } else {
            finishedCallback(corpus)
        }
    }

    let sectionUrl = urls[index]
    let sectionName = sectionUrl.split('/').pop()
    getArticleTeasers(BBC_BASEURL + sectionUrl, sectionName)
        .then(result => {
            corpus = [...corpus, ...result]
        })
        .catch(error => {
            LOGGER.error(`Error scraping section "${sectionName}": ${error.message}`)
            console.log(error.stack)
        })
        .then(nextTick)
}

/**
 * Extracts contents of exactly one article in the corpus and triggers next
 * loop after extraction has finished
 * @param {Array} corpus array containing all information about all articles we have
 * @param {number} index index of article in corpus
 */
let articleRequestLoop = (corpus, index) => {

    let nextTick = _ => {
        let nextIndex = index + 1
        if (nextIndex < corpus.length) {
            articleRequestLoop(corpus, nextIndex)
        } else {
            LOGGER.log('Done scraping.')
            LOGGER.log('Postprocessing corpus...')
            setFlags(db).then(() => {
                LOGGER.info('Fetching lead image metadata for the whole corpus')
                Getty.fetchLeadImageMeta(db).then(() => {
                    LOGGER.log('Done.')
                }).catch(e => {
                    LOGGER.warn(`Error fetching image metadata: ${e.message}`)
                })
            })
            .catch(e => {
                LOGGER.warn(e.getMessage())
            })
        }
    }

    let article = corpus[index]
    let sameInDB = collection.find({url: article.url})
    if (sameInDB.length === 0) {
        getArticleContent(article)
            .then(result => {
                if (result) {
                    collection.insert(result)
                    db.saveDatabase()
                }
            })
            .catch(error => {
                LOGGER.warn(`Error scraping article "${article.url}": ${error.message}`)
                console.log(error.stack)
            })
            .then(nextTick)
    } else {
        LOGGER.info(`Skipping article ${article.url} because it was already scraped`)
        nextTick()
    }
}

let db, collection

DB().then(database => {
    db = database
    collection = db.getCollection('articles')
    sectionRequestLoop(BBC_SECTION_URLS, 0, [], corpus => {
        articleRequestLoop(corpus, 0)
    })
})