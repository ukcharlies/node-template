const { expect } = require('chai');
const { CreatorCard } = require('@app/models');
const serializer = require('./creator-card/serializer');
const service = require('./creator-card');

describe('creator card service', () => {
  afterEach(() => {
    delete CreatorCard.findOne;
    delete CreatorCard.create;
    delete CreatorCard.findOneAndUpdate;
  });

  it('serializes _id as id and can omit access_code', () => {
    const card = {
      _id: '01J00000000000000000000000',
      title: 'Ada Designs Things',
      description: 'Portfolio and rates',
      slug: 'ada-designs-things',
      creator_reference: '12345678901234567890',
      links: [],
      service_rates: undefined,
      status: 'published',
      access_type: 'private',
      access_code: 'A1B2C3',
      created: 1710000000000,
      updated: 1710000000000,
      deleted: null,
    };

    expect(serializer(card)).to.include({
      id: card._id,
      access_code: 'A1B2C3',
    });
    expect(serializer(card)).to.not.have.property('_id');
    expect(serializer(card, { includeAccessCode: false })).to.not.have.property('access_code');
  });

  it('creates a public card with generated slug and null access_code', async () => {
    CreatorCard.findOne = async () => null;
    CreatorCard.create = async (payload) => payload;

    const card = await service.createCreatorCard({
      title: 'Ada Designs Things',
      creator_reference: '12345678901234567890',
      status: 'published',
    });

    expect(card).to.include({
      slug: 'ada-designs-things',
      access_type: 'public',
      access_code: null,
      deleted: null,
    });
    expect(card.id).to.be.a('string').with.length(26);
    expect(card.created).to.be.a('number');
  });

  it('rejects a duplicate client-provided slug with SL02', async () => {
    CreatorCard.findOne = async () => ({ _id: 'existing' });

    try {
      await service.createCreatorCard({
        title: 'Ada Designs Things',
        slug: 'ada-designs-things',
        creator_reference: '12345678901234567890',
        status: 'published',
      });
      throw new Error('Expected createCreatorCard to throw');
    } catch (error) {
      expect(error.errorCode).to.equal('SL02');
      expect(error.message).to.equal('Slug is already taken');
    }
  });

  it('maps MongoDB duplicate slug errors to SL02', async () => {
    CreatorCard.findOne = async () => null;
    CreatorCard.create = async () => {
      const error = new Error('E11000 duplicate key error');
      error.code = 11000;
      error.keyPattern = { slug: 1 };
      throw error;
    };

    try {
      await service.createCreatorCard({
        title: 'Ada Designs Things',
        slug: 'ada-designs-things',
        creator_reference: '12345678901234567890',
        status: 'published',
      });
      throw new Error('Expected createCreatorCard to throw');
    } catch (error) {
      expect(error.errorCode).to.equal('SL02');
      expect(error.message).to.equal('Slug is already taken');
    }
  });

  it('requires access_code for private cards and forbids it for public cards', async () => {
    try {
      await service.createCreatorCard({
        title: 'VIP Rate Card',
        creator_reference: '12345678901234567890',
        status: 'published',
        access_type: 'private',
      });
      throw new Error('Expected private create to throw');
    } catch (error) {
      expect(error.errorCode).to.equal('AC01');
    }

    try {
      await service.createCreatorCard({
        title: 'VIP Rate Card',
        creator_reference: '12345678901234567890',
        status: 'published',
        access_type: 'public',
        access_code: 'A1B2C3',
      });
      throw new Error('Expected public create to throw');
    } catch (error) {
      expect(error.errorCode).to.equal('AC05');
    }
  });

  it('hides private retrieval access_code after access is granted', async () => {
    CreatorCard.findOne = async () => ({
      _id: '01J00000000000000000000000',
      title: 'VIP Rate Card',
      slug: 'vip-rate-card',
      creator_reference: '12345678901234567890',
      links: [],
      status: 'published',
      access_type: 'private',
      access_code: 'A1B2C3',
      created: 1710000000000,
      updated: 1710000000000,
      deleted: null,
    });

    const card = await service.getCreatorCardBySlug('vip-rate-card', 'A1B2C3');

    expect(card).to.include({ id: '01J00000000000000000000000' });
    expect(card).to.not.have.property('access_code');
  });

  it('soft deletes an existing card', async () => {
    const existingCard = {
      _id: '01J00000000000000000000000',
      title: 'Ada Designs Things',
      slug: 'ada-designs-things',
      creator_reference: '12345678901234567890',
      links: [],
      status: 'published',
      access_type: 'public',
      access_code: null,
      created: 1710000000000,
      updated: 1710000000000,
      deleted: null,
    };

    CreatorCard.findOne = async () => existingCard;
    CreatorCard.findOneAndUpdate = async (_, updateValues) => ({
      ...existingCard,
      ...updateValues,
    });

    const card = await service.deleteCreatorCardBySlug('ada-designs-things', {
      creator_reference: '12345678901234567890',
    });

    expect(card.deleted).to.be.a('number');
    expect(card.access_code).to.equal(null);
  });
});
