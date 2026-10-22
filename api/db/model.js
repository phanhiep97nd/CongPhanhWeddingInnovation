const crypto = require('node:crypto');
const db = require('./index');
const { schemas } = require('./schema');
const models = new Map();
const quote = name => `"${name}"`;
const newId = () => crypto.randomBytes(12).toString('hex');
const isValidId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

// A small SQL repository keeps existing route/document interfaces stable. All
// predicates, projections and aggregates below execute in PostgreSQL, not JS scans.
function model(name) {
  if (models.has(name)) return models.get(name);
  const schema = schemas[name];
  const fields = ['_id', ...schema.fields, ...(schema.timestamps === false ? [] : ['createdAt', 'updatedAt'])];
  function column(field) {
    if (!fields.includes(field)) throw new Error(`Unknown ${name} field: ${field}`);
    return quote(field);
  }
  const table = quote(schema.table);
  const valueFor = (key, value) => schema.json?.includes(key) ? JSON.stringify(value) : value;

  function where(filter, params) {
    const parameter = value => { params.push(value); return `$${params.length}`; };
    const clauses = Object.entries(filter || {}).map(([key, value]) => {
      if (key === '$or') return `(${value.length ? value.map(item => where(item, params)).join(' OR ') : 'FALSE'})`;
      const field = column(key);
      if (value instanceof RegExp) return `${field} ${value.ignoreCase ? '~*' : '~'} ${parameter(value.source)}`;
      if (value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
        return Object.entries(value).map(([operator, operand]) => {
          if (operator === '$in') return operand.length ? `${field} IN (${operand.map(item => parameter(item)).join(',')})` : 'FALSE';
          if (operator === '$ne') return `${field} IS DISTINCT FROM ${parameter(operand)}`;
          if (operator === '$exists') return `${field} IS ${operand ? 'NOT ' : ''}NULL`;
          throw new Error(`Unsupported SQL filter: ${operator}`);
        }).join(' AND ');
      }
      if (schema.json?.includes(key) && key === 'slugAliases') return `${field} @> ${parameter(JSON.stringify([value]))}::jsonb`;
      if (value == null) return `${field} IS NULL`;
      return `${field} = ${parameter(value)}`;
    });
    return clauses.length ? clauses.map(clause => `(${clause})`).join(' AND ') : 'TRUE';
  }

  function hydrate(row) {
    if (!row) return null;
    if (name === 'Order' && row.orderCode != null) row.orderCode = Number(row.orderCode);
    for (const key of [...(schema.dates || []), 'createdAt', 'updatedAt']) {
      if (row[key] != null && !(row[key] instanceof Date)) row[key] = new Date(row[key]);
    }
    return row;
  }

  class Document {
    constructor(data) {
      Object.assign(this, hydrate(data));
      Object.defineProperty(this, '_original', { value: structuredClone(data), writable: true });
    }
    get id() { return this._id; }
    get(key) { return this[key]; }
    set(key, value) { column(key); this[key] = value; }
    toObject() { return Object.fromEntries(Object.entries(this)); }
    async save() {
      const changes = {};
      for (const key of schema.fields) {
        if (JSON.stringify(this[key]) !== JSON.stringify(this._original[key])) changes[key] = this[key];
      }
      if (Object.keys(changes).length) {
        const saved = await Repository.findByIdAndUpdate(this._id, { $set: changes });
        if (!saved) throw new Error(`${name} no longer exists`);
        Object.assign(this, saved.toObject());
        this._original = structuredClone(this.toObject());
      }
      return this;
    }
    deleteOne() { return Repository.deleteMany({ _id: this._id }); }
  }

  class Query {
    constructor(execute, single = false) { this.execute = execute; this.single = single; this.populations = []; }
    sort(value) { this.order = value; return this; }
    skip(value) { this.offset = Math.max(0, Math.trunc(value)); return this; }
    limit(value) { this.maximum = Math.max(1, Math.trunc(value)); return this; }
    select(value) { this.projection = value.split(/\s+/).filter(Boolean); return this; }
    lean() { this.plain = true; return this; }
    populate(field, projection) { this.populations.push([field, projection]); return this; }
    async run() {
      const rows = await this.execute(this);
      for (const [field, projection] of this.populations) {
        const target = model(schema.relations[field]);
        const ids = [...new Set(rows.map(row => row[field]).filter(Boolean))];
        const related = await target.find({ _id: { $in: ids } }).select(projection).lean();
        const byId = new Map(related.map(row => [row._id, row]));
        for (const row of rows) row[field] = byId.get(row[field]) || null;
      }
      const result = rows.map(row => this.plain ? hydrate(row) : new Document(row));
      return this.single ? result[0] || null : result;
    }
    then(resolve, reject) { this.promise ||= this.run(); return this.promise.then(resolve, reject); }
    catch(reject) { return this.then(undefined, reject); }
  }

  function find(filter, single) {
    return new Query(async options => {
      const params = [];
      const predicate = where(filter, params);
      const projection = options.projection ? [...new Set(['_id', ...options.projection])].map(column).join(',') : '*';
      const order = options.order ? ` ORDER BY ${Object.entries(options.order).map(([key, direction]) => `${column(key)} ${direction < 0 ? 'DESC' : 'ASC'}`).join(',')}` : '';
      const limit = single ? 1 : options.maximum;
      const sql = `SELECT ${projection} FROM ${table} WHERE ${predicate}${order}${limit ? ` LIMIT ${limit}` : ''}${options.offset ? ` OFFSET ${options.offset}` : ''}`;
      return (await db.query(sql, params)).rows;
    }, single);
  }

  function prepare(input) {
    const result = structuredClone(schema.defaults || {});
    for (const key of fields) if (input[key] !== undefined) {
      const value = input[key];
      result[key] = schema.json?.includes(key) && value && !Array.isArray(value) ? { ...result[key], ...value } : value;
    }
    result._id ||= name === 'Settings' ? 'global' : newId();
    for (const key of ['email', 'slug']) if (typeof result[key] === 'string') result[key] = result[key].trim().toLowerCase();
    for (const key of ['name', 'invitationName']) if (typeof result[key] === 'string') result[key] = result[key].trim();
    for (const key of schema.required || []) if (result[key] == null || result[key] === '') {
      const error = new Error(`Missing required field: ${key}`); error.status = 400; throw error;
    }
    return result;
  }

  function update(filter, changes, options = {}) {
    return new Query(async () => {
      if (options.upsert && name === 'Settings') {
        await db.query(`INSERT INTO settings (_id) VALUES ('global') ON CONFLICT (_id) DO NOTHING`);
      }
      const params = [];
      const updates = Object.entries(changes.$set || changes).filter(([key]) => schema.fields.includes(key));
      const assignments = updates.map(([key, value]) => { params.push(valueFor(key, value)); return `${column(key)} = $${params.length}`; });
      if (schema.timestamps !== false) assignments.push('"updatedAt" = now()');
      const predicate = where(filter, params);
      if (!assignments.length) return (await db.query(`SELECT * FROM ${table} WHERE ${predicate}`, params)).rows;
      return (await db.query(`UPDATE ${table} SET ${assignments.join(',')} WHERE ${predicate} RETURNING *`, params)).rows;
    }, true);
  }

  const Repository = {
    find: (filter = {}) => find(filter, false),
    findOne: filter => find(filter, true),
    findById: id => find({ _id: id }, true),
    findOneAndUpdate: update,
    findByIdAndUpdate: (id, changes, options) => update({ _id: id }, changes, options),
    updateOne: update,
    async create(input) { return (await this.insertMany([input]))[0]; },
    async insertMany(inputs) {
      if (!inputs.length) return [];
      const documents = inputs.map(prepare);
      const keys = fields.filter(key => documents.some(document => document[key] !== undefined));
      const params = [];
      const values = documents.map(document => `(${keys.map(key => {
        if (document[key] === undefined) return 'DEFAULT';
        params.push(valueFor(key, document[key])); return `$${params.length}`;
      }).join(',')})`).join(',');
      const result = await db.query(`INSERT INTO ${table} (${keys.map(column).join(',')}) VALUES ${values} RETURNING *`, params);
      return result.rows.map(row => new Document(row));
    },
    async countDocuments(filter = {}) {
      const params = [];
      const result = await db.query(`SELECT count(*)::int AS count FROM ${table} WHERE ${where(filter, params)}`, params);
      return result.rows[0].count;
    },
    async exists(filter) { return !!await find(filter, true).select('_id').lean(); },
    async deleteMany(filter = {}) {
      const params = [];
      const result = await db.query(`DELETE FROM ${table} WHERE ${where(filter, params)} RETURNING _id`, params);
      return { deletedCount: result.rows.length };
    },
    findOneAndDelete(filter) {
      return new Query(async () => {
        const params = [];
        return (await db.query(`DELETE FROM ${table} WHERE ${where(filter, params)} RETURNING *`, params)).rows;
      }, true);
    },
    async groupBy(field, filter = {}, sums = { count: 1 }) {
      const params = [];
      const expressions = Object.entries(sums).map(([alias, value]) => {
        if (!/^[a-zA-Z]+$/.test(alias)) throw new Error('Invalid aggregate alias');
        return `${value === 1 ? 'count(*)' : `sum(${column(value)})`}::float8 AS ${quote(alias)}`;
      });
      return (await db.query(`SELECT ${column(field)} AS _id, ${expressions.join(',')} FROM ${table} WHERE ${where(filter, params)} GROUP BY ${column(field)}`, params)).rows;
    }
  };
  models.set(name, Repository);
  return Repository;
}

module.exports = { model, newId, isValidId };
