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

    let totalRowsAll = 0;
    const summaryLines = [
      `=== RESUMEN DE RESPALDO SUPABASE ===`,
      `Fecha y Hora: ${new Date().toLocaleString('es-MX')}`,
      `Ubicación: ${targetDir}`,
      `Total de tablas: ${tables.length}`,
      `---------------------------------------`
    ];

    let fullSqlScript = `-- =============================================================\n`;
    fullSqlScript += `-- RESPALDO COMPLETO DE BASE DE DATOS SUPABASE\n`;
    fullSqlScript += `-- Generado: ${new Date().toISOString()}\n`;
    fullSqlScript += `-- Para restaurar: Copia y pega en Supabase SQL Editor\n`;
    fullSqlScript += `-- =============================================================\n\n`;

    for (const tableName of tables) {
      process.stdout.write(`⏳ Respaldando tabla "${tableName}"... `);

      // Obtener datos
      const dataRes = await client.query(`SELECT * FROM "${tableName}"`);
      const rows = dataRes.rows;
      totalRowsAll += rows.length;

      // 1. Guardar como JSON
      const jsonPath = path.join(targetDir, `${tableName}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), 'utf-8');

      // 2. Generar sentencias SQL
      fullSqlScript += `-- -------------------------------------------------------------\n`;
      fullSqlScript += `-- Tabla: ${tableName} (${rows.length} registros)\n`;
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
    summaryLines.push(`Tamaño archivo SQL: ${sqlSizeMB} MB`);
    summaryLines.push(`Tiempo total: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

    // Guardar resumen
    fs.writeFileSync(path.join(targetDir, 'resumen_respaldo.txt'), summaryLines.join('\n'), 'utf-8');

    // Actualizar indicador de último respaldo en la raíz
    fs.writeFileSync(path.join(BASE_BACKUP_DIR, 'ultimo_respaldo.txt'), `Último respaldo realizado con éxito el:\n${new Date().toLocaleString('es-MX')}\nCarpeta: ${targetDir}\nTotal registros: ${totalRowsAll}`, 'utf-8');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n================================================================');
    console.log(`🎉 ¡RESPALDO COMPLETADO CON ÉXITO EN ${duration} SEGUNDOS!`);
    console.log(`📦 Registros totales respaldados: ${totalRowsAll}`);
    console.log(`💾 Archivo SQL de restauración: restaurar_completo.sql (${sqlSizeMB} MB)`);
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
