const Loki = require('lokijs')
const lfsa = require('./node_modules/lokijs/src/loki-fs-structured-adapter')

const { getArticleTeasers } = require('./modules/section')
const { getArticleContent } = require('./modules/article')
const Logger = require('./modules/logger')

const { 
    BBC_BASEURL, 
    BBC_SECTION_URLS,
    STORAGE_PATH
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
            // This is where we would print/store the corpus
            LOGGER.log('Done scraping.')
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

let initCollections = _ => {
    collection = db.getCollection('articles')
    if (!collection) {
        collection = db.addCollection('articles')
    }
    main()
}

let main = _ => {
    sectionRequestLoop(BBC_SECTION_URLS, 0, [], corpus => {
        articleRequestLoop(corpus, 0)
    })
}

// Initialise database
const adapter = new lfsa()
const db = new Loki(STORAGE_PATH, {
    adapter: adapter,
    autoload: true,
    autoloadCallback: initCollections
})
let collection