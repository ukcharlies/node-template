const { createHandler } = require('@app-core/server');
const { CreatorCardMessages } = require('@app/messages');
const { getCreatorCardBySlug } = require('@app/services/creator-card');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'get',
  middlewares: [],
  async handler(rc, helpers) {
    const response = await getCreatorCardBySlug(rc.params.slug, rc.query.access_code);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardMessages.RETRIEVED,
      data: response,
    };
  },
});
