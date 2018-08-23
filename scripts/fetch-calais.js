const DB = require('../modules/db')
const Calais = require('../modules/calais/calais')
const Logger = require('../modules/logger')
const LOGGER = new Logger('fetch-calais')

DB().then(async db => {
    
    let collection = db.getCollection('articles')
    let allArticles = collection.find()
    let CalaisInterface = new Calais(db)

    for (let article of allArticles) {
        if (!article.calaisTags) {
            let paragraphs = article.article.paragraphs
            paragraphs.unshift({
                type: 'H1',
                content: `${article.article.headline}.`
            })
            let fullText = paragraphs.reduce((acc, cur) => `${acc} ${cur.content}`, '')
            try {
                await CalaisInterface.fetchFromApi(article.$loki, fullText)
            } catch (error) {
                LOGGER.error(`Script interrupted`)
                process.exit(1)
            }
        } else {
            LOGGER.info(`Skipping article $${article.$loki} because tags are already stored`)
        }
    }

})