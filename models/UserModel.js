const db = require('../config/db');

exports.getSingleRecord = async (table, where = {}, select = '*') => {
  const result = await exports.getRecords(table, where, select);
  return result.length ? result[0] : null;
};

exports.getRecords = async (table, where = {}, select = '*', orderBy = '') => {

  let finalSelect = '*';

  if (Array.isArray(select)) {
    finalSelect = select.join(',');
  } else if (typeof select === 'string' && select.trim() !== '') {
    finalSelect = select;
  }

  let sql = `SELECT ${finalSelect} FROM ${table}`;
  const values = [];

  if (Object.keys(where).length) {
    const conditions = Object.keys(where).map(key => {
      values.push(where[key]);
      return `${key} = ?`;
    });

    sql += ` WHERE ` + conditions.join(' AND ');
  }

  if (orderBy) {
    sql += ` ORDER BY ${orderBy}`;
  }

  const [rows] = await db.query(sql, values);
  return rows;
};

exports.getSingleRecord = async (table, where = {}, select = '*', orderBy = '') => {
  const result = await exports.getRecords(table, where, select, orderBy);
  return result.length ? result[0] : null;
};

// exports.getRecords = async (table, where = {}, select = '*') => {

//   let finalSelect = '*';

//   if (Array.isArray(select)) {
//     finalSelect = select.join(',');
//   } else if (typeof select === 'string' && select.trim() !== '') {
//     finalSelect = select;
//   }

//   let sql = `SELECT ${finalSelect} FROM ${table}`;
//   const values = [];

//   if (Object.keys(where).length) {
//     const conditions = Object.keys(where).map(key => {
//       values.push(where[key]);
//       return `${key} = ?`;
//     });

//     sql += ` WHERE ` + conditions.join(' AND ');
//   }

//   const [rows] = await db.query(sql, values);
//   return rows;
// };

exports.addRecord = async (table, data) => {
  const keys = Object.keys(data);
  const values = Object.values(data);

  const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`;

  const [result] = await db.query(sql, values);
  return result;
};

exports.updateRecord = async (table, data, where = {}) => {
  const setKeys = Object.keys(data).map(key => `${key} = ?`);
  const setValues = Object.values(data);

  let sql = `UPDATE ${table} SET ${setKeys.join(',')}`;
  const values = [...setValues];

  if (Object.keys(where).length) {
    const conditions = Object.keys(where).map(key => {
      values.push(where[key]);
      return `${key} = ?`;
    });
    sql += ` WHERE ` + conditions.join(' AND ');
  }

  const [result] = await db.query(sql, values);
  return result;
};

exports.deleteRecord = async (table, where = {}) => {
  let sql = `DELETE FROM ${table}`;
  const values = [];

  if (Object.keys(where).length) {
    const conditions = Object.keys(where).map(key => {
      values.push(where[key]);
      return `${key} = ?`;
    });
    sql += ` WHERE ` + conditions.join(' AND ');
  }

  const [result] = await db.query(sql, values);
  return result;
};

exports.getReport = async ({
    table,
    select = '*',
    where = {},
    search = '',
    searchColumns = [],
    orderBy = 'id DESC',
    page = 1,
    limit = 10
}) => {

    let sql = `SELECT ${select} FROM ${table}`;
    const values = [];
    const conditions = [];

    Object.keys(where).forEach(key => {
        conditions.push(`${key} = ?`);
        values.push(where[key]);
    });

    if (search && searchColumns.length) {

        const searchCondition = searchColumns
            .map(col => `${col} LIKE ?`)
            .join(' OR ');

        conditions.push(`(${searchCondition})`);

        searchColumns.forEach(() => {
            values.push(`%${search}%`);
        });
    }

    if (conditions.length) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY ${orderBy}`;

    const offset = (page - 1) * limit;

    sql += ` LIMIT ? OFFSET ?`;

    values.push(Number(limit));
    values.push(Number(offset));

    const [rows] = await db.query(sql, values);

    // Total Records
    let countSql = `SELECT COUNT(*) as total FROM ${table}`;

    if (conditions.length) {
        countSql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const countValues = values.slice(0, values.length - 2);

    const [countRows] = await db.query(countSql, countValues);

    return {
        rows,
        totalRecords: countRows[0].total,
        totalPages: Math.ceil(countRows[0].total / limit),
        currentPage: Number(page)
    };
};