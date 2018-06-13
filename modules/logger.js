const colors = require('colors')

module.exports = function (context, entityName) {
    if (!context || typeof context !== 'string') {
        throw new Error('Logger must be initialised with a context designator of type string')
    }

    if (entityName && typeof entityName !== 'string') {
        throw new Error('Failed to initialise logger: entityName must be of type string')
    }
    
    this.context = context
    this.entityName = entityName ? entityName : null

    this.log = message => {
        if (this.entityName) {
            console.log(`${colors.green(new Date())} [LOG] ${this.context.blue} - ${this.entityName.cyan} - ${message}`)
        } else {
            console.log(`${colors.green(new Date())} [LOG] ${this.context.blue} - ${message}`)
        }
    }

    this.info = message => {
        if (this.entityName) {
            console.log(`${colors.green(new Date())} [INFO] ${this.context.blue} - ${this.entityName.cyan} - ${message.yellow}`)
        } else {
            console.log(`${colors.green(new Date())} [INFO] ${this.context.blue} - ${message.yellow}`)
        }
    }

    this.warn = message => {
        if (this.entityName) {
            console.log(`${colors.green(new Date())} [WARN] ${this.context.blue} - ${this.entityName.cyan} - ${message.magenta}`)
        } else {
            console.log(`${colors.green(new Date())} [WARN] ${this.context.blue} - ${message.magenta}`)
        }
    }

    this.error = message => {
        if (this.entityName) {
            console.log(`${colors.green(new Date())} [ERROR] ${this.context.blue} - ${this.entityName.cyan} - ${message.red}`)
        } else {
            console.log(`${colors.green(new Date())} [ERROR] ${this.context.blue} - ${message.red}`)
        }
    }
}