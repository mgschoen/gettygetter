const request = require('request')
const { JSDOM } = require('jsdom')

const Logger = require('../logger')

const { GETTYUI_IMAGEDETAIL_BASEURL } = require('../../config/main.config')

let getImageMetaFromWebpage = imageId => {
    let LOGGER = new Logger('getty/scraper')

    return new Promise((resolve, reject) => {

        LOGGER.log(`Scraping IMAGE ${imageId} ...`)

        request(GETTYUI_IMAGEDETAIL_BASEURL + imageId, (err, res, body) => {
            if (err) {
                reject(err)
                return
            }

            if (res.statusCode !== 200) {
                reject(new Error('Status code' + res.statusCode + ':' + res.statusMessage))
                return
            }

            const dom = new JSDOM(body)
            const document = dom.window.document

            // description
            let assetDescription = document.querySelector('.asset-description')
            let title = assetDescription.querySelector('.asset-title').textContent
            let captionElement = assetDescription.querySelector('.asset-caption')
            let caption = captionElement ? captionElement.textContent : ''

            // image url
            let imageWrapper = document.querySelector('.image-wrapper')
            let url = imageWrapper.querySelector('img').getAttribute('src')

            // keywords
            let keywordsContainer = document.querySelector('.keywords')
            let keywordLinks = keywordsContainer.querySelectorAll('li.keyword a')
            let keywords = []
            for (let keyword of keywordLinks) {
                keywords.push(keyword.textContent)
            }

            resolve({
                id: imageId,
                title: title,
                caption: caption,
                keywords: keywords,
                url: url
            })
        })
    })
}

module.exports = { getImageMetaFromWebpage }
