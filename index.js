const { session, farm } = require('farmos/test/connect/client');
const Cambria = require('cambria');
const fieldsToOmit = require('./fieldsToOmit');

const derefSchema = serverSchema => {
  const { properties } = serverSchema.allOf.find(s => s.type === 'object');
  Object.keys(properties).forEach(key => {
    properties[key] = serverSchema.definitions[key];
  });
  const schema = {
    ...serverSchema,
    properties,
  };
  delete schema.allOf;
  delete schema.definitions;
  return schema;
}

const hoistAll = (host, schema) => 
  Object.keys(schema.properties[host].properties)
    .map(name => ({ op: 'hoist', host, name }));

const removeAll = names => names.map(name => ({ op: 'remove', name }));

const sequentialUpdate = (schema, lenses) => {
  const head = lenses[0];
  const lens = Array.isArray(head) ? head : head(schema);
  const tailLenses = lenses.slice(1);
  const nextSchema = Cambria.updateSchema(schema, lens);
  if (tailLenses.length === 0) { return nextSchema; }
  return sequentialUpdate(nextSchema, tailLenses);
}

console.log('fetching...');
session()
  .then(() => farm.schema.get('log', 'activity'))
  .then(serverSchema => {
    const schema = derefSchema(serverSchema);

    const lens1 = [
      {
        op: 'in',
        name: 'attributes',
        lens: removeAll(fieldsToOmit.attributes),
      },
      {
        op: 'in',
        name: 'relationships',
        lens: removeAll(fieldsToOmit.relationships),
      },
    ];
    const lens2 = (schema2) => [
      ...hoistAll('attributes', schema2),
      ...hoistAll('relationships', schema2),
    ];
    const lens3 = removeAll(['attributes', 'relationships']);

    const localSchema = sequentialUpdate(schema, [lens1, lens2, lens3]);
    console.log(localSchema);
  });
