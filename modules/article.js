const request = require('request')
const { JSDOM } = require('jsdom')

const Logger = require('./logger')

const { BBC_BASEURL } = require('../config/main.config')

let getArticleContent = articleObject => {
    let LOGGER = new Logger('article', articleObject.url || 'unknown')

    return new Promise((resolve, reject) => {
        if (!articleObject.hasOwnProperty('url')) {
            reject(new Error('articleObject must have url specified'))
            return
        }

        LOGGER.log('Scraping ARTICLE ...')

        request(BBC_BASEURL + articleObject.url, (err, res, body) => {
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

            const story = document.querySelector('.story-body')
            let headline, content, paragraphs, figures, images
            if (story) {
                headline = story.querySelector('.story-body__h1')
                content = story.querySelector('.story-body__inner')
            } else {
                LOGGER.info('Skippped article because it does not contain element with class `story-body`')
                resolve()
            }
            if (content) {
                paragraphs = content.querySelectorAll('p, ul li')
                figures = content.querySelectorAll('figure')
                images = []

                for (let fig of figures) {
                    let distinct = fig.firstElementChild
                    let distinctClassNames = distinct ? distinct.className : null
                    if (distinctClassNames && 
                        distinctClassNames.indexOf('image-and-copyright-container') >= 0) {
                            let img = distinct.querySelector('img')
                            let imgPlaceholder = distinct.querySelector('.js-delayed-image-load')
                            let imgCaption = distinct.querySelector('figcaption .media-caption__text')
                            let imgCopyright = distinct.querySelector('.story-image-copyright')
                            let imgObject = {}
                            if (img) {
                                imgObject.src = img.getAttribute('src')
                            } else if (imgPlaceholder) {
                                imgObject.src = imgPlaceholder.getAttribute('data-src')
                            }
                            if (imgObject.hasOwnProperty('src')) {
                                if (imgCaption) {
                                    imgObject.caption = imgCaption.textContent
                                }
                                if (imgCopyright) {
                                    imgObject.copyright = imgCopyright.textContent
                                }
                                images.push(imgObject)
                            } else {
                                LOGGER.info('Skipped figure because image URL could not be determined')
                            }
                    } else {
                        LOGGER.info(`Skipped figure with unknown distinct className "${distinctClassNames}"`)
                    }
                }

                if (headline) {
                    articleObject.article = {
                        headline: headline.textContent,
                        images: images,
                        paragraphs: []
                    }
                    for (let p of paragraphs) {
                        articleObject.article.paragraphs.push(p.textContent)
                    }
                    resolve(articleObject)
                } else {
                    LOGGER.info('Skipped article because it does not contain element with class `story-body__h1`')
                    resolve()
                }
            } else {
                LOGGER.info('Skippped article because it does not contain element with class `.story-body__inner`')
                resolve()
            }
            
        })
    })
}

module.exports = { getArticleContent }