const { MongoClient, ObjectId } = require('mongodb')

const Logger = require('../logger')
const LOGGER = new Logger('mongo')

const {
    MONGO_HOST,
    MONGO_PORT,
    MONGO_DB,
    MONGO_REQUIRED_COLLECTIONS,
    ARTICLE_REQUIRED_FIELDS,
    KEYWORD_REQUIRED_FIELDS
} = require('../../config/main.config')

function validateId (id) {
    let queryId = null
    if (typeof id === 'string') {
        try {
            queryId = ObjectId(id)
        } catch (error) {
            LOGGER.error(error.message)
            return null
        }
    } else if (id instanceof ObjectId) {
        queryId = id
    } else {
        LOGGER.error(`Invalid argument id: ${id} (must be of type 'string' or instance of ObjectId)`)
        return null
    }
    return queryId
}

function validateObject (object, requiredFields) {
    let missingFields= []
    for (let field of requiredFields) {
        if (!object.hasOwnProperty(field)) {
            missingFields.push(field)
        }
    }
    if (missingFields.length > 0) {
        return {
            valid: false,
            missingFields
        }
    }
    return {valid: true}
}

function sanitizeSingleResult (doc, includeId) {
    if (!doc)
        return null
    let copy = {...doc}
    if (includeId) {
        copy._id = copy._id.toString()
    } else {
        delete copy._id
    }
    return copy
}

async function sanitizeResultCursor (cursor, includeIds) {
    return await cursor.map(doc => {
        return sanitizeSingleResult(doc, includeIds)
    }).toArray()
}

function Mongo () {
    this.db = null
    this.collections = {}
    for (let collectionName of MONGO_REQUIRED_COLLECTIONS) {
        this.collections[collectionName] = null
    }
}

Mongo.prototype.init = async function () {
    let connectionString = `mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`
    LOGGER.log(`Connecting to MongoDB instance ${connectionString} ...`)
    let client = await MongoClient.connect(connectionString, {useNewUrlParser: true})
    this.db = client.db()
    for (let collectionName of MONGO_REQUIRED_COLLECTIONS) {
        let collection = await this.db.collection(collectionName)
        if (collection) {
            this.collections[collectionName] = collection
        } else {
            this.collections[collectionName] = await this.db.createCollection(collectionName)
        }
    }
    LOGGER.log('Connected.')
}

Mongo.prototype.getArticle = async function (id) {
    
    // validate id
    let queryId
    if (!(queryId = validateId(id)))
        return null

    // query article
    let article = await this.collections.articles.findOne({_id: queryId})
    article._id = article._id.toString()

    // query for keywords
    if (article.leadImage) {
        let keywordIds = [...article.leadImage.keywords]
        article.leadImage.keywords = await this.getKeywords(keywordIds)
    }

    // query for calais entry
    let calais = await this.collections.calais.findOne({forArticle: id})
    if (calais) {
        let calaisCopy = {...calais}
        delete calaisCopy._id
        delete calaisCopy.forArticle
        article.calais = calaisCopy
    }

    return article
}

Mongo.prototype.getArticleWithUrl = async function (url) {
    return sanitizeSingleResult(await this.collections.articles.findOne({url}), true)
}

Mongo.prototype.getArticles = async function (customQuery, filterFunction) {
    let query = customQuery || {}
    let filter = typeof filterFunction === 'function' ? filterFunction : doc => doc
    let result = await this.collections.articles.find(query)
    let sanitized = await sanitizeResultCursor(result, true)
    return sanitized.filter(filter)
}

Mongo.prototype.insertArticle = async function (articleObject) {
    // validate article object
    let validation = validateObject(articleObject, ARTICLE_REQUIRED_FIELDS)
    if (!validation.valid) {
        LOGGER.error(`Cannot store article. Missing fields: ${validation.missingFields}`)
        return null
    }

    let existingArticle = await this.getArticleWithUrl(articleObject.url)
    if (existingArticle) {
        LOGGER.error(`Cannot store article. Article with url ${articleObject.url} already ` +
            `exists: ${existingArticle._id}`)
        return null
    }

    // store the article
    try {
        let { insertedId } = await this.collections.articles.insertOne(articleObject)
        return insertedId.toString()
    } catch (error) {
        LOGGER.error(error.message)
        return null
    }
}

