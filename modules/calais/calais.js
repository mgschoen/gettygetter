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

module.exports = function (database) {

    this.db = database
    this.articleCollection = this.db.getCollection('articles')
    this.calaisCollection = this.db.getCollection('calais')
    if (!this.calaisCollection) {
        this.calaisCollection = this.db.addCollection('calais')
    }

    this.getFromStorage = function (articleId) {
        let queryResult = this.calaisCollection.find({forArticle: articleId})
        if (queryResult.length === 1) {
            return queryResult[0]
        } else if (queryResult.lenght < 1) {
            LOGGER.warn(`No storage entry for article ${articleId}`)
        } else {
            LOGGER.warn(`Storage entries for article ${articleId} are ambiguous`)
        }
        return null
    }

    this.fetchFromApi = function (articleId, fullText) {

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
            }, (error, response, responseBody) => {
    
                if (error) {
                    LOGGER.error(error.message)
                    reject(error)
                    return
                }
    
                let body = JSON.parse(responseBody)
    
                if (response.statusCode !== 200) {
                    let statusMessage = response.statusMessage
                    let reason = (body.fault) ? body.fault.faultstring : 'Reason unknown'
                    let errorMessage = `${statusMessage}: ${reason}`
                    LOGGER.error(errorMessage)
                    reject(new Error(errorMessage))
                    return
                }
    
                // Everything ok, start processing the response
                let dbEntry = groupObjectList(body, '_typeGroup', false)
                let entitiesByType = groupObjectList(dbEntry.entities, '_type', true)
                dbEntry.entities = entitiesByType
                let relationsByType = groupObjectList(dbEntry.relations, '_type', true)
                dbEntry.relations = relationsByType
    
                delete dbEntry.language
                delete dbEntry.versions
    
                dbEntry.forArticle = articleId
    
                // Update the storage
                this.calaisCollection.removeWhere({forArticle: articleId})
                this.calaisCollection.insert(dbEntry)
                let article = this.articleCollection.findOne({$loki: articleId})
                article.calaisTags = true
                this.articleCollection.update(article)
                this.db.saveDatabase(err => {
                    if (err) {
                        reject(err)
                        return
                    }
                    LOGGER.info(`Stored about ${Object.keys(body).length - 3} tags for article $${articleId} successfully`)
                    resolve()
                })
            })
        })
    }
}