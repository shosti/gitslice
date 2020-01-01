const request = require('request')

const AUTH0_CLIENT_ID = 'HfxEJ2QbOiuGPcpze7g5AU4QFdWVoM0U'
const GITSLICE_PASSWORD = 'qKJnW*zftP7a*r_uV6Vq'

const options = {
  method: 'POST',
  url: `https://auth.gitstart.com/oauth/token`,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  form: {
    grant_type: 'password',
    client_id: AUTH0_CLIENT_ID,
    username: 'gitslice@gitstart.dev',
    password: GITSLICE_PASSWORD,
    scope: 'openid'
  }
}

const getToken = async () => {
  return new Promise((resolve, reject) => {
    request(options, function(error, _, body) {
      if (error) reject(error)
      resolve(JSON.parse(body).id_token)
    })
  })
}

module.exports = {
  getToken
}
