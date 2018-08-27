const DB = require('../modules/db/loki')
const Mongo = require('../modules/db/mongo')
const Logger = require('../modules/logger')
const LOGGER = new Logger('refactor-teaser-image')

let mongo = new Mongo()
mongo.init().then(async () => {
    let articlesWithOldImageFormat = 
        await mongo.collections.articles.find({ $and: [ 
            {'teaser.img': {$exists: true}}, 
            {'teaser.img': {$type: 'string'}} 
        ]}, null, true)
    LOGGER.log(`Refactoring ${await articlesWithOldImageFormat.count()} articles`)
    while (await articlesWithOldImageFormat.hasNext()) {
        let article = await articlesWithOldImageFormat.next()
        let teaserImageUrl = article.teaser.img
        LOGGER.log(`Refactoring teaser image: ${teaserImageUrl}`)
        await mongo.updateArticle(article._id, {$set: {'teaser.img': { url: teaserImageUrl }}})
    }
    process.exit()
})