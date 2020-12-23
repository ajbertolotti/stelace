const createError = require('http-errors')
const _ = require('lodash')

const { logError } = require('../../server/logger')
const { getModels } = require('../models')

const { getObjectId } = require('stelace-util-keys')

const { performListQuery } = require('../util/listQueryBuilder')

let responder
let subscriber
let publisher

function start ({ communication }) {
  const {
    getResponder,
    getSubscriber,
    getPublisher,
    COMMUNICATION_ID
  } = communication

  responder = getResponder({
    name: 'k360 Responder',
    key: 'k360'
  })

  subscriber = getSubscriber({
    name: 'k360 subscriber',
    key: 'k360',
    namespace: COMMUNICATION_ID,
    subscribesTo: [
      'k360Created',
      'k360Updated',
      'k360Deleted'
    ]
  })

  publisher = getPublisher({
    name: 'k360 publisher',
    key: 'k360',
    namespace: COMMUNICATION_ID
  })

  responder.on('list', async (req) => {
    const platformId = req.platformId
    const env = req.env
    const { K360 } = await getModels({ platformId, env })

    const {
      orderBy,
      order,

      nbResultsPerPage,

      // cursor pagination
      startingAfter,
      endingBefore,

      id,
      createdDate,
      updatedDate,
      parentId
    } = req

    const queryBuilder = K360.query()

    const paginationMeta = await performListQuery({
      queryBuilder,
      filters: {
        ids: {
          dbField: 'id',
          value: id,
          transformValue: 'array',
          query: 'inList'
        },
        createdDate: {
          dbField: 'createdDate',
          value: createdDate,
          query: 'range'
        },
        updatedDate: {
          dbField: 'updatedDate',
          value: updatedDate,
          query: 'range'
        },
        parentIds: {
          dbField: 'parentId',
          value: parentId,
          transformValue: 'array',
          query: 'inList'
        },
      },
      paginationActive: true,
      paginationConfig: {
        nbResultsPerPage,

        // cursor pagination
        startingAfter,
        endingBefore,
      },
      orderConfig: {
        orderBy,
        order
      },
      useOffsetPagination: false,
    })

    paginationMeta.results = K360.exposeAll(paginationMeta.results, { req })
    return paginationMeta
  })

  responder.on('read', async (req) => {
    const platformId = req.platformId
    const env = req.env
    const { K360 } = await getModels({ platformId, env })

    const k360Id = req.k360Id

    const myk360 = await K360.query().findById(k360Id)
    if (!myk360) {
      throw createError(404)
    }

    return K360.expose(myk360, { req })
  })

  responder.on('create', async (req) => {
    const platformId = req.platformId
    const env = req.env
    const { K360 } = await getModels({ platformId, env })

    const {
      name,
      parentId,
      metadata,
      platformData,
      myData
    } = req

    const myk360 = await K360.query().insert({
      id: await getObjectId({ prefix: K360.idPrefix, platformId, env }),
      name,
      parentId,
      metadata,
      platformData,
      myData
    })

    publisher.publish('k360Created', {
      myk360,
      eventDate: myk360.createdDate,
      platformId,
      env
    })

    return K360.expose(myk360, { req })
  })

  responder.on('update', async (req) => {
    const platformId = req.platformId
    const env = req.env
    const { K360 } = await getModels({ platformId, env })

    const k360Id = req.k360Id

    const fields = [
      'name',
      'parentId',
      'myData',
      'metadata',
      'platformData'
    ]

    const payload = _.pick(req, fields)

    const {
      myData,
      metadata,
      platformData
    } = payload

    const data = await K360.query()

    const indexedData = _.keyBy(data, 'id')

    let myK360 = indexedData[k360Id]
    if (!myK360) {
      throw createError(404)
    }

    const updateAttrs = _.omit(payload, ['metadata', 'platformData'])
    const updateAttrsBeforeFullDataMerge = Object.assign({}, payload)

    if (metadata) {
      updateAttrs.metadata = K360.rawJsonbMerge('metadata', metadata)
    }
    if (platformData) {
      updateAttrs.platformData = K360.rawJsonbMerge('platformData', platformData)
    }
    if (myData) {
      updateAttrs.myData = K360.rawJsonbMerge('myData', myData)
    }

    myK360 = await K360.query().patchAndFetchById(k360Id, updateAttrs)

    publisher.publish('k360Updated', {
      myK360,
      updateAttrs: updateAttrsBeforeFullDataMerge,
      eventDate: myK360.updatedDate,
      platformId,
      myData,
      env
    })

    return K360.expose(myK360, { req })
  })

  responder.on('remove', async (req) => {
    const platformId = req.platformId
    const env = req.env

    const {
      K360
    } = await getModels({ platformId, env })

    const {
      k360Id
    } = req

    const myk360 = await K360.query().findById(k360Id)
    if (!myk360) {
      return { id: k360Id }
    }

    await K360.query().deleteById(k360Id)

    publisher.publish('k360Deleted', {
      k360Id,
      myk360,
      eventDate: new Date().toISOString(),
      platformId,
      env,
      req
    })

    return { id: k360Id }
  })

  // EVENTS

  subscriber.on('k360Created', async ({ k360, eventDate, platformId, env } = {}) => {
    try {
      const { Event, K360 } = await getModels({ platformId, env })

      await Event.createEvent({
        createdDate: eventDate,
        type: 'ck360__created',
        objectId: k360.id,
        object: K360.expose(k360, { namespaces: ['*'] })
      }, { platformId, env })
    } catch (err) {
      logError(err, {
        platformId,
        env,
        custom: { k360Id: k360.id },
        message: 'Fail to create event k360__created'
      })
    }
  })

  subscriber.on('k360Updated', async ({
    k360,
    updateAttrs,
    eventDate,
    platformId,
    env
  } = {}) => {
    try {
      const { Event, K360 } = await getModels({ platformId, env })

      await Event.createEvent({
        createdDate: eventDate,
        type: 'k360__updated',
        objectId: k360.id,
        object: K360.expose(k360, { namespaces: ['*'] }),
        changesRequested: K360.expose(updateAttrs, { namespaces: ['*'] })
      }, { platformId, env })
    } catch (err) {
      logError(err, {
        platformId,
        env,
        custom: { k360Id: k360.id },
        message: 'Fail to create event k360__updated'
      })
    }
  })

  subscriber.on('k360Deleted', async ({ k360Id, k360, eventDate, platformId, env, req } = {}) => {
    try {
      const { K360, Event } = await getModels({ platformId, env })

      await Event.createEvent({
        createdDate: eventDate,
        type: 'k360__deleted',
        objectId: k360Id,
        object: K360.expose(k360, { req, namespaces: ['*'] })
      }, { platformId, env })
    } catch (err) {
      logError(err, {
        platformId,
        env,
        custom: { k360Id },
        message: 'Fail to create event k360__deleted'
      })
    }
  })
}

function stop () {
  responder.close()
  responder = null

  subscriber.close()
  subscriber = null

  publisher.close()
  publisher = null
}

module.exports = {
  start,
  stop
}
