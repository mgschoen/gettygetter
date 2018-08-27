const request = require('request')

const { CALAIS_BASEURL } = require('../../config/main.config')
const Logger = require('../logger')
const LOGGER = new Logger('calais')

const { insertToDictionary } = require('../util')

const CALAIS_KEY = process.env.CALAIS_KEY
if (!CALAIS_KEY) {
    LOGGER.error('Please provide key for Open Calais API in CALAIS_KEY '+
        'environment variable. Exiting.')
    process.exit(1)
}

function groupObjectList (list, groupProperty, includeOther) {
    let groupedList = {}
    for (let key in list) {
        let item = list[key]
        let group = item[groupProperty]
        if (group) {
            insertToDictionary(groupedList, group, item)
        } else if (includeOther) {
            insertToDictionary(groupedList, 'Other', item)
        }
    }
    return groupedList
}

module.exports = function (mongo, mute) {

    this.mongo = mongo
    this.calaisCollection = mongo.collections.calais
    this.log = mute ? false : true

    this.getFromStorage = async function (articleId) {
        let queryResult = await this.calaisCollection.find({forArticle: articleId}).toArray()
        if (queryResult.length === 1) {
            return queryResult[0]
        } else if (queryResult.length < 1 && this.log) {
            LOGGER.warn(`No storage entry for article ${articleId}`)
        } else if (this.log) {
            LOGGER.warn(`Storage entries for article ${articleId} are ambiguous`)
        }
        return null
    }

    this.fetchFromApi = function (articleId, fullText) {

        
        if (this.log) 
            LOGGER.info(`Requesting Calais tags for article $${articleId}: ${fullText.slice(0,50)}...`)

        return new Promise((resolve, reject) => {
            
            request.post({
                url: CALAIS_BASEURL,
                headers: {
                    'Content-Type': 'text/raw',
                    'x-ag-access-token': CALAIS_KEY,
                    'outputFormat': 'application/json'
                },
                body: fullText
            }, async (error, response, responseBody) => {
    
                if (error) {
                    if (this.log) 
                        LOGGER.error(error.message)
                    reject(error)
                    return
                }
    
                if (response.statusCode !== 200) {
                    let statusMessage = response.statusMessage
                    let reason
                    try {
                        let responseObject = JSON.parse(responseBody)
                        reason = (responseObject.fault) ? responseObject.fault.faultstring : 'Reason unknown'
                    } catch (error) {
                        reason = responseBody
                    }
                    let errorMessage = `${statusMessage}: ${reason}`
                    if (this.log)
                        LOGGER.error(errorMessage)
                    reject(new Error(errorMessage))
                    return
                }
    
                // Everything ok, start processing the response
                let body = JSON.parse(responseBody)
                let dbEntry = groupObjectList(body, '_typeGroup', false)
                let entitiesByType = groupObjectList(dbEntry.entities, '_type', true)
                dbEntry.entities = entitiesByType
                let relationsByType = groupObjectList(dbEntry.relations, '_type', true)
                dbEntry.relations = relationsByType
    
                delete dbEntry.language
                delete dbEntry.versions
    
                dbEntry.forArticle = articleId
    
                // Update the storage
                try {
                    await this.calaisCollection.deleteMany({forArticle: articleId})
                    await this.calaisCollection.insertOne(dbEntry)
                    await this.mongo.updateArticle(articleId, {$set: {calaisTags: true}})
                    if (this.log)
                        LOGGER.info(`Stored about ${Object.keys(body).length - 3} tags for article $${articleId} successfully`)
                    resolve()
                } catch (error) {
                    reject(error)
                }
            })
        })
    }
}