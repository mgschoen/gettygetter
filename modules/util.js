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

module.exports = {
    extractGettyID
}