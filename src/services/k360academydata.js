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
    name: 'Asset k360academydata Responder',
    key: 'k360academydata'
  })

  subscriber = getSubscriber({
    name: 'Asset k360academydata subscriber',
    key: 'k360academydata',
    namespace: COMMUNICATION_ID,
    subscribesTo: [
      'k360academydataCreated',
      'k360academydataUpdated',
      'k360academydataDeleted'
    ]
  })

  publisher = getPublisher({
    name: 'Asset k360academydata publisher',
    key: 'k360academydata',
    namespace: COMMUNICATION_ID
  })

  responder.on('list', async (req) => {
    const platformId = req.platformId
    const env = req.env
    const { K360academydata } = await getModels({ platformId, env })

    const {
      orderBy,
      order,

      nbResultsPerPage,

      // cursor pagination
      startingAfter,
      endingBefore,

      id,
      myData,
    } = req

    const queryBuilder = K360academydata.query()

    const paginationMeta = await performListQuery({
      queryBuilder,
      filters: {
        ids: {
          dbField: 'id',
          value: id,
          transformValue: 'array',
          query: 'inList'
        },
        myData: {
          dbField: 'myData',
          value: myData,
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

    paginationMeta.results = K360academydata.exposeAll(paginationMeta.results, { req })
    return paginationMeta
  })

  responder.on('read', async (req) => {
    const platformId = req.platformId
    const env = req.env
    const { K360academydata } = await getModels({ platformId, env })

    const id = req.id

    const k360academydata = await K360academydata.query().findById(id)
    if (!k360academydata) {
      throw createError(404)
    }

    return K360academydata.expose(k360academydata, { req })
  })

  responder.on('create', async (req) => {
    const platformId = req.platformId
    const env = req.env
    const { K360academydata } = await getModels({ platformId, env })

    const {
      myData,
      platformData
    } = req

    const k360academydata = await K360academydata.query().insert({
      id: await getObjectId({ prefix: K360academydata.idPrefix, platformId, env }),
      myData,
      platformData
    })

    publisher.publish('k360academydataCreated', {
      k360academydata,
      platformId,
      env
    })

    return K360academydata.expose(k360academydata, { req })
  })

  responder.on('update', async (req) => {
    const platformId = req.platformId
    const env = req.env
    const { K360academydata } = await getModels({ platformId, env })

    const categoryId = req.categoryId

    const fields = [
      'name',
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

    const assetCategories = await K360academydata.query()

    const indexedAssetCategories = _.keyBy(assetCategories, 'id')

    let k360academydata = indexedAssetCategories[categoryId]
    if (!k360academydata) {
      throw createError(404)
    }

    const updateAttrs = _.omit(payload, ['metadata', 'platformData'])
    const updateAttrsBeforeFullDataMerge = Object.assign({}, payload)

    if (metadata) {
      updateAttrs.metadata = K360academydata.rawJsonbMerge('metadata', metadata)
    }
    if (platformData) {
      updateAttrs.platformData = K360academydata.rawJsonbMerge('platformData', platformData)
    }
    if (myData) {
      updateAttrs.myData = K360academydata.rawJsonbMerge('myData', myData)
    }

    k360academydata = await K360academydata.query().patchAndFetchById(categoryId, updateAttrs)

    publisher.publish('k360academydataUpdated', {
      k360academydata,
      updateAttrs: updateAttrsBeforeFullDataMerge,
      eventDate: k360academydata.updatedDate,
      platformId,
      env
    })

    return K360academydata.expose(k360academydata, { req })
  })

  responder.on('remove', async (req) => {
    const platformId = req.platformId
    const env = req.env

    const {
      K360academydata
    } = await getModels({ platformId, env })

    const {
      id
    } = req

    const k360academydata = await K360academydata.query().findById(id)
    if (!k360academydata) {
      return { id: id }
    }

    await K360academydata.query().deleteById(id)

    publisher.publish('k360academydataDeleted', {
      id,
      eventDate: new Date().toISOString(),
      platformId,
      env,
      req
    })

    return { id: id }
  })

  // EVENTS

  subscriber.on('k360academydataCreated', async ({ k360academydata, eventDate, platformId, env } = {}) => {
    try {
      const { Event, K360academydata } = await getModels({ platformId, env })

      await Event.createEvent({
        createdDate: eventDate,
        type: 'k360academydata__created',
        objectId: k360academydata.id,
        object: K360academydata.expose(k360academydata, { namespaces: ['*'] })
      }, { platformId, env })
    } catch (err) {
      logError(err, {
        platformId,
        env,
        custom: { id: k360academydata.id },
        message: 'Fail to create event k360academydata__created'
      })
    }
  })

  subscriber.on('k360academydataUpdated', async ({
    k360academydata,
    updateAttrs,
    eventDate,
    platformId,
    env
  } = {}) => {
    try {
      const { Event, K360academydata } = await getModels({ platformId, env })

      await Event.createEvent({
        createdDate: eventDate,
        type: 'k360academydata__updated',
        objectId: k360academydata.id,
        object: K360academydata.expose(k360academydata, { namespaces: ['*'] }),
        changesRequested: K360academydata.expose(updateAttrs, { namespaces: ['*'] })
      }, { platformId, env })
    } catch (err) {
      logError(err, {
        platformId,
        env,
        custom: { id: k360academydata.id },
        message: 'Fail to create event k360academydata__updated'
      })
    }
  })

  subscriber.on('k360academydataDeleted', async ({ id, k360academydata, eventDate, platformId, env, req } = {}) => {
    try {
      const { K360academydata, Event } = await getModels({ platformId, env })

      await Event.createEvent({
        createdDate: eventDate,
        type: 'k360academydata__deleted',
        objectId: id,
        object: K360academydata.expose(k360academydata, { req, namespaces: ['*'] })
      }, { platformId, env })
    } catch (err) {
      logError(err, {
        platformId,
        env,
        custom: { id },
        message: 'Fail to create event k360academydata__deleted'
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
