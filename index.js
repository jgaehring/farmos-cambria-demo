const { session, farm } = require('farmos/test/connect/client');
const Cambria = require('cambria');
const fieldsToOmit = require('./fieldsToOmit');

const derefSchema = serverSchema => {
  const { properties, type } = serverSchema.allOf.find(s => s.type === 'object');
  Object.keys(properties).forEach(key => {
    properties[key] = serverSchema.definitions[key];
  });
  const schema = {
    ...serverSchema,
    properties,
    type,
  };
  delete schema.allOf;
  delete schema.definitions;
  return schema;
}

const hoistAll = (host, schema, omissions = []) => 
  Object.keys(schema.properties[host].properties)
    .filter(name => !omissions.includes(name))
    .map(name => ({ op: 'hoist', host, name }));

const removeAll = names => names.map(name => ({ op: 'remove', name, type: 'object' }));

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

    const reverse = Cambria.reverseLens(lens);
    const serverSchemaRedux = Cambria.updateSchema(localSchema, reverse);
    console.log(serverSchemaRedux);
    const defaultActivity = Cambria.defaultObjectForSchema(localSchema);
    console.log(defaultActivity);
  });
