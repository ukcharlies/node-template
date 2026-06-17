/* eslint-disable no-await-in-loop */
const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { ulid, randomBytes } = require('@app-core/randomness');
const { CreatorCard } = require('@app/models');
const serializeCreatorCard = require('./serializer');

const SLUG_PATTERN = /^[a-zA-Z0-9_-]+$/;
const ACCESS_CODE_PATTERN = /^[a-zA-Z0-9]{6}$/;

const createCreatorCardSpec = `root {
  title string<trim|lengthBetween:3,100>
  description? string<trim|maxLength:500>
  slug? string<trim|lengthBetween:5,50>
  creator_reference string<trim|length:20>
  links[]? {
    title string<trim|lengthBetween:1,100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|lengthBetween:3,100>
      description? string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<trim|length:6>
}`;

const deleteCreatorCardSpec = `root {
  creator_reference string<trim|length:20>
}`;

const parsedCreateCreatorCardSpec = validator.parse(createCreatorCardSpec);
const parsedDeleteCreatorCardSpec = validator.parse(deleteCreatorCardSpec);

function throwBusinessError(message, code) {
  throwAppError(message, code);
}

function throwValidationError(message) {
  throwAppError(message, 'SPCL_VALIDATION');
}

function validateSlug(slug) {
  if (!SLUG_PATTERN.test(slug)) {
    throwValidationError('slug can only contain letters, numbers, hyphens and underscores');
  }
}

function validateAccessCode(accessCode) {
  if (accessCode != null && !ACCESS_CODE_PATTERN.test(accessCode)) {
    throwValidationError('access_code must be 6 alphanumeric characters');
  }
}

function validateLinks(links = []) {
  links.forEach((link, index) => {
    if (!link.url.startsWith('http://') && !link.url.startsWith('https://')) {
      throwValidationError(`links[${index}].url must start with http:// or https://`);
    }
  });
}

function validateServiceRates(serviceRates) {
  if (!serviceRates) return;

  if (!Array.isArray(serviceRates.rates) || serviceRates.rates.length === 0) {
    throwValidationError('service_rates.rates must be a non-empty array');
  }

  serviceRates.rates.forEach((rate, index) => {
    if (!Number.isInteger(rate.amount)) {
      throwValidationError(`service_rates.rates[${index}].amount must be a positive integer`);
    }
  });
}

function slugifyTitle(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .substring(0, 50);
}

function randomSlugSuffix() {
  return randomBytes(6)
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 6);
}

async function findBySlug(slug, includeDeleted = false) {
  const query = { slug };
  if (!includeDeleted) query.deleted = null;
  return CreatorCard.findOne(query);
}

async function ensureSlugIsAvailable(slug) {
  const existingCard = await findBySlug(slug, true);
  if (existingCard) {
    throwBusinessError('Slug is already taken', 'SL02');
  }
}

async function generateUniqueSlug(title) {
  const baseSlug = slugifyTitle(title);
  let candidate = baseSlug;

  if (candidate.length < 5 || (await findBySlug(candidate, true))) {
    do {
      const prefix = (candidate.length >= 5 ? candidate : baseSlug || 'card').substring(0, 43);
      candidate = `${prefix}-${randomSlugSuffix()}`;
    } while (await findBySlug(candidate, true));
  }

  return candidate;
}

function validateAccessRules(data) {
  if (data.access_type === 'private' && !data.access_code) {
    throwBusinessError('access_code is required when access_type is private', 'AC01');
  }

  if (data.access_type === 'public' && data.access_code) {
    throwBusinessError('access_code can only be set on private cards', 'AC05');
  }
}

function validateCardPayload(data) {
  if (data.slug) validateSlug(data.slug);
  validateAccessCode(data.access_code);
  validateLinks(data.links);
  validateServiceRates(data.service_rates);
}

async function createCreatorCard(payload) {
  const validatedData = validator.validate(payload, parsedCreateCreatorCardSpec);
  validatedData.access_type = validatedData.access_type || 'public';

  validateCardPayload(validatedData);
  validateAccessRules(validatedData);

  if (validatedData.slug) {
    await ensureSlugIsAvailable(validatedData.slug);
  } else {
    validatedData.slug = await generateUniqueSlug(validatedData.title);
  }

  const timestamp = Date.now();
  let card;

  try {
    card = await CreatorCard.create({
      ...validatedData,
      _id: ulid(),
      access_code: validatedData.access_type === 'private' ? validatedData.access_code : null,
      links: validatedData.links || [],
      created: timestamp,
      updated: timestamp,
      deleted: null,
    });
  } catch (error) {
    if (parseInt(error.code, 10) === 11000 && error.keyPattern?.slug) {
      throwBusinessError('Slug is already taken', 'SL02');
    }

    throw error;
  }

  return serializeCreatorCard(card);
}

async function getCreatorCardBySlug(slug, accessCode) {
  const card = await findBySlug(slug);

  if (!card) {
    throwBusinessError('Creator card not found', 'NF01');
  }

  if (card.status === 'draft') {
    throwBusinessError('Creator card not found', 'NF02');
  }

  if (card.access_type === 'private' && !accessCode) {
    throwBusinessError('This card is private. An access code is required', 'AC03');
  }

  if (card.access_type === 'private' && accessCode !== card.access_code) {
    throwBusinessError('Invalid access code', 'AC04');
  }

  return serializeCreatorCard(card, { includeAccessCode: false });
}

async function deleteCreatorCardBySlug(slug, payload) {
  validator.validate(payload, parsedDeleteCreatorCardSpec);

  const card = await findBySlug(slug);

  if (!card) {
    throwBusinessError('Creator card not found', 'NF01');
  }

  const timestamp = Date.now();
  const deletedCard = await CreatorCard.findOneAndUpdate(
    { slug, deleted: null },
    { deleted: timestamp, updated: timestamp },
    { new: true, lean: true }
  );

  return serializeCreatorCard(deletedCard);
}

module.exports = {
  createCreatorCard,
  getCreatorCardBySlug,
  deleteCreatorCardBySlug,
};
