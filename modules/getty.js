const GettyClient = require('gettyimages-api')

const Logger = require('./logger')

const { 
    GETTYAPI_KEY,
    GETTYAPI_SECRET,
    GETTYAPI_DEFAULT_FIELDS
} = require('../config/main.config')

const credentials = {
    apiKey: GETTYAPI_KEY,
    apiSecret: GETTYAPI_SECRET
}

const Getty = new GettyClient(credentials)

/**
 * Requests image metadata for a list of images from the Getty API 
 * @param {string[]} gettyIds list of getty IDs
 * @returns {Promise} resolves to an array of image metadata
 */
function fetchMetaForImages (gettyIds) {
    return new Promise((resolve, reject) => {
        let LOGGER = new Logger('getty', 'fetchMetaForImages')

        let query = Getty.images().withIds(gettyIds)
        for (let field of GETTYAPI_DEFAULT_FIELDS) {
            query.withResponseField(field)
        }

        LOGGER.info(`Requesting meta data for images ${gettyIds} with fields ${query.fields}`)

        query.execute().then(response => {
            resolve(response.images)
        }).catch(error => {
            reject(error)
        })
    })
}

/**
 * Searches the whole corpus for articles with Getty images as lead images,
 * checks wether they already have lead image metadata assigned, and if not, 
 * requests that data from the Getty API and updates the collection
 * @param {object} db Loki.js database
 * @returns {Promise} resolved when done
 */
function fetchLeadImageMeta (db) {

    function requestLoop (articles, startIndex, windowWidth, finishedCallback) {

        let window = articles.slice(startIndex, startIndex + windowWidth)
        if (window.length > 0) {
            let imageArticleRelation = {}
            for (doc of window) {
                let imageID
                if (doc.teaser.img && doc.teaser.img.gettyID) {
                    imageID = doc.teaser.img.gettyID
                } else {
                    imageID = doc.article.images[0].gettyID
                }
                if (imageArticleRelation[imageID]) {
                    imageArticleRelation[imageID].push(doc.$loki)
                } else {
                    imageArticleRelation[imageID] = [ doc.$loki ]
                }
            }
            let ids = Object.keys(imageArticleRelation)

            fetchMetaForImages(ids).then(meta => {
                
                LOGGER.info(`Fetched ${meta.length} records of metadata`)
                for (let imageMeta of meta) {
                    let imageID = imageMeta.id
                    let articleIDs = imageArticleRelation[imageID]
                    for (articleID of articleIDs) {
                        let article = window.filter(doc => {
                            return doc.$loki === articleID
                        })[0]
                        article.leadImage = {
                            id: imageMeta.id,
                            title: imageMeta.title,
                            caption: imageMeta.caption,
                            keywords: imageMeta.keywords,
                            url: imageMeta.display_sizes[0].uri
                        }
                        article.gettyMeta = true
                        collection.update(article)
                    }
                }
                db.saveDatabase()

            }).catch(error => {
                LOGGER.warn(`Error fetching metadata for images ${ids}: ${error.message}`)
                console.log(error.stack)
            }).then(() => {
                requestLoop(articles, startIndex + windowWidth, windowWidth, finishedCallback)
            })
        } else {
            finishedCallback()
        }
    }

    let LOGGER = new Logger('getty', 'fetchLeadImageMeta')
    let collection = db.getCollection('articles')
    let articles = collection.find({containsGettyIDInLeadImage: true}).filter(doc => {
        return (doc.leadImage) ? false : true
    })

    return new Promise((resolve, reject) => {

        if (articles.length > 0) {
            requestLoop(articles, 0, 20, () => {
                resolve()
            })
        } else {
            resolve()
        }

    })
}

module.exports = {
    fetchMetaForImages,
    fetchLeadImageMeta
}