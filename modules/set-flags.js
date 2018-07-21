const Util = require('./util')

function setFlags (db) {

    return new Promise((resolve, reject) => {

        let collection = db.getCollection('articles')
        if (!collection) {
            reject(new Error('No collection named "articles" found in database'))
            return
        }

        // Use collection.where query as a substitute for forEach
        collection.where(doc => {
            // reset incorrectly set flags from earlier versions
            delete doc.gettyID
            delete doc.containsGettyID
            delete doc.containsGettyIDInLeadImage
            
            let foundGettyID = false,
                foundGettyIDInLeadImage = false
            // check teaser image
            if (doc.teaser.img) {
                let teaserImageID = Util.extractGettyID(doc.teaser.img.src)
                if (teaserImageID) {
                    foundGettyID = true
                    foundGettyIDInLeadImage = true
                    doc.teaser.img.gettyID = teaserImageID
                }
            }
            // check all images within article
            for (let i in doc.article.images) {
                let image = doc.article.images[i]
                let imageGettyID = Util.extractGettyID(image.src)
                if (imageGettyID) {
                    foundGettyID = true
                    image.gettyID = imageGettyID
                    if (i == 0) {
                        foundGettyIDInLeadImage = true
                    }
                }
            }
            // update doc
            if (foundGettyID) {
                doc.containsGettyID = true
            }
            if (foundGettyIDInLeadImage) {
                doc.containsGettyIDInLeadImage = true
            }
            collection.update(doc)
        })
        
        db.saveDatabase()

        resolve()
    })
}

module.exports = { setFlags }