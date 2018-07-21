const DB = require('../modules/db')
const Logger = require('../modules/logger')
const LOGGER = new Logger('refactor-reaser-image')

DB().then(db => {
    let collection = db.getCollection('articles')
    collection.updateWhere(doc => {
        let teaserImage = doc.teaser.img
        if (teaserImage && typeof teaserImage === 'string') {
            LOGGER.log(`Refactoring teaser image: ${teaserImage}`)
            return true
        }
        return false
    }, doc => {
        let imgurl = doc.teaser.img
        doc.teaser.img = { src: imgurl }
        console.log(doc)
        return doc
    })

    db.saveDatabase()
}).catch(e => {
    LOGGER.warn(e.message)
})