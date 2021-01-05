const fieldsToOmit = {
  attributes: [
    'drupal_internal__id',
    'drupal_internal__revision_id',
    'langcode',
    'revision_created',
    'revision_log_message',
    'default_langcode',
    'revision_translation_affected',
    'revision_default',
  ],
  relationships: ['revision_user'],
};

module.exports = fieldsToOmit;
