
/**
 * Interface for interacting with the 'keywords' collection in the database
 * @param {object} db Loki.js database
 */
module.exports = function (db) {
    
    this.collection = db.getCollection('keywords')
    if (!this.collection) {
        db.addCollection('keywords')
    }

    /**
     * Checks if the specified term is included in the collection
     * @param {string} term 
     * @returns {boolean}
     */
    this.hasTerm = function (term) {
        return this.collection.find({text: term}).lenght > 0
    }

    /**
     * Returns all keywords from the collection whose text matches
     * the specified string
     * @param {string} string 
     * @returns {array}
     */
    this.fetchWithString = function (string) {
        return this.collection.find({text: string})
    }

    /**
     * Returns the keyword with the specified id, if it exists
     * @param {string} id 
     * @returns {object|null} keyword, null if it does not exist
     */
    this.fetchWithId = function (id) {
        return this.collection.findOne({gettyID: id})
    }

    /**
     * Attempts to insert a new keyword object with the specified
     * string as text. If such entries already exist, returns
     * all existing keywords with the specified text
     * @param {string} text text for the new keyword
     * @returns {object|array} new keyword if successfully inserted, otherwise
     *      list of all existing keywords with the specified text
     */
    this.insertWithString = function (text) {
        let existingTerms = this.fetchWithString(text)
        if (existingTerms.length === 0) {
            return this.collection.insert({
                text: text,
                type: 'Unknown',
                relevance: null
            })
        }
        return existingTerms
    }

    /**
     * Attempts to insert a new keyword object into the collection.
     * If the specified 'id' field already exists in the database,
     * no changes are made and the existing object is returned
     * @param {object} keyword object representing a Getty keyword, must have at least
     *      the following fields specified:
     *      {
     *          "id": "123455",
     *          "text": "San Diego Comic-Con"
     *      }
     * @returns {object} inserted or existing keyword object
     */
    this.insertWithObject = function (keyword) {
        if (!keyword.id || !keyword.text) {
            throw new Error(`keyword object must have at least 'id' and 'text' specified`)
            return null
        }
        let existing = this.fetchWithId(keyword.id)
        if (!existing) {
            let insertObject = {...keyword}
            insertObject.gettyID = keyword.id
            delete insertObject.id
            return this.collection.insert(insertObject)
        }
        return existing
    }

}