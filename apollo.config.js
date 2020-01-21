module.exports = {
  client: {
    includes: ['./src/**/*.ts'],
    excludes: ['./node_modules/*'],
    service: {
      name: 'hasura',
      url: 'https://hasura.gitstart.dev/v1/graphql',
      // optional headers
      headers: {
        'x-hasura-admin-secret': 'helloworld',
      },
    },
  },
}
