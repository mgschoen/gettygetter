const DB = require('../modules/db/loki')
const Calais = require('../modules/calais/calais')
const Logger = require('../modules/logger')
const LOGGER = new Logger('fetch-calais')

DB().then(async db => {
    
    let articleCollection = db.getCollection('articles')
    let allArticles = articleCollection.find()
    let calaisCollection = db.getCollection('calais')
    let CalaisInterface = new Calais(db)

    for (let article of allArticles) {
        let articleId = article.$loki
        let existingCalais = calaisCollection.findOne({forArticle: articleId})
        if (!existingCalais) {
            let paragraphs = [...article.article.paragraphs]
            paragraphs.unshift({
                type: 'H1',
                content: `${article.article.headline}.`
            })
            let fullText = paragraphs.reduce((acc, cur) => `${acc} ${cur.content}`, '')
            for (let iteration = 1; iteration < 4; iteration++) {
                if (iteration > 1) {
                    LOGGER.info(`Trying again (iteration ${iteration}/3)...`)
                }
                try {
                    await CalaisInterface.fetchFromApi(article.$loki, fullText)
                    break
                } catch (error) {
                    LOGGER.error(error.message)
                }
            }
        } else {
            LOGGER.info(`Skipping article $${article.$loki} because tags are already stored`)
        }
    }

})