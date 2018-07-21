const GettyClient = require('gettyimages-api')

const KeywordsInterface = require('./keywords')
const { getImageMetaFromWebpage } = require('./scraper')
const Logger = require('../logger')

const { 
    GETTYAPI_DEFAULT_FIELDS
} = require('../../config/main.config')

const GETTYAPI_KEY = process.env.GETTYAPI_KEY
const GETTYAPI_SECRET = process.env.GETTYAPI_SECRET

if (!GETTYAPI_KEY || !GETTYAPI_SECRET) {
    let LOGGER = new Logger('getty/api')
    LOGGER.error('Please provide credentials for Getty API in environment variables ' +
        'GETTYAPI_KEY and GETTYAPI_SECRET. Exiting.')
    process.exit(1)
}

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
        let LOGGER = new Logger('getty/api', 'fetchMetaForImages')

        let query = Getty.images().withIds(gettyIds)
        for (let field of GETTYAPI_DEFAULT_FIELDS) {
            query.withResponseField(field)
        }

        LOGGER.info(`Requesting meta data for images ${gettyIds} with fields ${query.fields}`)

        query.execute().then(response => {
            resolve(response)
        }).catch(error => {
            reject(error)
        })
    })
}

function setLeadImageInArticles (db, articleIDs, imageObject) {
    let collection = db.getCollection('articles')
    collection.updateWhere(doc => {
        return articleIDs.includes(doc.$loki)
    }, doc => {
        doc.leadImage = imageObject
        doc.gettyMeta = true
        return doc
    })
    db.saveDatabase()
}

/**
 * Searches the whole corpus for articles with Getty images as lead images,
 * checks wether they already have lead image metadata assigned, and if not, 
 * requests that data from the Getty API and updates the collection
 * @param {object} db Loki.js database
 * @returns {Promise} resolved when done
 */
function fetchLeadImageMeta (db) {

    function apiRequestLoop (startIndex, windowWidth, finishedCallback) {

        // select the next `windowWidth` images
        let imageIDs = Object.keys(imageArticleRelation)
        let window = imageIDs.slice(startIndex, startIndex + windowWidth)
        if (window.length > 0) {
            // request the data
            fetchMetaForImages(window).then(response => {
                
                // API does not offer access to _every_ image, therefore
                // we print the number of successfully received datasets
                // and remember the ids of the images not found
                let meta = response.images
                LOGGER.info(`Fetched ${meta.length} records of metadata`)
                for (let imageId of response.images_not_found) {
                    imagesNotFoundByApi[imageId] = imageArticleRelation[imageId]
                }

                // process metadata
                for (let imageMeta of meta) {
                    let imageID = imageMeta.id
                    let articleIDs = imageArticleRelation[imageID]
                    // update the keywords collection with new terms
                    let keywords = []
                    for (let kw of imageMeta.keywords) {
                        let keywordLokiID = Keywords.insertWithObject(kw)
                        if (keywordLokiID) {
                            keywords.push(keywordLokiID)
                        }
                    }
                    // store metadata in each article associated with the image
                    setLeadImageInArticles(db, articleIDs, {
                        id: imageMeta.id,
                        title: imageMeta.title,
                        caption: imageMeta.caption,
                        keywords: keywords,
                        url: imageMeta.display_sizes[0].uri
                    })
                }

            }).catch(error => {
                LOGGER.warn(`Error fetching metadata for images ${ids}: ${error.message}`)
                console.log(error.stack)
            }).then(() => {
                apiRequestLoop(startIndex + windowWidth, windowWidth, finishedCallback)
            })
        } else {
            finishedCallback()
        }
    }

    function scraperRequestLoop (index, finishedCallback) {

        let imageIDs = Object.keys(imagesNotFoundByApi)

        if (index < imageIDs.length) {
            
            let imageID = imageIDs[index]
            getImageMetaFromWebpage(imageID)
                .then(imageMeta => {

                    let keywords = []
                    for (let kw of imageMeta.keywords) {
                        let keywordLokiID = Keywords.insertWithString(kw)
                        if (keywordLokiID) {
                            keywords.push(keywordLokiID)
                        }
                    }

                    setLeadImageInArticles(db, imagesNotFoundByApi[imageID], {
                        id: imageMeta.id,
                        title: imageMeta.title,
                        caption: imageMeta.caption,
                        keywords: keywords,
                        url: imageMeta.url
                    })

                    LOGGER.info(`Successfully scraped metadata for image with id ${imageID}`)
                })
                .catch(error => {
                    LOGGER.warn(`Error scraping metadata for image ${imageID}: ${error.message}`)
                    console.log(error.stack)
                })
                .then(() => {
                    scraperRequestLoop(index+1, finishedCallback)
                })

        } else {
            finishedCallback()
        }
    }

    // begin main function
    let LOGGER = new Logger('getty/api', 'fetchLeadImageMeta')
    let Keywords = new KeywordsInterface(db)
    let collection = db.getCollection('articles')
    let articles = collection.find({containsGettyIDInLeadImage: true}).filter(doc => {
        return (doc.leadImage) ? false : true
    })
    let imageArticleRelation = {}
    let imagesNotFoundByApi = {}

    for (let doc of articles) {
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

    return new Promise((resolve, reject) => {

        if (articles.length > 0) {
            LOGGER.info(`Querying Getty API for metadata of ${Object.keys(imageArticleRelation).length} images...`)
            apiRequestLoop(0, 20, () => {
                LOGGER.info(`${Object.keys(imagesNotFoundByApi).length} images were not found by API. Scraping them instead...`)
                scraperRequestLoop(0, () => {
                    resolve()
                })
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