const Mongo = require('./modules/db/mongo')
const { getArticleTeasers } = require('./modules/bbc/section')
const { getArticleContent } = require('./modules/bbc/article')
const { setFlags } = require('./modules/set-flags')
const Getty = require('./modules/getty/api')
const Calais = require('./modules/calais/calais')
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

let fetchMissingCalaisTags = () => {
    return new Promise(async (resolve, reject) => {
        let untaggedArticles = await mongo.getArticles({calaisTags: {$ne: true}})
        let CalaisInterface = new Calais(mongo)
        LOGGER.info(`Fetching Calais tags for ${untaggedArticles.length} articles`)
        // Fetch calais tags for all untagged articles
        for (let article of untaggedArticles) {
            let paragraphs = [...article.article.paragraphs]
            paragraphs.unshift({
                type: 'H1',
                content: `${article.article.headline}.`
            })
            let fullText = paragraphs.reduce((acc, cur) => `${acc} ${cur.content}`, '')
            // Init a loop of three tries for each article.
            // Break this loop as soon as request was successful.
            for (let iteration = 1; iteration < 4; iteration++) {
                if (iteration > 1) {
                    LOGGER.info(`Trying again (iteration ${iteration}/3)...`)
                }
                try {
                    await CalaisInterface.fetchFromApi(article._id.toString(), fullText)
                    break
                } catch (error) {
                    LOGGER.error(error.message)
                }
            }
        }
        // Note: This promise might be resolved, even though some articles
        // are still untagged. For the moment, we accept this
        resolve()
    })
}

/**
 * Extracts contents of exactly one article in the corpus and triggers next
 * loop after extraction has finished
 * @param {Array} corpus array containing all information about all articles we have
 * @param {number} index index of article in corpus
 */
let articleRequestLoop = async (corpus, index) => {

    let nextTick = _ => {
        let nextIndex = index + 1
        if (nextIndex < corpus.length) {
            articleRequestLoop(corpus, nextIndex)
        } else {
            LOGGER.log('Done scraping.')
            LOGGER.log('Postprocessing corpus...')
            // TODO: change setFlags implementation
            setFlags(mongo).then(() => {
                LOGGER.info('Fetching lead image metadata for the whole corpus')
                // TODO: change Getty.fetchLeadImageMeta implementation
                Getty.fetchLeadImageMeta(mongo).then(() => {
                    LOGGER.log('Done fetching image metadata.')
                    fetchMissingCalaisTags().then(() => {
                        LOGGER.log('Done.')
                        process.exit()
                    })
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
    let sameInDB = await mongo.getArticleWithUrl(article.url)
    if (!sameInDB) {
        getArticleContent(article)
            .then(async result => {
                if (result) {
                    await mongo.insertArticle(result)
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

let mongo = new Mongo()
mongo.init().then(() => {
    sectionRequestLoop(BBC_SECTION_URLS, 0, [], corpus => {
        articleRequestLoop(corpus, 0)
    })
})