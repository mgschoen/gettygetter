const Loki = require('lokijs')
const lfsa = require('lokijs/src/loki-fs-structured-adapter')

const Logger = require('../logger')
const LOGGER = new Logger('db')

const { 
    STORAGE_PATH,
    STORAGE_FILENAME
} = require('../../config/main.config')

function init () {
    return new Promise((resolve, reject) => {

        function initCollections () {
            let collection = db.getCollection('articles')
            if (!collection) {
                collection = db.addCollection('articles')
            }
            resolve(db)
        }

        let adapter, db

        // Initialise database
        LOGGER.info(`Initialising database from file ${STORAGE_PATH + STORAGE_FILENAME}`)
        try {
            adapter = new lfsa()
            db = new Loki(STORAGE_PATH + STORAGE_FILENAME, {
                adapter: adapter,
                autoload: true,
                autoloadCallback: initCollections
            })
        } catch (e) {
            reject(e)
        }
    })
}

module.exports = init