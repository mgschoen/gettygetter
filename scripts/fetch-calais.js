const Mongo = require('../modules/db/mongo')
const Calais = require('../modules/calais/calais')
const Logger = require('../modules/logger')
const LOGGER = new Logger('fetch-calais')

let mongo = new Mongo()
mongo.init().then(async () => {
    
    let articlesCursor = await mongo.getArticles({}, null, true)
    let CalaisInterface = new Calais(mongo)

    let total = await articlesCursor.count()
    let current = 0

    while (await articlesCursor.hasNext()) {
        current++
        let article = await articlesCursor.next()
        let articleId = article._id.toString()
        LOGGER.info(`Checking article ${current}/${total} (${articleId})`)
        let existingCalais = await CalaisInterface.getFromStorage(articleId)
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
                    await CalaisInterface.fetchFromApi(articleId, fullText)
                    break
                } catch (error) {
                    LOGGER.error(error.message)
                }
            }
        } else {
            LOGGER.info(`Skipping article because tags are already stored`)
        }
    }

    process.exit()

})