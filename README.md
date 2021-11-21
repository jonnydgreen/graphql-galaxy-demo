# graphql-galaxy-demo
GraphQL Galaxy 2021: GraphQL Authentication and Authorization at scale demo

## Quick start

### Start Gateway and Services

```sh
npm install
npm start
```

### Happy path with full access

User with roles:

- `USER`
- `ADMIN`

```sh
curl --request POST \
  --url http://localhost:3000/graphql \
  --header 'Content-Type: application/json' \
  --header 'X-User: USER,ADMIN' \
  --data '{"query":"query FullAccessRequest {\n  me {\n    id\n    name\n  }\n  posts {\n    id\n    author {\n      name\n    }\n  }\n}\n","operationName":"FullAccessRequest"}'
```

Response:

```json
{
  "data": {
    "me": {
      "id": "u1",
      "name": "User 1"
    },
    "posts": [
      {
        "id": "p1",
        "author": {
          "name": "User 1"
        }
      },
      {
        "id": "p2",
        "author": {
          "name": "User 2"
        }
      }
    ]
  }
}
```

### Unhappy path with partial access

User with roles:

- `USER`

```sh
curl --request POST \
  --url http://localhost:3000/graphql \
  --header 'Content-Type: application/json' \
  --header 'X-User: USER' \
  --data '{"query":"query PartialAccessRequest {\n  me {\n    id\n    name\n  }\n  posts {\n    id\n    author {\n      name\n    }\n  }\n}\n","operationName":"PartialAccessRequest"}'
```

Response:

```json
{
  "data": {
    "me": {
      "id": "u1",
      "name": "User 1"
    },
    "posts": null
  },
  "errors": [
    {
      "message": "Failed auth policy check on posts",
      "locations": [
        {
          "line": 6,
          "column": 3
        }
      ],
      "path": [
        "posts"
      ]
    }
  ]
}
```

### Unhappy path with no access

User with no roles.

```sh
curl --request POST \
  --url http://localhost:3000/graphql \
  --header 'Content-Type: application/json' \
  --data '{"query":"query NoAccessRequest {\n  me {\n    id\n    name\n  }\n  posts {\n    id\n    author {\n      name\n    }\n  }\n}\n","operationName":"NoAccessRequest"}'
```

Response:

```json
{
  "data": {
    "me": null,
    "posts": null
  },
  "errors": [
    {
      "message": "Failed auth policy check on me",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "me"
      ]
    },
    {
      "message": "Failed auth policy check on posts",
      "locations": [
        {
          "line": 6,
          "column": 3
        }
      ],
      "path": [
        "posts"
      ]
    }
  ]
}
```
