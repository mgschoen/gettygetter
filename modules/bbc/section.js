const request = require('request')
const { JSDOM } = require('jsdom')
const Logger = require('../logger')

let getArticleTeasers = (url, sectionName) => {
    let LOGGER = new Logger('section', sectionName)

    return new Promise((resolve, reject) => {
        LOGGER.log(`Scraping SECTION "${sectionName}" (${url}) ...`)

        request(url, (err, res, body) => {

            if (err) {
                reject(err)
                return
            }
    
            if (res.statusCode !== 200) {
                reject(new Error('Status code' + res.statusCode + ':' + res.statusMessage))
                return
            }
    
            const dom = new JSDOM(body, {pretendToBeVisual: true, resources: 'usable'})
            const document = dom.window.document
    
            let container = document.querySelector('.container')
            let teasers = container.querySelectorAll('.albatross-item, .buzzard-item, .skylark-item, ' +
                '.cormorant-item, .pigeon-item, .macaw-item, .robin-item')

            let result = []
    
            for (let teaser of teasers) {
                let articleObject = { teaser : {}, section: sectionName }
                let classNames = teaser.classList
                if (classNames.contains('albatross-item')) {
                    articleObject.teaser.type = 'albatross'
                } else if (classNames.contains('buzzard-item')) {
                    articleObject.teaser.type = 'buzzard'
                } else if (classNames.contains('skylark-item')) {
                    articleObject.teaser.type = 'skylark'
                } else if (classNames.contains('cormorant-item')) {
                    articleObject.teaser.type = 'cormorant'
                } else if (classNames.contains('pigeon-item')) {
                    articleObject.teaser.type = 'pigeon'
                } else if (classNames.contains('macaw-item')) {
                    articleObject.teaser.type = 'macaw'
                } else if (classNames.contains('robin-item')) {
                    articleObject.teaser.type = 'robin'
                } else {
                    articleObject.teaser.type = 'unknown'
                }
    
                let titleLink = teaser.querySelector('.title-link')
                if (titleLink) {
                    articleObject.url = titleLink.getAttribute('href')
                    articleObject.teaser.headline = titleLink.querySelector('.title-link__title-text').textContent.trim()
                }

                let img = teaser.querySelector('img')
                let imgPlaceholder = teaser.querySelector('.js-delayed-image-load')
                let imgurl
                if (img) {
                    imgurl = img.getAttribute('src')
                } else if (imgPlaceholder) {
                    imgurl = imgPlaceholder.getAttribute('data-src')
                }
                if (imgurl) {
                    articleObject.teaser.img = { src: imgurl }
                }

                result.push(articleObject)
            }
            resolve(result)
        })
    })
}

module.exports = { getArticleTeasers }