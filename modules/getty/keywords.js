const Logger = require('../logger')

/**
 * Interface for interacting with the 'keywords' collection in the database
 * @param {object} database Loki.js database
 */
module.exports = function (database) {
    
    this.db = database
    this.collection = this.db.getCollection('keywords')
    if (!this.collection) {
        this.collection = this.db.addCollection('keywords')
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
        return this.collection.findOne({keyword_id: id})
    }

    /**
     * Attempts to insert a new keyword object with the specified
     * string as text. Will not insert anything if the specified
     * term already exists in the collection.
     * @param {string} text text for the new keyword
     * @returns {number|null} Loki id of the inserted or existing keyword,
     *      null if existing entries were ambiguous
     */
    this.insertWithString = function (text) {
        let existingTerms = this.fetchWithString(text)
        if (existingTerms.length === 0) {
            let keyword = this.collection.insert({
                text: text,
                type: 'Unknown',
                relevance: null
            })
            this.db.saveDatabase()
            return keyword.$loki
        } else if (existingTerms.length === 1) {
            return existingTerms[0].$loki
        }
        return null
    }

    /**
     * Attempts to insert a new keyword object into the collection.
     * Will update any entry that matches the text of the new keyword
     * but has no keyword_id. Will not insert anything if keyword_id
     * already exists in collection.
     * @param {object} keyword object representing a Getty keyword, must have at least
     *      the following fields specified:
     *      {
     *          "keyword_id": "123455",
     *          "text": "San Diego Comic-Con"
     *      }
     * @returns {number} Loki id of existing, updated or inserted keyword
     */
    this.insertWithObject = function (keyword) {
        if (!keyword.keyword_id || !keyword.text) {
            new Logger('keywords', 'insertWithObject')
                .info(`Rejecting a keyword with keyword_id:${keyword.keyword_id} and text:${keyword.text}`)
            return null
        }
        let identical = this.fetchWithId(keyword.keyword_id)
        if (identical) {
            // Keyword is already in collection
            return identical.$loki
        }
        let sameText = this.fetchWithString(keyword.text)
        for (let entry of sameText) {
            if (!entry.keyword_id) {
                // A scraped version of this keyword exists.
                // Update it with all the details we now know.
                for (let key in keyword) {
                    entry[key] = keyword[key]
                }
                this.collection.update(entry)
                this.db.saveDatabase()
                return entry.$loki
            }
        }
        // Neither the identical nor a scraped version of this
        // keyword exists. Let's store it in a new object.
        let newKeyword = this.collection.insert(keyword)
        this.db.saveDatabase()
        return newKeyword.$loki
    }

}