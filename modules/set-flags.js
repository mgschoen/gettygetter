const Util = require('./util')

const REQUIRED_OPERATIONS = [
    'containsGettyID', 
    'containsGettyIDInLeadImage', 
    'teaser.img.gettyID', 
    'gettyID'
]

function setFlags (mongo) {

    return new Promise((resolve, reject) => {

        let collection = mongo.collections.articles

        // Use collection.where query as a substitute for forEach
        collection.find().forEach(async doc => {

            let setOperations = {}
            let unsetOperations = {}
            
            let foundGettyID = false,
                foundGettyIDInLeadImage = false
            // check teaser image
            if (doc.teaser.img) {
                let teaserImageID = Util.extractGettyID(doc.teaser.img.src)
                if (teaserImageID) {
                    foundGettyID = true
                    foundGettyIDInLeadImage = true
                    setOperations['teaser.img.gettyID'] = teaserImageID
                }
            }
            // check all images within article
            for (let i in doc.article.images) {
                let image = doc.article.images[i]
                let imageGettyID = Util.extractGettyID(image.src)
                if (imageGettyID) {
                    foundGettyID = true
                    setOperations[`article.images.${i}.gettyID`] = imageGettyID
                    if (i == 0) {
                        foundGettyIDInLeadImage = true
                    }
                }
            }

            // update doc
            if (foundGettyID) {
                setOperations['containsGettyID'] = true
            }
            if (foundGettyIDInLeadImage) {
                setOperations['containsGettyIDInLeadImage'] = true
            }
            for (let operation of REQUIRED_OPERATIONS) {
                if (!setOperations.hasOwnProperty(operation)) {
                    unsetOperations[operation] = ''
                }
            }
            let allOperations = {}
            if (Object.keys(setOperations).length > 0) {
                allOperations['$set'] = setOperations
            }
            if (Object.keys(unsetOperations).length > 0) {
                allOperations['$unset'] = unsetOperations
            }
            await collection.updateOne({_id: doc._id}, allOperations)
        }, resolve)

    })
}

module.exports = { setFlags }