Mongo.prototype.updateArticle = async function (id, updateOperations) {
    // validate id
    let queryId
    if (!(queryId = validateId(id)))
        return null

    let update = await this.collections.articles.updateOne({_id: queryId}, updateOperations)
    if (update.result.ok) {
        return true
    } else {
        LOGGER.error(`Article update not successful`)
        return null
    }
}

Mongo.prototype.getKeyword = async function (id) {
    // validate id
    let queryId
    if (!(queryId = validateId(id)))
        return null

    // query keyword
    let keyword = await this.collections.keywords.findOne({_id: queryId})
    keyword._id = keyword._id.toString()

    return keyword
}

Mongo.prototype.getKeywordWithGettyId = async function (gettyId) {
    let result = await this.collections.keywords.findOne({keyword_id: gettyId})
    if (result) {
        return sanitizeSingleResult(result, true)
    }
    return null
}

Mongo.prototype.getKeywords = async function (keywordIds) {

    // validate ids
    let queryIds = []
    for (let inputId of keywordIds) {
        let validatedId
        if (!(validatedId = validateId(inputId))) 
            return null
        queryIds.push(validatedId)
    }

    // query
    let keywords = await this.collections.keywords.find({_id: {$in: queryIds}})
    return await sanitizeResultCursor(keywords)
}

Mongo.prototype.getKeywordsWithString = async function (text) {
    let result = await this.collections.keywords.find({text})
    return await sanitizeResultCursor(result, true)
}

Mongo.prototype.insertKeyword = async function (keywordObject) {
    // validate keyword object
    let validation = validateObject(keywordObject, KEYWORD_REQUIRED_FIELDS)
    if (!validation.valid) {
        LOGGER.error(`Cannot store keyword. Missing fields: ${validation.missingFields}`)
        return null
    }

    // insert
    try {
        let { insertedId } = await this.collections.keywords.insertOne(keywordObject)
        return insertedId.toString()
    } catch (error) {
        LOGGER.error(error.message)
        return null
    }
}

Mongo.prototype.insertKeywordWithString = async function (text) {
    let existingTerms = await this.getKeywordsWithString(text)
    if (existingTerms.length === 0) {
        let keywordId = await this.insertKeyword({
            text: text,
            type: 'Unknown',
            relevance: null
        })
        return keywordId
    } else if (existingTerms.length === 1) {
        return existingTerms[0]._id
    }
    return null
}

Mongo.prototype.insertKeywordWithObject = async function (keyword) {
    let identical = await this.getKeywordWithGettyId(keyword.keyword_id)
    if (identical) {
        // Keyword is already in collection
        return identical._id
    }
    let sameText = await this.getKeywordsWithString(keyword.text)
    for (let entry of sameText) {
        if (!entry.keyword_id) {
            // A scraped version of this keyword exists.
            // Update it with all the details we now know.
            let updateOperations = {}
            for (let key in keyword) {
                updateOperations[key] = keyword[key]
            }
            await this.collections.keywords.updateOne({_id: ObjectId(entry._id)}, {$set: updateOperations})
            return entry._id
        }
    }
    // Neither the identical nor a scraped version of this
    // keyword exists. Let's store it in a new object.
    let newKeywordId = await this.insertKeyword(keyword)
    return newKeywordId
}

Mongo.prototype.insertCalais = async function (calaisObject, forArticle) {
    if (Array.isArray(calaisObject)) {
        LOGGER.error(`calaisObject must not be an Array`)
        return null
    }
    if (!forArticle) {
        LOGGER.error(`Missing argument: forArticle`)
        return null
    }

    // check if referenced article exists
    let article = await this.getArticle(forArticle)
    if (article) {

        // check if calais tags were already stored
        let articleId = validateId(forArticle)
        let articleIdString = articleId.toString()
        let existingCalais = await this.collections.calais.findOne({forArticle: articleIdString})
        if (existingCalais) {
            LOGGER.error(`Cannot store calais tags: Calais tags for article with id ${articleIdString} already exist`)
            return null
        }

        // Insert calais object
        calaisObject.forArticle = articleIdString
        let { insertedId } = await this.collections.calais.insertOne(calaisObject)
        return insertedId.toString()
        
    } else {
        LOGGER.error(`Cannot store calais tags for article with id ${forArticle}: Article does not exist`)
        return null
    }
}

module.exports = Mongo