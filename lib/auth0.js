const axios = require('axios')
const GITSLICE_EMAIL = 'gitslice@gitstart.dev'

const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, GITSLICE_PASSWORD } = process.env

const getToken = async () => {
  return axios.request({
    method: 'POST',
    url: `https://${AUTH0_DOMAIN}/oauth/token`,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    form: {
      grant_type: 'password',
      username: GITSLICE_EMAIL,
      password: GITSLICE_PASSWORD,
      client_id: AUTH0_CLIENT_ID
    }
  })
}

module.exports = {
  getToken
}
