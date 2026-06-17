function serializeCreatorCard(card, options = { includeAccessCode: true }) {
  const raw = card.toObject ? card.toObject() : card;

  const serialized = {
    id: raw._id,
    title: raw.title,
    description: raw.description,
    slug: raw.slug,
    creator_reference: raw.creator_reference,
    links: raw.links,
    service_rates: raw.service_rates,
    status: raw.status,
    access_type: raw.access_type,
    access_code: raw.access_code,
    created: raw.created,
    updated: raw.updated,
    deleted: raw.deleted,
  };

  if (!options.includeAccessCode) {
    delete serialized.access_code;
  }

  return serialized;
}

module.exports = serializeCreatorCard;
