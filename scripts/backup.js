const fs = require('fs')

const Logger = require('../modules/logger')
const LOGGER = new Logger('backup')

const { STORAGE_PATH, STORAGE_FILENAME } = require('../config/main.config')

let BACKUP_PATH = process.env.GETTYGETTER_BACKUP_PATH

if (!BACKUP_PATH) {
    LOGGER.error('No backup path specified in environment variable GETTYGETTER_BACKUP_PATH. Exiting.')
    process.exit(1)
}

if (BACKUP_PATH[BACKUP_PATH.length - 1] !== '/') {
    BACKUP_PATH += '/'
}

let date = new Date()
// 2018-6-15-18-45-12-234
let datePrefix = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}-${date.getHours()}-` + 
    `${date.getMinutes()}-${date.getSeconds()}-${date.getMilliseconds()}`

let allFiles = fs.readdirSync(STORAGE_PATH)
let storageFiles = allFiles.filter(filename => {
    return filename.indexOf(STORAGE_FILENAME) === 0
})

LOGGER.log(`Creating backup ${datePrefix} in ${BACKUP_PATH} ...`)

for (let filename of storageFiles) {
    LOGGER.log(`Copying file ${filename}`)
    fs.copyFileSync(STORAGE_PATH + filename, BACKUP_PATH + datePrefix + '.' + filename)
}
LOGGER.log('Done.')