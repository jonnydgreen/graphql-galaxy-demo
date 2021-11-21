'use strict'

// Sourced from: https://github.com/mercurius-js/auth/blob/main/examples/gateway.js

const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusAuth = require('mercurius-auth')

async function createService (schema, resolvers = {}) {
  const service = Fastify()
  service.register(mercurius, {
    schema,
    resolvers,
    federationMetadata: true
  })
  await service.listen(0)
  return [service, service.server.address().port]
}

const users = {
  u1: {
    id: 'u1',
    name: 'User 1'
  },
  u2: {
    id: 'u2',
    name: 'User 2'
  }
}

const posts = {
  p1: {
    id: 'p1',
    title: 'Post 1',
    content: 'Content 1',
    authorId: 'u1'
  },
  p2: {
    id: 'p2',
    title: 'Post 2',
    content: 'Content 2',
    authorId: 'u2'
  },
  p3: {
    id: 'p3',
    title: 'Post 3',
    content: 'Content 3',
    authorId: 'u1'
  },
  p4: {
    id: 'p4',
    title: 'Post 4',
    content: 'Content 4',
    authorId: 'u1'
  }
}

async function start () {
  // User service
  const userServiceSchema = `
    directive @auth(
      requires: Role = ADMIN,
    ) on OBJECT | FIELD_DEFINITION
    
    enum Role {
      ADMIN
      USER
      UNKNOWN
    }
    
    type Query @extends {
      me: User @auth(requires: USER)
    }
    
    type User @key(fields: "id") {
      id: ID!
      name: String
    }`
  const userServiceResolvers = {
    Query: {
      me: (root, args, context, info) => {
        return users.u1
      }
    },
    User: {
      __resolveReference: (user, args, context, info) => {
        return users[user.id]
      }
    }
  }
  const [, userServicePort] = await createService(userServiceSchema, userServiceResolvers)

  // Post service
  const postServiceSchema = `
    directive @auth(
      requires: Role = ADMIN,
    ) on OBJECT | FIELD_DEFINITION
    
    enum Role {
      ADMIN
      USER
      UNKNOWN
    }
    
    type Post @key(fields: "id") {
      id: ID!
      author: User @auth(requires: ADMIN)
    }
    
    type User @key(fields: "id") @extends {
      id: ID! @external
      posts: [Post]
    }
    
    extend type Query {
      posts: [Post] @auth(requires: ADMIN)
    }`
  const postServiceResolvers = {
    Post: {
      __resolveReference: (post, args, context, info) => {
        return posts[post.id]
      },
      author: (post, args, context, info) => {
        return {
          __typename: 'User',
          id: post.authorId
        }
      }
    },
    User: {
      posts: (user, { count }, context, info) => {
        return Object.values(posts).filter(p => p.authorId === user.id).slice(0, count)
      }
    },
    Query: {
      posts: (root, { count = 2 }) => Object.values(posts).slice(0, count)
    }
  }
  const [, postServicePort] = await createService(postServiceSchema, postServiceResolvers)

  const gateway = Fastify()

  gateway.register(mercurius, {
    gateway: {
      services: [{
        name: 'user',
        url: `http://localhost:${userServicePort}/graphql`
      }, {
        name: 'post',
        url: `http://localhost:${postServicePort}/graphql`
      }]
    }
  })

  gateway.register(mercuriusAuth, {
    authContext (context) {
      return {
        roles: (context.reply.request.headers['x-user'] || '').split(',')
      }
    },
    async applyPolicy (authDirectiveAST, parent, args, context, info) {
      return context.auth.roles.includes(authDirectiveAST.arguments[0].value.value)
    },
    authDirective: 'auth'
  })

  await gateway.listen(3000)
}

start()
