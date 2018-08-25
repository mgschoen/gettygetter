const APP_ROOT = require('app-root-path')

module.exports = {
    BBC_BASEURL: 'https://www.bbc.com',
    BBC_SECTION_URLS: [
        '/news/world',
        '/news/world/africa',
        '/news/world/asia',
        '/news/world/asia/china',
        '/news/world/asia/india',
        '/news/world/australia',
        '/news/world/europe',
        '/news/world/latin_america',
        '/news/world/middle_east',
        '/news/world/us_and_canada',
        '/news/uk',
        '/news/england',
        '/news/england/cumbria',
        '/news/england/lancashire',
        '/news/england/merseyside',
        '/news/england/manchester',
        '/news/england/tees',
        '/news/england/tyne_and_wear',
        '/news/england/humberside',
        '/news/england/leeds_and_west_yorkshire',
        '/news/england/lincolnshire',
        '/news/england/south_yorkshire',
        '/news/england/york_and_north_yorkshire',
        '/news/england/birmingham_and_black_country',
        '/news/england/coventry_and_warwickshire',
        '/news/england/hereford_and_worcester',
        '/news/england/shropshire',
        '/news/england/stoke_and_staffordshire',
        '/news/england/derbyshire',
        '/news/england/leicester',
        '/news/england/northamptonshire',
        '/news/england/nottingham',
        '/news/england/bristol',
        '/news/england/cornwall',
        '/news/england/devon',
        '/news/england/gloucestershire',
        '/news/england/somerset',
        '/news/england/wiltshire',
        '/news/england/beds_bucks_and_herts',
        '/news/england/cambridgeshire',
        '/news/england/essex',
        '/news/england/norfolk',
        '/news/england/suffolk',
        '/news/england/berkshire',
        '/news/england/dorset',
        '/news/england/hampshire',
        '/news/england/oxford',
        '/news/england/kent',
        '/news/england/london',
        '/news/england/surrey',
        '/news/england/sussex',
        '/news/world/europe/isle_of_man',
        '/news/world/europe/guernsey',
        '/news/world/europe/jersey',
        '/news/northern_ireland',
        '/news/northern_ireland/northern_ireland_politics',
        '/news/scotland',
        '/news/scotland/scotland_politics',
        '/news/scotland/scotland_business',
        '/news/scotland/edinburgh_east_and_fife',
        '/news/scotland/glasgow_and_west',
        '/news/scotland/highlands_and_islands',
        '/news/scotland/north_east_orkney_and_shetland',
        '/news/scotland/south_scotland',
        '/news/scotland/tayside_and_central',
        '/news/wales',
        '/news/wales/wales_politics',
        '/news/wales/north_west_wales',
        '/news/wales/north_east_wales',
        '/news/wales/mid_wales',
        '/news/wales/south_west_wales',
        '/news/wales/south_east_wales',
        '/news/politics',
        '/news/business',
        '/news/business/companies',
        '/news/business/business_of_sport',
        '/news/business/economy',
        '/news/technology',
        '/news/science_and_environment',
        '/news/entertainment_and_arts',
        '/news/health'
    ],
    GETTYAPI_DEFAULT_FIELDS: [
        'detail_set',
        'comp',
        'date_camera_shot',
        'editorial_source',
        'entity_details',
        'keywords',
        'links',
        'people',
        'preview',
        'thumb'
    ],
    GETTYUI_IMAGEDETAIL_BASEURL: 'https://www.gettyimages.co.uk/license/',
    STORAGE_PATH: APP_ROOT + '/data/',
    STORAGE_FILENAME: 'recover.storage.json',
    CALAIS_BASEURL: 'https://api.thomsonreuters.com/permid/calais',
    MONGO_HOST: 'localhost',
    MONGO_PORT: '27017',
    MONGO_DB: 'picpic',
    MONGO_REQUIRED_COLLECTIONS: ['articles', 'keywords', 'calais'],
    ARTICLE_REQUIRED_FIELDS: ['teaser', 'section', 'url', 'article'],
    KEYWORD_REQUIRED_FIELDS: ['text', 'type']
}