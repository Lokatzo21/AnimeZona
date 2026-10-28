const fs = require('fs');
const path = require('path');
const { Client } = require('./node_modules/pg');

const DB_CONN = 'postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres';
const BASE_BACKUP_DIR = 'M:\\BD STREAMING';

function formatSQLValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function mapPostgresType(col) {
  let type = col.data_type;
  if (type === 'USER-DEFINED') return col.udt_name;
  if (type === 'ARRAY') return col.udt_name.startsWith('_') ? `${col.udt_name.slice(1)}[]` : `${col.udt_name}[]`;
  if (type === 'character varying') {
    return col.character_maximum_length ? `varchar(${col.character_maximum_length})` : 'varchar';
  }
  return type;
}

function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const YYYY = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const DD = pad(now.getDate());
  const HH = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${YYYY}-${MM}-${DD}_${HH}-${mm}-${ss}`;
}

async function runBackup() {
  const startTime = Date.now();
  console.log('================================================================');
  console.log('       🛡️  SISTEMA DE RESPALDO TOTAL - SUPABASE (STREAMZONA)      ');
  console.log('================================================================');

  if (!fs.existsSync(BASE_BACKUP_DIR)) {
    fs.mkdirSync(BASE_BACKUP_DIR, { recursive: true });
  }

  const timestamp = getTimestamp();
  const targetDir = path.join(BASE_BACKUP_DIR, `Respaldo_${timestamp}`);
  fs.mkdirSync(targetDir, { recursive: true });

  console.log(`📁 Carpeta de destino: ${targetDir}\n`);

  const client = new Client({
    connectionString: DB_CONN,
    connectionTimeoutMillis: 15000
  });

  try {
    process.stdout.write('🔌 Conectando con Supabase... ');
    await client.connect();
    console.log('✅ Conectado con éxito.\n');

    // 1. Obtener todas las tablas del esquema público
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`📋 Tablas encontradas (${tables.length}): ${tables.join(', ')}\n`);

    // 2. Extraer Metadatos para el Esquema (DDL)
    const colsRes = await client.query(`
      SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);

    const pksRes = await client.query(`
      SELECT tc.table_name, kcu.column_name, tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY tc.table_name, kcu.ordinal_position;
    `);

    const fksRes = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
    `);

    const idxRes = await client.query(`
      SELECT tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public';
    `);

    // Construir DDL del Esquema
    let schemaSql = `-- =============================================================\n`;
    schemaSql += `-- ESQUEMA DE TABLAS (SCHEMA VISUALIZER DDL) - SUPABASE\n`;
    schemaSql += `-- Generado: ${new Date().toISOString()}\n`;
    schemaSql += `-- =============================================================\n\n`;

    for (const tableName of tables) {
      const cols = colsRes.rows.filter(c => c.table_name === tableName);
      const pks = pksRes.rows.filter(pk => pk.table_name === tableName).map(pk => `"${pk.column_name}"`);
      const fks = fksRes.rows.filter(fk => fk.table_name === tableName);

      schemaSql += `CREATE TABLE IF NOT EXISTS public."${tableName}" (\n`;
      const colDefs = [];

      for (const c of cols) {
        let def = `  "${c.column_name}" ${mapPostgresType(c)}`;
        if (c.column_default) {
          def += ` DEFAULT ${c.column_default}`;
        }
        if (c.is_nullable === 'NO') {
          def += ` NOT NULL`;
        }
        colDefs.push(def);
      }

      if (pks.length > 0) {
        colDefs.push(`  PRIMARY KEY (${pks.join(', ')})`);
      }

      for (const fk of fks) {
        colDefs.push(`  FOREIGN KEY ("${fk.column_name}") REFERENCES "${fk.foreign_table_schema}"."${fk.foreign_table_name}"("${fk.foreign_column_name}") ON DELETE CASCADE`);
      }

      schemaSql += colDefs.join(',\n');
      schemaSql += `\n);\n\n`;
    }

    schemaSql += `-- -------------------------------------------------------------\n`;
    schemaSql += `-- ÍNDICES Y LLAVES ÚNICAS\n`;
    schemaSql += `-- -------------------------------------------------------------\n`;
    for (const idx of idxRes.rows) {
      if (!idx.indexdef.includes('_pkey')) {
        schemaSql += `${idx.indexdef};\n`;
      }
    }
    schemaSql += `\n`;

    // Guardar archivo de esquema DDL
    const schemaPath = path.join(targetDir, 'esquema_tablas.sql');
    fs.writeFileSync(schemaPath, schemaSql, 'utf-8');

    // 3. Extraer Datos de las Tablas
    let totalRowsAll = 0;
    const summaryLines = [
      `=== RESUMEN DE RESPALDO SUPABASE ===`,
      `Fecha y Hora: ${new Date().toLocaleString('es-MX')}`,
      `Ubicación: ${targetDir}`,
      `Total de tablas: ${tables.length}`,
      `---------------------------------------`
    ];

    let fullSqlScript = `-- =============================================================\n`;
    fullSqlScript += `-- RESPALDO COMPLETO (ESQUEMA + DATOS) - SUPABASE\n`;
    fullSqlScript += `-- Generado: ${new Date().toISOString()}\n`;
    fullSqlScript += `-- Para restaurar: Copia y pega en Supabase SQL Editor\n`;
    fullSqlScript += `-- =============================================================\n\n`;

    // Primero incluir el esquema en el script de restauración maestro
    fullSqlScript += schemaSql;
    fullSqlScript += `-- =============================================================\n`;
    fullSqlScript += `-- INSERCIÓN DE DATOS DE TODAS LAS TABLAS\n`;
    fullSqlScript += `-- =============================================================\n\n`;

    for (const tableName of tables) {
      process.stdout.write(`⏳ Respaldando tabla "${tableName}"... `);

      const dataRes = await client.query(`SELECT * FROM "${tableName}"`);
      const rows = dataRes.rows;
      totalRowsAll += rows.length;

      // Guardar JSON individual
      const jsonPath = path.join(targetDir, `${tableName}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), 'utf-8');

      // Generar sentencias SQL INSERT
      fullSqlScript += `-- -------------------------------------------------------------\n`;
      fullSqlScript += `-- Datos: ${tableName} (${rows.length} registros)\n`;
      fullSqlScript += `-- -------------------------------------------------------------\n`;

      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const quotedCols = columns.map(c => `"${c}"`).join(', ');

        for (const row of rows) {
          const values = columns.map(c => formatSQLValue(row[c])).join(', ');
          fullSqlScript += `INSERT INTO "${tableName}" (${quotedCols}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
        }
      }
      fullSqlScript += `\n`;

      const stats = fs.statSync(jsonPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`✅ ${rows.length} registros (${sizeKB} KB)`);
      summaryLines.push(` - ${tableName.padEnd(20)}: ${String(rows.length).padStart(6)} registros (${sizeKB} KB)`);
    }

    // Guardar archivo SQL maestro
    const sqlPath = path.join(targetDir, `restaurar_completo.sql`);
    fs.writeFileSync(sqlPath, fullSqlScript, 'utf-8');
    const sqlStats = fs.statSync(sqlPath);
    const sqlSizeMB = (sqlStats.size / (1024 * 1024)).toFixed(2);

    summaryLines.push(`---------------------------------------`);
    summaryLines.push(`Total de registros: ${totalRowsAll}`);
    summaryLines.push(`Esquema de tablas: esquema_tablas.sql`);
    summaryLines.push(`Archivo SQL de restauración: restaurar_completo.sql (${sqlSizeMB} MB)`);
    summaryLines.push(`Tiempo total: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

    // Guardar resumen
    fs.writeFileSync(path.join(targetDir, 'resumen_respaldo.txt'), summaryLines.join('\n'), 'utf-8');

    // Actualizar indicador de último respaldo en la raíz
    fs.writeFileSync(path.join(BASE_BACKUP_DIR, 'ultimo_respaldo.txt'), `Último respaldo realizado con éxito el:\n${new Date().toLocaleString('es-MX')}\nCarpeta: ${targetDir}\nTotal registros: ${totalRowsAll}`, 'utf-8');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n================================================================');
    console.log(`🎉 ¡RESPALDO COMPLETADO CON ÉXITO EN ${duration} SEGUNDOS!`);
    console.log(`📐 Esquema (Schema Visualizer): esquema_tablas.sql`);
    console.log(`📦 Registros totales respaldados: ${totalRowsAll}`);
    console.log(`💾 Restauración completa (Esquema + Datos): restaurar_completo.sql (${sqlSizeMB} MB)`);
    console.log(`📁 Carpeta: ${targetDir}`);
    console.log('================================================================');

    return { success: true, targetDir };
  } catch (err) {
    console.error('\n❌ ERROR AL REALIZAR EL RESPALDO:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runBackup().catch(() => process.exit(1));
}

module.exports = { runBackup };
