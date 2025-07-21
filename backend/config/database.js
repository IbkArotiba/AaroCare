require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Store in variables for consistent usage throughout the file
// Try non-prefixed variables first, then fall back to VITE_ prefixed ones
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

console.log('Supabase URL:', SUPABASE_URL);

// Create the Supabase client FIRST
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// THEN log information about it
console.log('Supabase client created:', !!supabase);
console.log('Supabase client methods:', Object.keys(supabase));

/**
 * Database client that wraps Supabase for SQL queries
 */
const db = {
  /**
   * Execute SQL query via Supabase
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise} - Query result with rows property
   */
  query: async (text, params = []) => {
    try {
      console.log('=== DATABASE WRAPPER START ===');
      console.log('Executing SQL:', text);
      console.log('Parameters:', params);
      console.log('Parameter count:', params.length);
      
      // Use the appropriate Supabase method based on the query type
      if (text.trim().toLowerCase().startsWith('select')) {
        console.log('=== HANDLING SELECT QUERY ===');
        
        const tableName = extractTableName(text);
        console.log('Querying table:', tableName);
        
        let query = supabase.from(tableName).select('*');
        
        // Handle WHERE clause if present
        if (text.toLowerCase().includes('where')) {
          const whereClause = extractWhereCondition(text);
          console.log('=== WHERE CLAUSE DEBUG ===');
          console.log('Original WHERE clause:', whereClause);
          console.log('Parameters for WHERE:', params);
          
          // Handle simple WHERE conditions
          if (whereClause.includes('=')) {
            // Split by AND to handle multiple conditions
            const conditions = whereClause.split(/\s+AND\s+/i);
            console.log('WHERE conditions:', conditions);
            
            conditions.forEach((condition, index) => {
              console.log(`Processing condition ${index}:`, condition);
              
              // Clean the condition to remove extra whitespace and newlines
              const cleanCondition = condition.replace(/\s+/g, ' ').trim();
              const conditionParts = cleanCondition.split('=').map(s => s.trim());
              
              if (conditionParts.length === 2) {
                const [column, placeholder] = conditionParts;
                console.log(`Column: "${column}", Placeholder: "${placeholder}"`);
                
                if (placeholder && placeholder.startsWith('$')) {
                  const paramIndex = parseInt(placeholder.substring(1)) - 1;
                  console.log(`Parameter index: ${paramIndex}, Value: ${params[paramIndex]}`);
                  
                  if (paramIndex >= 0 && paramIndex < params.length && params[paramIndex] !== undefined) {
                    // Remove table prefix if present (e.g., "care_teams.patient_id" → "patient_id")
                    const cleanColumn = column.includes('.') ? column.split('.')[1] : column;
                    query = query.eq(cleanColumn, params[paramIndex]);
                    console.log(`Added WHERE condition: ${cleanColumn} = ${params[paramIndex]}`);
                  }
                } else if (placeholder && placeholder.toLowerCase() === 'true') {
                  // Handle boolean true
                  const cleanColumn = column.includes('.') ? column.split('.')[1] : column;
                  query = query.eq(cleanColumn, true);
                  console.log(`Added WHERE condition: ${cleanColumn} = true`);
                } else if (placeholder && placeholder.toLowerCase() === 'false') {
                  // Handle boolean false
                  const cleanColumn = column.includes('.') ? column.split('.')[1] : column;
                  query = query.eq(cleanColumn, false);
                  console.log(`Added WHERE condition: ${cleanColumn} = false`);
                }
              } else {
                console.warn(`Invalid WHERE condition format: "${cleanCondition}"`);
              }
            });
          }
        }
        
        const { data, error } = await query;
        
        console.log('=== SUPABASE QUERY RESULT ===');
        console.log('Supabase data length:', data?.length);
        console.log('Sample records:');
        if (data && data.length > 0) {
          data.slice(0, 3).forEach((record, index) => {
            console.log(`Record ${index}:`, { 
              id: record.id || record.care_team_id, 
              is_active: record.is_active,
              ...Object.keys(record).length > 10 ? { truncated: '...' } : record
            });
          });
        }
        console.log('=== END SUPABASE RESULT ===');
        
        if (error) throw new Error(`Query failed: ${error.message}`);
        return { rows: data || [] };
      } 
      else if (text.trim().toLowerCase().startsWith('insert')) {
        console.log('=== HANDLING INSERT QUERY ===');
        
        const tableName = extractTableName(text);
        console.log('Processing INSERT for table:', tableName);
        
        // Special handling for audit_logs table
        if (tableName === 'audit_logs') {
          console.log('=== AUDIT_LOGS INSERT ===');
          const data = {
            user_id: params[0],
            patient_id: params[1],
            action: params[2],
            entity_type: params[3],
            entity_id: params[4],
            old_values: params[5],
            new_values: params[6],
            ip_address: params[7],
            user_agent: params[8],
            session_id: params[9],
            created_at: params[10]
          };
          
          console.log('Inserting into audit_logs with data:', data);
          
          const { data: insertResult, error } = await supabase
            .from('audit_logs')
            .insert(data)
            .select();
          
          if (error) {
            console.error('Supabase insert error:', error);
            throw Error(`Insert failed: ${error.message}`);
          }
          
          console.log('Insert result:', insertResult);
          return { rows: insertResult || [] };
        }
        // Handle other tables (patients, etc.)
        else {
          console.log('=== PARSING INSERT STATEMENT ===');
          
          // Extract column names from the query
          const columnsMatch = text.match(/\(([^)]+)\)\s*VALUES/i);
          if (!columnsMatch) {
            console.error('Failed to parse INSERT columns from SQL:', text);
            throw new Error('Could not parse INSERT columns');
          }
          
          let columns = columnsMatch[1].split(',').map(col => col.trim());
          
          console.log('Extracted columns:', columns);
          console.log('Parameters count:', params.length);
          console.log('Parameters:', params);
          
          // Remove 'id' column for tables with auto-increment primary keys
          const autoIncrementTables = ['patients', 'users', 'care_teams', 'patient_notes', 'vital_signs', 'treatment_plans', 'user_sessions'];
          
          let filteredParams = [...params];
          
          if (autoIncrementTables.includes(tableName)) {
            const idIndex = columns.findIndex(col => col === 'id');
            if (idIndex !== -1) {
              console.log('Removing id column at index:', idIndex);
              columns.splice(idIndex, 1);
              filteredParams.splice(idIndex, 1);
            }
          }
          
          console.log('Final columns:', columns);
          console.log('Final parameters:', filteredParams);
          
          // Validate column count matches parameter count
          if (columns.length !== filteredParams.length) {
            const errorMsg = `Column count (${columns.length}) does not match parameter count (${filteredParams.length})`;
            console.error('Column/parameter count mismatch:', {
              columns: columns.length,
              parameters: filteredParams.length,
              columnNames: columns,
              parameterValues: filteredParams,
              error: errorMsg
            });
            throw new Error(errorMsg);
          }
          
          // Create a data object from remaining columns and parameters
          const data = {};
          columns.forEach((col, i) => {
            if (i < filteredParams.length) {
              data[col] = filteredParams[i];
            }
          });
          
          console.log('=== CALLING SUPABASE INSERT ===');
          console.log('Table:', tableName);
          console.log('Data object:', JSON.stringify(data, null, 2));
          
          try {
            const { data: insertResult, error } = await supabase
              .from(tableName)
              .insert(data)
              .select();
            
            console.log('=== SUPABASE RESPONSE ===');
            console.log('Error:', error);
            console.log('Insert result:', insertResult);
            console.log('Insert result type:', typeof insertResult);
            console.log('Insert result is array:', Array.isArray(insertResult));
            
            if (error) {
              console.error('Supabase insert error:', error);
              console.error('Error details:', JSON.stringify(error, null, 2));
              throw  Error(`Insert failed: ${error.message || JSON.stringify(error)}`);
            }
            
            console.log('=== PREPARING RETURN VALUE ===');
            
            // Make sure we return a valid result structure
            if (!insertResult) {
              console.warn('Insert result is null/undefined, returning empty array');
              return { rows: [] };
            }
            
            const result = { rows: Array.isArray(insertResult) ? insertResult : [insertResult] };
            console.log('Final result to return:', result);
            console.log('=== DATABASE WRAPPER SUCCESS ===');
            
            return result;
            
          } catch (supabaseError) {
            console.error('=== SUPABASE ERROR ===');
            console.error('Supabase error type:', typeof supabaseError);
            console.error('Supabase error message:', supabaseError.message);
            console.error('Full supabase error:', supabaseError);
            throw supabaseError;
          }
        }
      }
      else if (text.trim().toLowerCase().startsWith('update')) {
        console.log('=== HANDLING UPDATE QUERY ===');
        
        // FOR UPDATE QUERIES
        const tableName = extractTableName(text);
        console.log('Processing UPDATE for table:', tableName);
        
        const setMatch = text.match(/SET\s+([^WHERE]+)/i);
        if (!setMatch) throw new Error('Could not parse UPDATE SET clause');
        
        const setParts = setMatch[1].split(',').map(part => part.trim());
        const updateData = {};
        
        let paramIndex = 0;
        
        setParts.forEach(part => {
          const [column, placeholder] = part.split('=').map(s => s.trim());
          if (placeholder && typeof placeholder === 'string' && placeholder.startsWith('$')) {
            const idx = parseInt(placeholder.substring(1)) - 1;
            if (idx >= 0 && idx < params.length) {
              updateData[column] = params[idx];
              paramIndex = Math.max(paramIndex, idx + 1);
            }
          }
        });
        
        const whereMatch = text.match(/WHERE\s+([^;]+)/i);
        if (!whereMatch) throw new Error('UPDATE statement missing WHERE clause');
        
        const whereClause = whereMatch[1].trim();
        let query = supabase.from(tableName).update(updateData);
        
        if (whereClause.includes('=')) {
          const [column, placeholder] = whereClause.split('=').map(s => s.trim());
          if (placeholder.startsWith('$')) {
            const idx = parseInt(placeholder.substring(1)) - 1;
            if (idx >= 0 && idx < params.length) {
              query = query.eq(column, params[idx]);
            }
          }
        }
        
        const { data: updateResult, error } = await query.select();
        
        if (error) throw new Error(`Update failed: ${error.message}`);
        return { rows: updateResult || [] };
      }
      else if (text.trim().toLowerCase().startsWith('delete')) {
        console.log('=== HANDLING DELETE QUERY ===');
        
        const tableName = extractTableName(text);
        console.log('Processing DELETE for table:', tableName);
        
        const whereMatch = text.match(/WHERE\s+([^;]+)/i);
        if (!whereMatch) throw new Error('DELETE statement missing WHERE clause');
        
        const whereClause = whereMatch[1].trim();
        console.log('WHERE clause:', whereClause);
        
        let query = supabase.from(tableName).delete();
        
        if (whereClause.includes('=')) {
          const conditions = whereClause.split(/\s+AND\s+/i);
          
          conditions.forEach(condition => {
            const conditionParts = condition.split('=').map(s => s.trim());
            if (conditionParts.length === 2) {
              const [column, placeholder] = conditionParts;
              
              if (placeholder && placeholder.startsWith('$')) {
                const idx = parseInt(placeholder.substring(1)) - 1;
                if (idx >= 0 && idx < params.length && params[idx] !== undefined) {
                  const cleanColumn = column.includes('.') ? column.split('.')[1] : column;
                  query = query.eq(cleanColumn, params[idx]);
                  console.log(`Added DELETE WHERE condition: ${cleanColumn} = ${params[idx]}`);
                }
              }
            }
          });
        }
        
        const { data: deleteResult, error } = await query.select();
        
        if (error) {
          console.error('DELETE error:', error);
          throw new Error(`Delete failed: ${error.message}`);
        }
        
        console.log('DELETE success:', deleteResult);
        return { rows: deleteResult || [] };
      }
      else {
        throw new Error('Unsupported query type. Only SELECT, INSERT, UPDATE, and DELETE are implemented');
      }
    } catch (error) {
      console.error('=== DATABASE WRAPPER ERROR ===');
      console.error('Error type:', typeof error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error object:', error);
      console.error('=== END DATABASE WRAPPER ERROR ===');
      
      // Re-throw the error so the controller can catch it
      throw error;
    }
  },

  /**
   * Close database connection (no-op for Supabase, kept for pg compatibility)
   */
  end: async () => {
    // Nothing to close with Supabase
    return true;
  }
};

