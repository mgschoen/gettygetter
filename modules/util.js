const GETTY_REGEX = /_\d+_gettyimages-\d+\.(jpg|jpeg|JPG|JPEG|png|PNG|gif|GIF)/

function extractGettyID (imageURL) {
    // Does URL match Getty pattern?
    let filename = imageURL.split('/').pop()
    if (GETTY_REGEX.test(filename)) {
        let gettyID = filename.split(/_gettyimages-|\./g)[1]
        return gettyID
    }
    return null
}

/**
 * A dictionary in the sense of this function is an object literal
 * of the following structure: { group1: [...], group2: [] },
 * where each property represents a group of items. This method
 * inserts an item into an existing group or creates a new group
 * if the specified group does not exist.
 * @param {object} dictionary 
 * @param {string} groupString 
 * @param {*} item 
 */
function insertToDictionary (dictionary, groupString, item) {
    if (dictionary[groupString]) {
        dictionary[groupString].push(item)
    } else {
        dictionary[groupString] = [item]
    }
    return dictionary
}

module.exports = {
    extractGettyID,
    insertToDictionary
}