module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/email-token/find-and-delete',
      handler: 'email-token.findAndDelete'
    }
  ]
}
