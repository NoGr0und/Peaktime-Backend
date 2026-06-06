export const occupancyReadingSchema = {
  type: 'object',
  required: ['count', 'capacity'],
  properties: {
    count: { type: 'number', minimum: 0 },
    capacity: { type: 'number', minimum: 1 },
  },
};
