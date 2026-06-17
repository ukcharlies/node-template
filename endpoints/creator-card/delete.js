const { createHandler } = require('@app-core/server');
const { CreatorCardMessages } = require('@app/messages');
const { deleteCreatorCardBySlug } = require('@app/services/creator-card');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'delete',
  middlewares: [],
  async handler(rc, helpers) {
    const response = await deleteCreatorCardBySlug(rc.params.slug, rc.body);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardMessages.DELETED,
      data: response,
    };
  },
});
