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

const hoistAll = (host, schema, omissions = []) => 
  Object.keys(schema.properties[host].properties)
    .filter(name => !omissions.includes(name))
    .map(name => ({ op: 'hoist', host, name }));

const removeAll = names => names.map(name => ({ op: 'remove', name }));

console.log('fetching...');
session()
  .then(() => farm.schema.get('log', 'activity'))
  .then(serverSchema => {
    const schema = derefSchema(serverSchema);

    const lens = [
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
      ...hoistAll('attributes', schema, fieldsToOmit.attributes),
      ...hoistAll('relationships', schema, fieldsToOmit.relationships),
      ...removeAll(['attributes', 'relationships']),
    ];

    const localSchema = Cambria.updateSchema(schema, lens);
    console.log(localSchema);
  });
