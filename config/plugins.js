module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'sendgrid',
      providerOptions: {
        apiKey: env('SENDGRID_API_KEY')
      },
      settings: {
        defaultFrom: env('SENDGRID_EMAIL'),
        defaultReplyTo: env('SENDGRID_EMAIL'),
        testAddress: env('SENDGRID_EMAIL')
      }
    }
  },
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloud_name: env('CLOUDINARY_NAME'),
        api_key: env('CLOUDINARY_KEY'),
        api_secret: env('CLOUDINARY_SECRET')
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {}
      }
    }
  },
  'users-permissions': {
    config: {
      jwt: {
        expiresIn: '1d'
      }
    }
  }
})
