const Base = require('./Base')

class K360academydata extends Base {
  static get tableName () {
    return 'k360academydata'
  }

  static get idPrefix () {
    return 'k360'
  }

  static get jsonSchema () {
    return {
      type: 'object',
      properties: {
        id: {
          type: 'string'
        },
        myData: {
          type: 'string',
          default: 'algo'
        },
        platformData: {
          type: 'object',
          default: {}
        }
      }
    }
  }

  static getAccessFields (access) {
    const accessFields = {
      api: [
        'id',
        'createdDate',
        'updatedDate',
        'name',
        'myData',
        'metadata',
        'platformData',

        'livemode' // added in the expose function
      ]
    }

    return accessFields[access]
  }
}

module.exports = K360academydata
