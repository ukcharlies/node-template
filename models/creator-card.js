const { ModelSchema, SchemaTypes, DatabaseModel } = require('@app-core/mongoose');

const modelName = 'creator_cards';

const rateSchema = {
  name: { type: SchemaTypes.String, required: true },
  description: { type: SchemaTypes.String },
  amount: { type: SchemaTypes.Number, required: true },
};

const linkSchema = {
  title: { type: SchemaTypes.String, required: true },
  url: { type: SchemaTypes.String, required: true },
};

const schemaConfig = {
  _id: { type: SchemaTypes.ULID, required: true },
  title: { type: SchemaTypes.String, required: true },
  description: { type: SchemaTypes.String },
  slug: { type: SchemaTypes.String, required: true, unique: true },
  creator_reference: { type: SchemaTypes.String, required: true, index: true },
  links: { type: [linkSchema], default: [] },
  service_rates: {
    currency: { type: SchemaTypes.String },
    rates: { type: [rateSchema], default: undefined },
  },
  status: { type: SchemaTypes.String, required: true, index: true },
  access_type: { type: SchemaTypes.String, required: true, default: 'public' },
  access_code: { type: SchemaTypes.String, default: null },
  created: { type: SchemaTypes.Number, required: true },
  updated: { type: SchemaTypes.Number, required: true },
  deleted: { type: SchemaTypes.Number, default: null, index: true },
};

const modelSchema = new ModelSchema(schemaConfig, { collection: modelName });

module.exports = DatabaseModel.model(modelName, modelSchema);