// Helper functions for SQL parsing (simplified)
function extractTableName(sql) {
  const fromMatch = sql.match(/from\s+([^\s]+)/i);
  const insertMatch = sql.match(/insert\s+into\s+([^\s(]+)/i);
  const updateMatch = sql.match(/update\s+([^\s]+)/i);
  const deleteMatch = sql.match(/delete\s+from\s+([^\s]+)/i);
  
  if (fromMatch) return fromMatch[1].replace(/[^a-zA-Z0-9_]/g, '');
  if (insertMatch) return insertMatch[1].replace(/[^a-zA-Z0-9_]/g, '');
  if (updateMatch) return updateMatch[1].replace(/[^a-zA-Z0-9_]/g, '');
  if (deleteMatch) return deleteMatch[1].replace(/[^a-zA-Z0-9_]/g, '');
  
  throw new Error('Could not extract table name from SQL');
}

// FIXED: This function now properly extracts WHERE clause without ORDER BY
function extractWhereCondition(sql) {
  // Match WHERE clause but stop at common SQL clauses that come after WHERE
  const whereMatch = sql.match(/where\s+(.+?)(?:\s+(?:order\s+by|group\s+by|having|limit|offset)\s+|$)/i);
  if (whereMatch) {
    // Clean up the extracted condition by removing extra whitespace and newlines
    return whereMatch[1].replace(/\s+/g, ' ').trim();
  }
  return '';
}

// Function to generate consistent integer ID from UUID
function generateIntegerFromUUID(uuid) {
  // Skip if not a string or not a UUID format
  if (typeof uuid !== 'string' || !uuid.includes('-')) {
    return uuid;
  }
  
  // Use hash to convert UUID to a consistent number
  const hash = crypto.createHash('md5').update(uuid).digest('hex');
  // Take first 8 chars of hash and convert to integer (first 32 bits)
  const truncatedHash = parseInt(hash.substring(0, 8), 16);
  // Make sure it's positive and avoid very small numbers
  return Math.abs(truncatedHash) % 2147483647; // Max 31-bit positive integer
}

module.exports = db;